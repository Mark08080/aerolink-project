// ===== PKRU Air Quality — การใช้งานบนโทรศัพท์ / iPad =====
// - แถบสรุปค่าเฉลี่ย PM2.5 ด้านล่างจอ (กดเพื่อเปิดแถบข้อมูล)
// - พื้นหลังทึบเมื่อเปิดแถบข้าง แตะเพื่อปิด / ปัดซ้ายเพื่อปิด
// - ปิดแถบข้างเมื่อหมุนจอเป็นจอใหญ่
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const sidebar = $('sidebar');
    if (!sidebar) return;
    const isSmall = () => window.matchMedia('(max-width: 768px)').matches;

    // ---------- แถบสรุป ----------
    const summary = document.createElement('button');
    summary.type = 'button';
    summary.className = 'mobile-summary';
    summary.setAttribute('aria-label', 'เปิดรายละเอียดคุณภาพอากาศ');
    summary.innerHTML = `
        <span class="ms-value" id="msValue">--<small>PM2.5</small></span>
        <span class="ms-text">
            <strong id="msStatus">รอข้อมูลจากเซนเซอร์…</strong>
            <span id="msAdvice">แตะเพื่อดูรายละเอียด</span>
        </span>
        <span class="ms-meta" id="msMeta"></span>
        <svg class="ms-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>`;
    document.body.appendChild(summary);

    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);

    function levelColor(pm) {
        if (typeof getAQILevel === 'function') return getAQILevel(pm).color;
        return '#64748b';
    }

    function refreshSummary() {
        const pmText = $('avgPM25')?.textContent?.trim();
        const pm = parseFloat(pmText);
        const tempText = $('avgTemp')?.textContent?.trim();
        const humText = $('avgHum')?.textContent?.trim();
        const valueEl = $('msValue');
        if (Number.isFinite(pm)) {
            valueEl.firstChild.textContent = pm.toFixed(1);
            summary.style.setProperty('--ms-color', levelColor(pm));
            const level = typeof getAQILevel === 'function' ? getAQILevel(pm).text : '';
            $('msStatus').textContent = level ? `อากาศ${level}` : 'คุณภาพอากาศ';
        }
        const advice = $('healthSub')?.textContent?.trim() || $('healthText')?.textContent?.trim();
        if (advice) $('msAdvice').textContent = advice;
        const meta = [];
        if (tempText && tempText !== '--') meta.push(`${tempText}°`);
        if (humText && humText !== '--') meta.push(`${humText}%`);
        $('msMeta').textContent = meta.join(' · ');
    }

    ['avgPM25', 'avgTemp', 'avgHum', 'healthSub', 'healthText'].forEach(id => {
        const el = $(id);
        if (el) new MutationObserver(refreshSummary).observe(el, { childList: true, characterData: true, subtree: true });
    });
    refreshSummary();

    // ---------- เปิด/ปิดแถบข้าง ----------
    function syncState() {
        const open = isSmall() && sidebar.classList.contains('open');
        document.body.classList.toggle('sidebar-is-open', open);
        $('mobileToggle')?.setAttribute('aria-expanded', String(open));
        const detail = $('detailPanel');
        document.body.classList.toggle('detail-is-open', !!detail && detail.classList.contains('active'));
    }
    new MutationObserver(syncState).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    const detail = $('detailPanel');
    if (detail) new MutationObserver(syncState).observe(detail, { attributes: true, attributeFilter: ['class'] });

    function openSidebar() {
        sidebar.classList.add('open');
        sidebar.scrollTop = 0;
    }
    function closeSidebar() { sidebar.classList.remove('open'); }

    summary.addEventListener('click', openSidebar);
    backdrop.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isSmall() && sidebar.classList.contains('open')) closeSidebar();
    });

    // ปัดไปทางซ้ายเพื่อปิดแถบข้าง
    let startX = null, startY = null;
    sidebar.addEventListener('touchstart', e => {
        if (!isSmall()) return;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    }, { passive: true });
    sidebar.addEventListener('touchend', e => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (dx < -70 && Math.abs(dy) < 50) closeSidebar();
        startX = null;
    }, { passive: true });

    // ปัดลงที่แผ่นรายละเอียดเพื่อปิด
    if (detail) {
        let sy = null;
        detail.addEventListener('touchstart', e => { sy = detail.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
        detail.addEventListener('touchend', e => {
            if (sy === null || !isSmall()) return;
            if (e.changedTouches[0].clientY - sy > 90) $('detailClose')?.click();
            sy = null;
        }, { passive: true });
    }

    // หมุนจอ/ขยายหน้าต่าง: ล้างสถานะของโหมดโทรศัพท์ และให้แผนที่คำนวณขนาดใหม่
    let rt;
    window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => {
            if (!isSmall()) sidebar.classList.remove('open');
            syncState();
            if (window.state?.map) window.state.map.invalidateSize();
            else if (typeof state !== 'undefined' && state.map) state.map.invalidateSize();
        }, 150);
    });

    syncState();
})();
