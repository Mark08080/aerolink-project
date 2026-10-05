// ===== PKRU Air Quality — ข้อมูลย้อนหลัง (History archive) =====
// แหล่งข้อมูล (เรียงตามลำดับความสำคัญ):
//   1) Aerolink API /api/history (InfluxDB ของเพื่อน) — ใช้เมื่อตั้ง URL ไว้ใน config.js
//   2) ข้อมูลจำลอง/ข้อมูลเก่า window.PKRU_HISTORY_MOCK (ถ้ามีไฟล์ history-mock.js)
//      ใช้เฉพาะช่วงเวลาก่อนที่ API จะมีข้อมูล
//   3) ประวัติที่เบราว์เซอร์เก็บไว้ (loadHistory() ใน app.js) — ใช้เมื่อเชื่อมต่อ API ไม่ได้
//      รูปแบบ: [{ nodeId: 'node2', timestamp: '2024-01-01T00:00:00+07:00', pm25: 18.2, temperature: 29.5, humidity: 78 }, ...]
(function () {
    'use strict';

    const METRICS = [
        { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', color: '#818cf8', digits: 1 },
        { key: 'temperature', label: 'อุณหภูมิ', unit: '°C', color: '#f97316', digits: 1 },
        { key: 'humidity', label: 'ความชื้นสัมพัทธ์', unit: '%RH', color: '#22d3ee', digits: 1 },
        { key: 'pm1', label: 'PM1.0', unit: 'µg/m³', color: '#a78bfa', digits: 1 },
        { key: 'pm10', label: 'PM10', unit: 'µg/m³', color: '#f472b6', digits: 1 },
        { key: 'lux', label: 'ความสว่าง', unit: 'lux', color: '#facc15', digits: 0 },
    ];
    const API = window.PKRU_API || { enabled: false };
    const HOUR = 3600000, DAY = 24 * HOUR;
    const MODES = {
        hour: { label: 'รายชั่วโมง', maxSpanDays: 31 },
        day: { label: 'รายวัน', maxSpanDays: 400 },
        month: { label: 'รายเดือน', maxSpanDays: 3700 },
        year: { label: 'รายปี', maxSpanDays: 36600 },
    };
    const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const st = { mode: 'hour', result: null, allRows: null, source: null, apiCache: new Map(), runId: 0 };
    const $ = id => document.getElementById(id);
    const pad = n => String(n).padStart(2, '0');

    // ---------- data ----------
    const toRow = row => {
        const t = row.t ?? Date.parse(row.timestamp);
        if (!Number.isFinite(t)) return null;
        return {
            nodeId: row.nodeId, t,
            pm25: num(row.pm25), temperature: num(row.temperature), humidity: num(row.humidity),
            pm1: num(row.pm1), pm10: num(row.pm10), lux: num(row.lux),
        };
    };
    function mergeRows(lists) {
        const seen = new Set();
        const out = [];
        lists.forEach(list => list.forEach(raw => {
            const row = toRow(raw);
            if (!row) return;
            const id = row.nodeId + '|' + row.t;
            if (seen.has(id)) return;
            seen.add(id);
            out.push(row);
        }));
        out.sort((a, b) => a.t - b.t);
        return out;
    }
    const mockRows = () => (Array.isArray(window.PKRU_HISTORY_MOCK) ? window.PKRU_HISTORY_MOCK : []);

    // ข้อมูลในเครื่อง (ใช้ตอนยังไม่ได้ค้นหา / เชื่อมต่อ API ไม่ได้)
    function getAllRows() {
        if (st.allRows) return st.allRows;
        st.allRows = mergeRows([mockRows(), typeof loadHistory === 'function' ? loadHistory() : []]);
        return st.allRows;
    }

    // ดึงข้อมูลจาก API ให้ครอบคลุมช่วงที่เลือก (API ย้อนหลังนับจากตอนนี้ได้สูงสุด ~35000 ชม.)
    async function loadRowsFor(q) {
        if (!API.enabled) {
            st.allRows = null;
            return { rows: getAllRows(), source: 'local' };
        }
        const hours = Math.min(35000, Math.ceil((Date.now() - q.start) / HOUR) + 1);
        const deviceId = q.nodeId === 'all' ? undefined : API.deviceIdFor(q.nodeId);
        const fields = q.metrics.slice().sort();
        const key = `${hours}|${deviceId || 'all'}|${fields.join(',')}`;
        let hit = st.apiCache.get(key);
        if (!hit || Date.now() - hit.at > 5 * 60 * 1000) {
            try {
                const res = await API.history(hours, { deviceId, fields });
                hit = { at: Date.now(), rows: res.rows, resolution: res.resolution };
                st.apiCache.set(key, hit);
            } catch (err) {
                console.warn('[API] archive:', err.kind, err.status || '', err.message || err, err.url || '');
                st.allRows = null;
                return { rows: getAllRows(), source: 'fallback', error: err };
            }
        }
        // ข้อมูลจำลองใช้เฉพาะช่วงก่อนที่ API จะมีข้อมูล (ไม่ปนกับข้อมูลจริง)
        const firstApi = hit.rows.length ? hit.rows[0].t : Infinity;
        const older = mockRows().filter(r => Date.parse(r.timestamp) < firstApi);
        return { rows: mergeRows([hit.rows, older]), source: 'api', resolution: hit.resolution, hasMock: older.length > 0 };
    }
    function num(v) { const n = Number(v); return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n; }

    function bucketStart(t, mode) {
        const d = new Date(t);
        if (mode === 'hour') d.setMinutes(0, 0, 0);
        else if (mode === 'day') d.setHours(0, 0, 0, 0);
        else if (mode === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); }
        else { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); }
        return d.getTime();
    }
    function nextBucket(t, mode) {
        const d = new Date(t);
        if (mode === 'hour') d.setHours(d.getHours() + 1);
        else if (mode === 'day') d.setDate(d.getDate() + 1);
        else if (mode === 'month') d.setMonth(d.getMonth() + 1);
        else d.setFullYear(d.getFullYear() + 1);
        return d.getTime();
    }

    function aggregate({ mode, start, end, nodeId, metrics }) {
        const rows = getAllRows();
        // หา index แรกด้วย binary search (ข้อมูล 3 ปีมีหลายหมื่นแถว)
        let lo = 0, hi = rows.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (rows[mid].t < start) lo = mid + 1; else hi = mid; }
        const buckets = new Map();
        for (let i = lo; i < rows.length && rows[i].t < end; i++) {
            const r = rows[i];
            if (nodeId !== 'all' && r.nodeId !== nodeId) continue;
            const k = bucketStart(r.t, mode);
            let b = buckets.get(k);
            if (!b) { b = { n: 0 }; metrics.forEach(m => { b[m] = { sum: 0, n: 0, min: Infinity, max: -Infinity }; }); buckets.set(k, b); }
            b.n++;
            metrics.forEach(m => {
                const v = r[m];
                if (v === null) return;
                const s = b[m]; s.sum += v; s.n++; if (v < s.min) s.min = v; if (v > s.max) s.max = v;
            });
        }
        // สร้างทุกช่วงเวลา (ช่วงที่ไม่มีข้อมูล = null เพื่อให้กราฟขาดช่วง)
        const out = [];
        for (let k = bucketStart(start, mode); k < end; k = nextBucket(k, mode)) {
            const b = buckets.get(k);
            const row = { t: k, count: b ? b.n : 0 };
            metrics.forEach(m => {
                const s = b && b[m];
                row[m] = s && s.n ? { avg: s.sum / s.n, min: s.min, max: s.max } : null;
            });
            out.push(row);
            if (out.length > 20000) break;
        }
        return out;
    }

    // ---------- formatting ----------
    const beYear = y => y + 543;
    function fmtBucket(t, mode, short = false) {
        const d = new Date(t);
        if (mode === 'hour') {
            const h = `${pad(d.getHours())}:00`;
            return short ? h : `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${beYear(d.getFullYear())} ${h}–${pad((d.getHours() + 1) % 24)}:00`;
        }
        if (mode === 'day') return `${d.getDate()} ${MONTHS_TH[d.getMonth()]}${short ? '' : ' ' + beYear(d.getFullYear())}`;
        if (mode === 'month') return `${MONTHS_TH[d.getMonth()]} ${short ? String(beYear(d.getFullYear())).slice(2) : beYear(d.getFullYear())}`;
        return String(beYear(d.getFullYear()));
    }
    const toDateInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const toMonthInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

    // ---------- UI: form ----------
    function fillHourSelect(sel, isEnd) {
        sel.innerHTML = Array.from({ length: 24 }, (_, h) =>
            `<option value="${h}">${pad(h)}:00 - ${pad((h + 1) % 24)}:00</option>`).join('');
        sel.value = isEnd ? '23' : '0';
    }
    function fillYearSelect(sel, years, selected) {
        sel.innerHTML = years.map(y => `<option value="${y}">${beYear(y)}</option>`).join('');
        sel.value = String(selected);
    }

    function dataYears() {
        const rows = getAllRows();
        const now = new Date().getFullYear();
        const first = rows.length ? new Date(rows[0].t).getFullYear() : now;
        const years = [];
        for (let y = Math.min(first, now - 2); y <= now; y++) years.push(y);
        return years;
    }

    function setMode(mode) {
        st.mode = mode;
        document.querySelectorAll('[data-archive-mode]').forEach(b => {
            const on = b.dataset.archiveMode === mode;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on);
        });
        const now = new Date();
        const sDate = $('archiveStartDate'), eDate = $('archiveEndDate');
        const showHour = mode === 'hour';
        $('archiveStartHour').hidden = !showHour;
        $('archiveEndHour').hidden = !showHour;

        const years = dataYears();
        const dateLike = mode === 'hour' || mode === 'day';
        sDate.hidden = eDate.hidden = !dateLike;
        $('archiveStartMonth').hidden = $('archiveEndMonth').hidden = mode !== 'month';
        $('archiveStartYear').hidden = $('archiveEndYear').hidden = mode !== 'year';

        if (mode === 'hour') {
            sDate.value = toDateInput(new Date(now.getTime() - DAY));
            eDate.value = toDateInput(now);
        } else if (mode === 'day') {
            sDate.value = toDateInput(new Date(now.getTime() - 29 * DAY));
            eDate.value = toDateInput(now);
        } else if (mode === 'month') {
            const s = new Date(now); s.setMonth(s.getMonth() - 11);
            $('archiveStartMonth').value = toMonthInput(s);
            $('archiveEndMonth').value = toMonthInput(now);
        } else {
            fillYearSelect($('archiveStartYear'), years, years[0]);
            fillYearSelect($('archiveEndYear'), years, now.getFullYear());
        }
        const max = toDateInput(now);
        sDate.max = eDate.max = max;
        $('archiveStartMonth').max = $('archiveEndMonth').max = toMonthInput(now);
        setError('');
    }

    function readRange() {
        const mode = st.mode;
        let start, end;
        if (mode === 'hour' || mode === 'day') {
            const s = $('archiveStartDate').value, e = $('archiveEndDate').value;
            if (!s || !e) return { error: 'กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด' };
            const sd = new Date(s + 'T00:00:00'), ed = new Date(e + 'T00:00:00');
            if (mode === 'hour') {
                sd.setHours(+$('archiveStartHour').value);
                ed.setHours(+$('archiveEndHour').value + 1);
            } else {
                ed.setDate(ed.getDate() + 1);
            }
            start = sd.getTime(); end = ed.getTime();
        } else if (mode === 'month') {
            const s = $('archiveStartMonth').value, e = $('archiveEndMonth').value;
            if (!s || !e) return { error: 'กรุณาเลือกเดือนเริ่มต้นและเดือนสิ้นสุด' };
            start = new Date(s + '-01T00:00:00').getTime();
            const ed = new Date(e + '-01T00:00:00'); ed.setMonth(ed.getMonth() + 1);
            end = ed.getTime();
        } else {
            start = new Date(+$('archiveStartYear').value, 0, 1).getTime();
            end = new Date(+$('archiveEndYear').value + 1, 0, 1).getTime();
        }
        if (!(end > start)) return { error: 'ช่วงเวลาสิ้นสุดต้องอยู่หลังช่วงเวลาเริ่มต้น' };
        const spanDays = (end - start) / DAY;
        if (spanDays > MODES[mode].maxSpanDays + 1) {
            return { error: mode === 'hour' ? 'ข้อมูลรายชั่วโมงเลือกได้ไม่เกิน 31 วัน — ลองใช้ "รายวัน" แทน' : 'ข้อมูลรายวันเลือกได้ไม่เกินประมาณ 1 ปี — ลองใช้ "รายเดือน" แทน' };
        }
        const metrics = [...document.querySelectorAll('[name="archiveMetric"]:checked')].map(c => c.value);
        if (!metrics.length) return { error: 'กรุณาเลือกค่าที่ต้องการอย่างน้อย 1 รายการ' };
        return { mode, start, end, metrics, nodeId: $('archiveStation').value };
    }

    function setError(msg) {
        const el = $('archiveError');
        el.textContent = msg;
        el.hidden = !msg;
    }

    // ---------- UI: results ----------
    async function run() {
        const q = readRange();
        if (q.error) { setError(q.error); return; }
        setError('');
        const runId = ++st.runId;
        const res = $('archiveResult');
        const submit = $('archiveForm').querySelector('[type="submit"]');
        res.hidden = false;
        $('archiveSource').hidden = true;
        $('archiveSummary').innerHTML = '';
        $('archiveTable').innerHTML = '';
        $('archiveCharts').innerHTML = '<div class="archive-loading">กำลังโหลดข้อมูล…</div>';
        if (submit) submit.disabled = true;
        let loaded;
        try {
            loaded = await loadRowsFor(q);
        } finally {
            if (submit) submit.disabled = false;
        }
        if (runId !== st.runId) return; // มีการค้นหาใหม่ระหว่างรอ
        st.allRows = loaded.rows;
        st.source = loaded;
        showSource(loaded);
        const rows = aggregate(q);
        const withData = rows.filter(r => r.count > 0);
        st.result = { ...q, rows };

        const stationName = q.nodeId === 'all' ? 'ทุกจุดตรวจวัด (ค่าเฉลี่ย)' : (SENSOR_NODES.find(n => n.id === q.nodeId)?.name || q.nodeId);
        $('archiveResultTitle').textContent = `${stationName} · ${MODES[q.mode].label}`;
        $('archiveResultRange').textContent =
            `${fmtBucket(rows[0].t, q.mode)} ถึง ${fmtBucket(rows[rows.length - 1].t, q.mode)} · มีข้อมูล ${withData.length.toLocaleString('th-TH')} จาก ${rows.length.toLocaleString('th-TH')} ช่วง`;

        if (!withData.length) {
            $('archiveSummary').innerHTML = '';
            $('archiveCharts').innerHTML = '<div class="archive-empty">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>';
            $('archiveTable').innerHTML = '';
            $('archiveDownload').disabled = true;
            return;
        }
        $('archiveDownload').disabled = false;
        renderSummary(q, withData);
        renderCharts();
        renderTable(q, rows);
    }

    function showSource(loaded) {
        const el = $('archiveSource');
        if (!el) return;
        let text = '';
        if (loaded.source === 'api') {
            text = 'แหล่งข้อมูล: Aerolink API';
            if (loaded.hasMock) text += ' · ช่วงก่อนหน้าใช้ข้อมูลจำลอง';
        } else if (loaded.source === 'fallback') {
            text = 'ดึงข้อมูลย้อนหลังจาก API ไม่ได้ — แสดงข้อมูลที่มีในเครื่องแทน';
        }
        el.textContent = text;
        // บอกสาเหตุ + ลิงก์ให้เปิดดูคำตอบจริงจากเซิร์ฟเวอร์ (เปิดตรงในแท็บใหม่ ไม่ติด CORS)
        const err = loaded.error;
        if (loaded.source === 'fallback' && err) {
            const reason = document.createElement('span');
            reason.className = 'archive-source-reason';
            reason.textContent = err.message || String(err);
            el.appendChild(document.createElement('br'));
            el.appendChild(reason);
            if (err.url) {
                el.appendChild(document.createTextNode(' '));
                const a = document.createElement('a');
                a.href = err.url;
                a.target = '_blank';
                a.rel = 'noopener';
                a.textContent = 'เปิดดูคำตอบจากเซิร์ฟเวอร์';
                el.appendChild(a);
            }
        }
        el.classList.toggle('warn', loaded.source === 'fallback');
        el.hidden = !text;
    }

    function renderSummary(q, rows) {
        $('archiveSummary').innerHTML = q.metrics.map(key => {
            const m = METRICS.find(x => x.key === key);
            const vals = rows.map(r => r[key]).filter(Boolean);
            if (!vals.length) return '';
            const avg = vals.reduce((s, v) => s + v.avg, 0) / vals.length;
            const min = Math.min(...vals.map(v => v.min));
            const max = Math.max(...vals.map(v => v.max));
            const color = key === 'pm25' && typeof getAQILevel === 'function' ? getAQILevel(avg).color : m.color;
            return `<div class="archive-stat">
                <span class="archive-stat-label"><i style="background:${m.color}"></i>${m.label}</span>
                <b style="color:${color}">${avg.toFixed(m.digits)}<small>${m.unit}</small></b>
                <span class="archive-stat-sub">ต่ำสุด ${min.toFixed(m.digits)} · สูงสุด ${max.toFixed(m.digits)}</span>
            </div>`;
        }).join('');
    }

    function renderCharts() {
        const r = st.result;
        if (!r) return;
        const box = $('archiveCharts');
        box.innerHTML = r.metrics.map(key => `<div class="archive-chart" data-metric="${key}"><div class="archive-chart-head"></div><svg></svg><div class="archive-tip" hidden></div></div>`).join('');
        box.querySelectorAll('.archive-chart').forEach(el => drawChart(el, r, METRICS.find(m => m.key === el.dataset.metric)));
    }

    function drawChart(el, r, m) {
        const svg = el.querySelector('svg');
        const W = Math.max(320, el.clientWidth), H = 190;
        const L = 42, R = 12, T = 12, B = 26;
        const w = W - L - R, h = H - T - B;
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        el.querySelector('.archive-chart-head').innerHTML = `<span><i style="background:${m.color}"></i>${m.label}</span><small>${m.unit} · ค่าเฉลี่ย${r.rows.length > 1 ? ' (แถบจาง = ต่ำสุด–สูงสุด)' : ''}</small>`;

        const pts = r.rows.map((row, i) => ({ i, row, v: row[m.key] }));
        const vals = pts.filter(p => p.v);
        let lo = Math.min(...vals.map(p => p.v.min)), hi = Math.max(...vals.map(p => p.v.max));
        if (m.key === 'pm25') { lo = 0; hi = Math.max(hi, 50); }
        else if (m.key === 'pm1' || m.key === 'pm10' || m.key === 'lux') { lo = 0; hi = Math.max(hi, 10); }
        else if (m.key === 'humidity') { lo = Math.max(0, Math.floor((lo - 5) / 10) * 10); hi = Math.min(100, Math.ceil((hi + 5) / 10) * 10); }
        else { lo = Math.floor(lo - 1); hi = Math.ceil(hi + 1); }
        if (hi <= lo) hi = lo + 1;

        const n = r.rows.length;
        const x = i => L + (n === 1 ? w / 2 : i / (n - 1) * w);
        const y = v => T + (1 - (v - lo) / (hi - lo)) * h;
        let out = '';

        // grid + y labels
        const ticks = 4;
        for (let k = 0; k <= ticks; k++) {
            const v = lo + (hi - lo) * k / ticks;
            out += `<line class="ag" x1="${L}" x2="${L + w}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`;
            out += `<text class="at" x="${L - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${Number.isInteger(v) ? v : v.toFixed(1)}</text>`;
        }
        // เกณฑ์ PM2.5
        if (m.key === 'pm25') {
            [[25, '#10b981'], [37.5, '#eab308'], [75, '#f97316']].forEach(([v, c]) => {
                if (v > hi) return;
                out += `<line x1="${L}" x2="${L + w}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${c}" stroke-opacity=".55" stroke-dasharray="4 4"/>`;
                out += `<text class="at" x="${L + w}" y="${(y(v) - 3).toFixed(1)}" text-anchor="end" fill="${c}">${v}</text>`;
            });
        }
        // x labels (~6)
        const step = Math.max(1, Math.ceil(n / 6));
        for (let i = 0; i < n; i += step) {
            out += `<text class="at" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : 'middle'}">${fmtBucket(r.rows[i].t, r.mode, true)}</text>`;
        }

        // min–max band + average line (split at gaps)
        const segs = [];
        let cur = [];
        pts.forEach(p => { if (p.v) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } });
        if (cur.length) segs.push(cur);
        segs.forEach(seg => {
            if (seg.length > 1) {
                const top = seg.map(p => `${x(p.i).toFixed(1)},${y(p.v.max).toFixed(1)}`);
                const bot = seg.slice().reverse().map(p => `${x(p.i).toFixed(1)},${y(p.v.min).toFixed(1)}`);
                out += `<polygon points="${top.concat(bot).join(' ')}" fill="${m.color}" fill-opacity=".12"/>`;
                out += `<polyline points="${seg.map(p => `${x(p.i).toFixed(1)},${y(p.v.avg).toFixed(1)}`).join(' ')}" fill="none" stroke="${m.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
            } else {
                out += `<circle cx="${x(seg[0].i).toFixed(1)}" cy="${y(seg[0].v.avg).toFixed(1)}" r="3" fill="${m.color}"/>`;
            }
        });
        out += `<line class="ah" x1="0" x2="0" y1="${T}" y2="${T + h}" visibility="hidden"/><circle class="ad" r="4" fill="${m.color}" visibility="hidden"/>`;
        out += `<rect x="${L}" y="${T}" width="${w}" height="${h}" fill="transparent" class="ahit"/>`;
        svg.innerHTML = out;

        // hover tooltip
        const hit = svg.querySelector('.ahit'), hl = svg.querySelector('.ah'), dot = svg.querySelector('.ad'), tip = el.querySelector('.archive-tip');
        const hide = () => { hl.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.hidden = true; };
        hit.addEventListener('mouseleave', hide);
        hit.addEventListener('mousemove', ev => {
            const rect = svg.getBoundingClientRect();
            const px = (ev.clientX - rect.left) * (W / rect.width);
            const i = Math.max(0, Math.min(n - 1, Math.round(n === 1 ? 0 : (px - L) / w * (n - 1))));
            const p = pts[i];
            hl.setAttribute('x1', x(i)); hl.setAttribute('x2', x(i)); hl.setAttribute('visibility', 'visible');
            if (p.v) { dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(p.v.avg)); dot.setAttribute('visibility', 'visible'); }
            else dot.setAttribute('visibility', 'hidden');
            tip.innerHTML = `<strong>${fmtBucket(p.row.t, r.mode)}</strong>` + (p.v
                ? `<span>เฉลี่ย <b>${p.v.avg.toFixed(m.digits)}</b> ${m.unit}</span><span>ต่ำสุด ${p.v.min.toFixed(m.digits)} · สูงสุด ${p.v.max.toFixed(m.digits)}</span>`
                : '<span>ไม่มีข้อมูล</span>');
            tip.hidden = false;
            const left = x(i) / W * rect.width;
            tip.style.left = `${Math.min(rect.width - tip.offsetWidth - 4, Math.max(4, left + 10))}px`;
        });
    }

    function renderTable(q, rows) {
        const LIMIT = 2000;
        const shown = rows.slice(-LIMIT).reverse();
        const head = `<tr><th>ช่วงเวลา</th>${q.metrics.map(k => { const m = METRICS.find(x => x.key === k); return `<th>${m.label} <small>(${m.unit})</small></th>`; }).join('')}<th>จำนวนค่า</th></tr>`;
        const body = shown.map(r => `<tr${r.count ? '' : ' class="nodata"'}><td>${fmtBucket(r.t, q.mode)}</td>${q.metrics.map(k => {
            const v = r[k];
            if (!v) return '<td>–</td>';
            const m = METRICS.find(x => x.key === k);
            const style = k === 'pm25' && typeof getAQILevel === 'function' ? ` style="color:${getAQILevel(v.avg).color}"` : '';
            return `<td${style}>${v.avg.toFixed(m.digits)}</td>`;
        }).join('')}<td>${r.count || '–'}</td></tr>`).join('');
        $('archiveTable').innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>` +
            (rows.length > LIMIT ? `<p class="archive-note">แสดง ${LIMIT.toLocaleString('th-TH')} แถวล่าสุด — ดาวน์โหลด CSV เพื่อดูทั้งหมด</p>` : '');
    }

    // CSV ตรงกับตาราง/กราฟที่แสดง: ช่วงเวลาเดียวกัน ค่าที่เลือก จุดตรวจวัดเดียวกัน
    const CSV_COL = {
        pm25: 'pm2_5_ugm3', pm1: 'pm1_0_ugm3', pm10: 'pm10_ugm3',
        temperature: 'temperature_c', humidity: 'humidity_pct', lux: 'lux',
    };
    function downloadCSV() {
        const r = st.result;
        if (!r) return;
        const station = r.nodeId === 'all'
            ? 'ทุกจุดตรวจวัด (ค่าเฉลี่ย)'
            : (SENSOR_NODES.find(n => n.id === r.nodeId)?.name || r.nodeId);
        const deviceId = r.nodeId === 'all' ? 'all' : ((API.deviceIdFor && API.deviceIdFor(r.nodeId)) || r.nodeId);
        const source = st.source?.source === 'api' ? 'Aerolink API' : 'browser/mock';
        const esc = v => { const t = String(v ?? ''); return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
        const stamp = t => { const d = new Date(t); return `${toDateInput(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
        const cols = r.metrics.flatMap(k => [`${CSV_COL[k] || k}_avg`, `${CSV_COL[k] || k}_min`, `${CSV_COL[k] || k}_max`]);
        const lines = [['period_start', 'period_end', 'period_label', 'device_id', 'location', ...cols, 'samples', 'source'].join(',')];
        r.rows.forEach(row => {
            const vals = r.metrics.flatMap(k => {
                const m = METRICS.find(x => x.key === k);
                const v = row[k];
                return v ? [v.avg, v.min, v.max].map(x => x.toFixed(m.digits)) : ['', '', ''];
            });
            lines.push([stamp(row.t), stamp(nextBucket(row.t, r.mode)), fmtBucket(row.t, r.mode), deviceId, station, ...vals, row.count, source].map(esc).join(','));
        });
        const blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `PKRU_AQI_${deviceId}_${r.mode}_${toDateInput(new Date(r.start)).replace(/-/g, '')}-${toDateInput(new Date(r.end - 1)).replace(/-/g, '')}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }

    // ---------- open / close ----------
    function open() {
        const ov = $('archiveOverlay');
        ov.hidden = false;
        requestAnimationFrame(() => ov.classList.add('active'));
        document.body.classList.add('archive-open');
        if (!st.result) run();
        else if (st.result.rows) renderCharts();
        setTimeout(() => $('archiveClose').focus(), 50);
    }
    function close() {
        const ov = $('archiveOverlay');
        ov.classList.remove('active');
        document.body.classList.remove('archive-open');
        setTimeout(() => { ov.hidden = true; }, 200);
        $('archiveOpen')?.focus();
    }

    function init() {
        if (!$('archiveOverlay')) return;
        const station = $('archiveStation');
        station.innerHTML = `<option value="all">ทุกจุดตรวจวัด (ค่าเฉลี่ย)</option>` +
            (typeof SENSOR_NODES !== 'undefined' ? SENSOR_NODES : []).map(n => `<option value="${n.id}">${n.name}</option>`).join('');
        fillHourSelect($('archiveStartHour'), false);
        fillHourSelect($('archiveEndHour'), true);
        setMode('hour');

        $('archiveOpen')?.addEventListener('click', open);
        $('archiveClose').addEventListener('click', close);
        $('archiveOverlay').addEventListener('click', e => { if (e.target.id === 'archiveOverlay') close(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('archiveOverlay').hidden) close(); });
        document.querySelectorAll('[data-archive-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.archiveMode)));
        $('archiveForm').addEventListener('submit', e => { e.preventDefault(); run(); });
        $('archiveDownload').addEventListener('click', downloadCSV);
        let t;
        window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (!$('archiveOverlay').hidden) renderCharts(); }, 150); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
