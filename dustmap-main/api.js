// ===== PKRU Air Quality — ตัวเชื่อมต่อ Supabase (แทน Aerolink API เดิม) =====
// ใช้ร่วมกันทั้ง index.html และ dashboard.html (โหลดหลัง config.js)
//
//   PKRU_API.enabled                 มี supabaseUrl + anonKey ให้ใช้หรือไม่
//   PKRU_API.latest()                → [{ nodeId, time, pm25, pm1, pm10, temperature, humidity, lux }]
//                                      (ไม่มีข้อมูลเลย → คืน [] และ PKRU_API.lastLatestEmpty = true)
//   PKRU_API.history(hours, opts)    → { resolution, rows: [{ nodeId, t, pm25, ... }] }
//                                      hours > 48 ⇒ ดึงจากวิว readings_hourly (ค่าเฉลี่ยรายชั่วโมง)
//   PKRU_API.buildings()             → [{ nodeId, lat, lon }]
//
// ข้อผิดพลาดทุกแบบโยนเป็น PKRU_API.Error ที่มี .kind:
//   'network'  เชื่อมต่อไม่ได้ (โปรเจกต์ Supabase หยุด/พัก, อินเทอร์เน็ตหลุด, CORS บล็อก)
//   'timeout'  เซิร์ฟเวอร์ตอบช้าเกินไป
//   'http'     เซิร์ฟเวอร์ตอบ error (มี .status)
//   'parse'    ข้อมูลที่ได้ไม่ใช่ JSON ที่คาดไว้
(function () {
    'use strict';

    const CFG = Object.assign({
        supabaseUrl: '',
        supabaseAnonKey: '',
        pollMs: 30000,
        timeoutMs: 15000,
        staleMinutes: 10,
        devices: { 'esp32-sci': 'node2', 'esp32-hss': 'node3', 'esp32-fms': 'node4' },
    }, window.PKRU_API_CONFIG || {});

    const clean = u => String(u || '').trim().replace(/\/+$/, '');
    const BASE = clean(CFG.supabaseUrl);
    const ANON_KEY = String(CFG.supabaseAnonKey || '').trim();

    class ApiError extends Error {
        constructor(kind, message, status) {
            super(message);
            this.name = 'PKRUApiError';
            this.kind = kind;
            this.status = status;
        }
    }

    // ---------- เรียก Supabase REST (PostgREST): GET /rest/v1/<table_or_view>?... ----------
    async function request(path, params, timeoutMs = CFG.timeoutMs) {
        if (!BASE || !ANON_KEY) throw new ApiError('config', 'ยังไม่ได้ตั้ง supabaseUrl / supabaseAnonKey ใน config.js');
        const qs = new URLSearchParams();
        Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
        const url = `${BASE}${path}${qs.toString() ? '?' + qs : ''}`;

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        let res;
        try {
            res = await fetch(url, {
                cache: 'no-store',
                signal: ctrl.signal,
                headers: {
                    Accept: 'application/json',
                    apikey: ANON_KEY,
                    Authorization: `Bearer ${ANON_KEY}`,
                    // ขอแถวได้มากกว่าค่าเริ่มต้นของ PostgREST (ถ้าโปรเจกต์ตั้ง Max Rows ไว้สูงกว่านี้)
                    Range: '0-9999',
                },
            });
        } catch (err) {
            const e = err.name === 'AbortError'
                ? new ApiError('timeout', 'Supabase ตอบช้าเกินไป')
                : new ApiError('network', 'เชื่อมต่อ Supabase ไม่ได้ (โปรเจกต์หยุดทำงาน, อินเทอร์เน็ตหลุด, หรือ URL/anon key ผิด)');
            e.url = url;
            throw e;
        } finally {
            clearTimeout(timer);
        }

        let body = null;
        try { body = await res.json(); } catch { /* ไม่ใช่ JSON */ }
        if (!res.ok) {
            const detail = typeof body?.message === 'string' ? body.message : '';
            const err = new ApiError('http', detail || `Supabase ตอบกลับ ${res.status}`, res.status);
            err.url = url;
            throw err;
        }
        if (body === null) { const e = new ApiError('parse', 'ข้อมูลจาก Supabase ไม่ใช่ JSON'); e.url = url; throw e; }
        return body;
    }

    // ---------- แปลงข้อมูลให้ตรงกับรูปแบบของเว็บ ----------
    const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) ? null : Number(v);

    function parseTime(t) {
        if (!t) return null;
        let s = String(t);
        if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s = s.replace(' ', 'T') + 'Z';
        const d = new Date(s);
        return isNaN(d) ? null : d;
    }

    function nodeIdFor(deviceId) { return CFG.devices[deviceId] || null; }
    function deviceIdFor(nodeId) { return Object.keys(CFG.devices).find(k => CFG.devices[k] === nodeId) || null; }

    // แถวที่คาดไว้: { device_id, time, pm1_0, pm2_5, pm10, temperature, humidity, lux }
    // (ใช้ select alias ของ PostgREST ให้ชื่อคอลัมน์ออกมาตรงแบบนี้เสมอ ไม่ว่าจะดึงจากตารางไหน)
    function normalize(row) {
        return {
            deviceId: row.device_id,
            nodeId: nodeIdFor(row.device_id),
            location: '',
            locationTh: '',
            time: parseTime(row.time),
            pm1: num(row.pm1_0),
            pm25: num(row.pm2_5),
            pm10: num(row.pm10),
            temperature: num(row.temperature),
            humidity: num(row.humidity),
            lux: num(row.lux),
        };
    }

    const api = {
        Error: ApiError,
        config: CFG,
        baseUrl: BASE,
        enabled: !!(BASE && ANON_KEY),
        pollMs: Math.max(10000, CFG.pollMs || 30000),
        staleMs: (CFG.staleMinutes || 10) * 60000,
        nodeIdFor,
        deviceIdFor,
        lastLatestEmpty: false,

        async health() {
            await request('/rest/v1/readings', { select: 'id', limit: 1 });
            return { status: 'ok' };
        },

        // พิกัดของแต่ละจุด — เอามาจากแถวล่าสุดที่บอร์ดส่งเข้ามา (มี lat/lon ติดมาทุกแถว)
        async buildings() {
            const list = await request('/rest/v1/latest_readings', { select: 'device_id,lat,lon' });
            return (Array.isArray(list) ? list : []).map(b => ({
                deviceId: b.device_id,
                nodeId: nodeIdFor(b.device_id),
                location: '',
                locationTh: '',
                lat: num(b.lat),
                lon: num(b.lon),
            }));
        },

        // ค่าล่าสุดของทุกจุด — ไม่มีข้อมูลเลยคืน [] ไม่ถือเป็น error
        async latest(opts = {}) {
            const params = { select: 'device_id,time:ts,pm1_0,pm2_5,pm10,temperature,humidity,lux' };
            if (opts.deviceId) params.device_id = `eq.${opts.deviceId}`;
            const list = await request('/rest/v1/latest_readings', params);
            const rows = (Array.isArray(list) ? list : []).map(normalize).filter(r => r.nodeId);
            api.lastLatestEmpty = rows.length === 0;
            return rows;
        },

        // ข้อมูลย้อนหลัง — hours <= 48 ดึงจาก readings (รายนาที), hours > 48 ดึงจาก readings_hourly (ค่าเฉลี่ยรายชั่วโมง)
        async history(hours = 24, opts = {}) {
            const h = Math.max(1, Math.min(35000, Math.ceil(hours)));
            const since = new Date(Date.now() - h * 3600000).toISOString();
            const timeout = Math.max(CFG.timeoutMs, h > 48 ? 60000 : 30000);
            const useHourly = h > 48;

            const params = useHourly
                ? {
                    select: 'device_id,time:hour,pm1_0:pm1_0_mean,pm2_5:pm2_5_mean,pm10:pm10_mean,temperature:temperature_mean,humidity:humidity_mean,lux:lux_mean',
                    hour: `gte.${since}`,
                    order: 'hour.asc',
                }
                : {
                    select: 'device_id,time:ts,pm1_0,pm2_5,pm10,temperature,humidity,lux',
                    ts: `gte.${since}`,
                    order: 'ts.asc',
                };
            if (opts.deviceId) params.device_id = `eq.${opts.deviceId}`;

            const table = useHourly ? '/rest/v1/readings_hourly' : '/rest/v1/readings';
            const body = await request(table, params, timeout);
            const rows = (Array.isArray(body) ? body : [])
                .map(normalize)
                .filter(r => r.nodeId && r.time)
                .map(r => ({ ...r, t: r.time.getTime() }))
                .sort((a, b) => a.t - b.t);
            return { resolution: useHourly ? 'hour' : null, rows };
        },
    };

    window.PKRU_API = api;
})();
