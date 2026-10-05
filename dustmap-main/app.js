/**
 * PKRU Air Quality Map — Interactive Campus Map
 * มหาวิทยาลัยราชภัฏภูเก็ต
 * Real-time PM2.5, Temperature, Humidity via MQTT
 */

// ===== Sensor Node Definitions =====
// จุดติดตั้งเซ็นเซอร์ภายใน มรภ.ภูเก็ต
const SENSOR_NODES = [
    {
        id: 'node2',
        name: 'คณะวิทยาศาสตร์และเทคโนโลยี',
        description: 'Faculty of Science & Technology',
        lat: 7.914588491091475,
        lng: 98.38881665269558,
        data: { pm25: null, pm1: null, pm10: null, temperature: null, humidity: null, lux: null, lastUpdate: null }
    },
    {
        id: 'node3',
        name: 'คณะมนุษยศาสตร์และสังคมศาสตร์',
        description: 'Faculty of Humanities & Social Sciences',
        lat: 7.9090528204855755,
        lng: 98.38655930865212,
        data: { pm25: null, pm1: null, pm10: null, temperature: null, humidity: null, lux: null, lastUpdate: null }
    },
    {
        id: 'node4',
        name: 'คณะวิทยาการจัดการ',
        description: 'Faculty of Management Sciences',
        lat: 7.913082581293544,
        lng: 98.38724860930434,
        data: { pm25: null, pm1: null, pm10: null, temperature: null, humidity: null, lux: null, lastUpdate: null }
    }
];

// ไอคอนช่วยแยกประเภทคณะเมื่อมองบนแผนที่
const FACULTY_ICONS = {
    node2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-label="คณะวิทยาศาสตร์"><ellipse cx="12" cy="12" rx="9" ry="3.8"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/></svg>',
    node3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-label="คณะมนุษยศาสตร์"><path d="M4 5.5c2.8-1.3 5.3-.8 8 1.1v12c-2.7-1.9-5.2-2.4-8-1.1z"/><path d="M20 5.5c-2.8-1.3-5.3-.8-8 1.1v12c2.7-1.9 5.2-2.4 8-1.1z"/><path d="M8 10h2M14 10h2"/></svg>',
    node4: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-label="คณะวิทยาการจัดการ"><path d="M4 19V10M10 19V5M16 19v-7M22 19V8"/><path d="m4 7 5-3 5 3 6-5"/><path d="M17 2h3v3"/></svg>',
};

function getFacultyIcon(nodeId) {
    return FACULTY_ICONS[nodeId] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>';
}

// ===== Simulation =====
// เปิดโหมดจำลองไว้ระหว่างรอข้อมูลจริง (จาก Grafana / MQTT)
// โหมดจำลองจะหยุดเองทันทีที่มีข้อมูลจริงเข้ามา — ถ้าไม่ต้องการข้อมูลจำลองเลย ให้ตั้งเป็น false
const USE_SIMULATION = true;
let simulationInterval = null;

function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

// สุ่มค่าเริ่มต้นให้แต่ละ node สมจริง
function generateSimulatedData() {
    SENSOR_NODES.forEach(node => {
        // สุ่ม PM2.5: ภูเก็ตปกติอยู่ 8-45 μg/m³
        const basePM25 = node.data.pm25 !== null ? node.data.pm25 : randomInRange(10, 40);
        node.data.pm25 = Math.max(1, basePM25 + randomInRange(-3, 3));

        // สุ่ม อุณหภูมิ: ภูเก็ต 27-36°C
        const baseTemp = node.data.temperature !== null ? node.data.temperature : randomInRange(28, 35);
        node.data.temperature = Math.max(20, Math.min(42, baseTemp + randomInRange(-0.5, 0.5)));

        // สุ่ม ความชื้น: ภูเก็ต 60-90%
        const baseHum = node.data.humidity !== null ? node.data.humidity : randomInRange(60, 88);
        node.data.humidity = Math.max(30, Math.min(99, baseHum + randomInRange(-2, 2)));

        node.data.lastUpdate = new Date();
        onNodeDataUpdate(node.id);
    });
}

function startSimulation() {
    if (!USE_SIMULATION || simulationInterval) return;
    // อัปเดตทุก 5 วินาที
    simulationInterval = setInterval(generateSimulatedData, 5000);
    generateSimulatedData();
}

function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
}

// ได้ข้อมูลจริงครั้งแรก → หยุดโหมดจำลอง และล้างค่าจำลองของทุกจุด ให้เหลือเฉพาะค่าจริง
function switchToRealData() {
    if (state.realMode) return;
    state.realMode = true;
    stopSimulation();
    state.lastDataAt = null;
    SENSOR_NODES.forEach(n => {
        Object.keys(n.data).forEach(k => { n.data[k] = null; });
        if (state.markers[n.id]) updateMarker(n.id);
    });
}

// ===== MQTT Configuration =====
// ✏️ แก้ค่าเชื่อมต่อได้ที่ไฟล์ config.js (ใช้ร่วมกันทั้งหน้าหลักและหน้า dashboard)
// ค่าด้านล่างใช้เมื่อไม่มีไฟล์ config.js
const MQTT_CONFIG = window.PKRU_MQTT_CONFIG || {
    host: 'test.mosquitto.org',
    port: 8081,
    protocol: 'wss',
    path: '/mqtt',
    username: '',
    password: '',
    topicPrefix: 'sensor',
};

// ===== Discord Webhook Configuration =====
// ✏️ ใส่ Discord Webhook URL เพื่อรับแจ้งเตือนเมื่อ PM2.5 เกิน threshold
const DISCORD_CONFIG = {
    webhookUrl: '',  // ← ใส่ URL webhook ของ Discord ที่นี่
    threshold: 50,   // แจ้งเตือนเมื่อ PM2.5 เกินค่านี้ (μg/m³)
    cooldownMinutes: 15,  // ระยะเวลาขั้นต่ำระหว่างการแจ้งเตือนของแต่ละจุด (นาที)
};

// ===== State =====
const state = {
    client: null,
    connected: false,
    map: null,
    tileLayer: null,
    markers: {},
    selectedNodeId: null,
    theme: 'dark',
    historyRange: 1,
    overviewHistoryRange: 1,
    discordLastAlert: {},  // { nodeId: timestamp } cooldown tracker
};

// ===== DOM =====
const dom = {
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    mobileToggle: document.getElementById('mobileToggle'),
    themeToggle: document.getElementById('themeToggle'),
    // Overview
    avgPM25: document.getElementById('avgPM25'),
    avgTemp: document.getElementById('avgTemp'),
    avgHum: document.getElementById('avgHum'),
    // Health advisory
    healthAdvisory: document.getElementById('healthAdvisory'),
    healthIcon: document.getElementById('healthIcon'),
    healthText: document.getElementById('healthText'),
    healthSub: document.getElementById('healthSub'),
    // Global timestamp
    globalTimestamp: document.getElementById('globalTimestamp'),
    globalTimestampText: document.getElementById('globalTimestampText'),
    globalTimestampDot: document.getElementById('globalTimestampDot'),
    // Campus-wide historical chart
    overviewChart: document.getElementById('overviewChart'),
    overviewChartEmpty: document.getElementById('overviewChartEmpty'),
    // Detail health advisory
    detailHealthIcon: document.getElementById('detailHealthIcon'),
    detailHealthText: document.getElementById('detailHealthText'),
    // Node list
    nodeList: document.getElementById('nodeList'),
    // Detail panel
    detailPanel: document.getElementById('detailPanel'),
    detailClose: document.getElementById('detailClose'),
    detailNodeName: document.getElementById('detailNodeName'),
    detailNodeLocation: document.getElementById('detailNodeLocation'),
    detailMarkerIcon: document.getElementById('detailMarkerIcon'),
    detailPM25: document.getElementById('detailPM25'),
    detailTemp: document.getElementById('detailTemp'),
    detailHum: document.getElementById('detailHum'),
    detailPM25Bar: document.getElementById('detailPM25Bar'),
    detailTempBar: document.getElementById('detailTempBar'),
    detailHumBar: document.getElementById('detailHumBar'),
    detailPM25Status: document.getElementById('detailPM25Status'),
    detailTempStatus: document.getElementById('detailTempStatus'),
    detailHumStatus: document.getElementById('detailHumStatus'),
    detailUpdate: document.getElementById('detailUpdate'),
    // History chart
    historyChart: document.getElementById('historyChart'),
    historyEmpty: document.getElementById('historyEmpty'),
    historySummary: document.getElementById('historySummary'),
    historyRangeLabel: document.getElementById('historyRangeLabel'),
    historyDownload: document.getElementById('historyDownload'),
    // Toast
    toastContainer: document.getElementById('toastContainer'),
};

// ===== AQI Helpers =====
function getAQILevel(pm25) {
    if (pm25 === null || pm25 === undefined) return { class: 'nodata', text: 'ไม่มีข้อมูล', color: '#64748b' };
    if (pm25 <= 15.0) return { class: 'very-good', text: 'ดีมาก', color: '#22d3ee' };
    if (pm25 <= 25.0) return { class: 'good', text: 'ดี', color: '#10b981' };
    if (pm25 <= 37.5) return { class: 'moderate', text: 'ปานกลาง', color: '#eab308' };
    if (pm25 <= 75.0) return { class: 'unhealthy-sg', text: 'เริ่มมีผลกระทบ', color: '#f97316' };
    return { class: 'unhealthy', text: 'มีผลต่อสุขภาพ', color: '#f43f5e' };
}

// ===== Health Advice (เกณฑ์ กรมควบคุมมลพิษ 2566) =====
function getHealthAdvice(pm25) {
    if (pm25 === null || pm25 === undefined) return { text: 'รอข้อมูล', sub: '', class: 'nodata' };
    if (pm25 <= 15.0) return { text: 'อากาศดีมาก', sub: 'ทำกิจกรรมกลางแจ้งได้ตามปกติ', class: 'very-good' };
    if (pm25 <= 25.0) return { text: 'อากาศดี', sub: 'ทำกิจกรรมกลางแจ้งได้ตามปกติ', class: 'good' };
    if (pm25 <= 37.5) return { text: 'ปานกลาง', sub: 'ผู้ที่มีโรคประจำตัวควรลดกิจกรรมกลางแจ้ง', class: 'moderate' };
    if (pm25 <= 75.0) return { text: 'เริ่มมีผลกระทบ', sub: 'ควรสวมหน้ากาก ลดกิจกรรมกลางแจ้ง', class: 'unhealthy-sg' };
    return { text: 'มีผลต่อสุขภาพ', sub: 'งดกิจกรรมกลางแจ้ง สวมหน้ากาก N95', class: 'unhealthy' };
}

function getHealthFaceIcon(level) {
    const head = '<path d="M7.7 14.2c.2-5.7 3.2-9.7 8.3-9.7 5.2 0 8.2 4 8.3 9.7v4.2c0 5.7-3.4 9.6-8.3 9.6s-8.3-3.9-8.3-9.6z"/><path d="M8 13.2c.3-2.5 1.1-5 3.4-6.5 2.5 1.3 5.5 1.8 8.6 1.3M22.7 7.9c1.1 1.4 1.5 3 1.4 5"/><path d="M5.8 15.3c-1.1.4-1.2 4.4 1.6 4.4M26.2 15.3c1.1.4 1.2 4.4-1.6 4.4"/>';
    const faces = {
        'very-good': `${head}<path d="M11.8 16.1h.1M20.1 16.1h.1M12.4 21.2c2 2.2 5.2 2.2 7.2 0"/>`,
        good: `${head}<path d="M12.2 16.1h.1M19.7 16.1h.1M13 22c1.7 1.1 4.3 1.1 6 0"/>`,
        moderate: `${head}<path d="M12.2 16.1h.1M19.7 16.1h.1M13 22h6"/>`,
        'unhealthy-sg': `${head}<path d="M12.2 15.7h.1M19.7 15.7h.1"/><path d="M8.2 18.1 11 17l5 1.1 5-1.1 2.8 1.1M10.7 18.3v5.5c3.3 2.1 7.3 2.1 10.6 0v-5.5"/><path d="M13 20.5h6M13 22.3h6"/>`,
        unhealthy: `${head}<path d="M11.6 15.8h.1M20.2 15.8h.1"/><path d="M7.5 18.2 10.8 17l5.2 1.1 5.2-1.1 3.3 1.2M10.4 18.4v5.8c3.5 2.3 7.7 2.3 11.2 0v-5.8"/><path d="M12.3 20.6h7.4M12.3 22.5h7.4M16 19.4v5.6"/>`,
        nodata: '<circle cx="16" cy="16" r="10"/><path d="M13.4 12.8a2.8 2.8 0 0 1 5.2 1.4c0 2-2.6 2.1-2.6 4M16 22h.1"/>',
    };
    const face = faces[level] || faces.nodata;
    return `<span class="health-face health-face-${level}" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${face}</svg></span>`;
}

function setHealthIcon(element, advice) {
    if (element) element.innerHTML = getHealthFaceIcon(advice.class);
}

function getTempStatus(temp) {
    if (temp === null) return '--';
    if (temp < 20) return 'เย็น';
    if (temp < 28) return 'สบาย';
    if (temp < 35) return 'อบอุ่น';
    return 'ร้อน';
}

function getHumStatus(hum) {
    if (hum === null) return '--';
    if (hum < 30) return 'แห้ง';
    if (hum < 60) return 'สบาย';
    if (hum < 80) return 'ชื้น';
    return 'ชื้นมาก';
}

// ===== Toast =====
// ปิดกล่องแจ้งเตือนบนหน้าเว็บแล้ว — ข้อความจะแสดงใน Console (F12) แทน
const SHOW_TOASTS = false;
function showToast(message, type = 'info', duration = 3500) {
    if (!SHOW_TOASTS) {
        (type === 'error' ? console.warn : console.info)(`[PKRU] ${message}`);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    dom.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===== Theme =====
function initTheme() {
    const savedTheme = localStorage.getItem('pkru_aqm_theme');
    if (savedTheme) {
        state.theme = savedTheme;
    } else {
        // Auto detect system theme
        state.theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', state.theme);
    if (dom.themeToggle) {
        dom.themeToggle.setAttribute('aria-label', state.theme === 'light' ? 'เปลี่ยนเป็นแผนที่มืด' : 'เปลี่ยนเป็นแผนที่สว่าง');
    }
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('pkru_aqm_theme', state.theme);
    if (dom.themeToggle) {
        dom.themeToggle.setAttribute('aria-label', state.theme === 'light' ? 'เปลี่ยนเป็นแผนที่มืด' : 'เปลี่ยนเป็นแผนที่สว่าง');
    }
    
    // OpenStreetMap tiles do not require an API key; keep the same source in both UI themes.
    if (state.tileLayer) {
        state.tileLayer.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    }
}

// ===== Initialize Map =====
function initMap() {
    // Center on PKRU campus
    state.map = L.map('map', {
        center: [7.9126, 98.3872],
        zoom: 17,
        zoomControl: false,
        attributionControl: true,
    });

    // Add custom sidebar-toggle control
    const SidebarToggleControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-control-sidebar-toggle leaflet-bar leaflet-control');
            const link = L.DomUtil.create('a', '', container);
            link.href = '#';
            link.title = 'เปิดเมนู';
            link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><polyline points="9 18 15 12 9 6"/></svg>';
            link.setAttribute('role', 'button');
            link.setAttribute('aria-label', 'เปิดแถบข้อมูล');

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.on(link, 'click', function (e) {
                L.DomEvent.preventDefault(e);
                dom.sidebar.classList.remove('collapsed');
                container.classList.remove('visible');
                if (dom.sidebarToggle) dom.sidebarToggle.setAttribute('aria-expanded', 'true');
                setTimeout(() => state.map.invalidateSize(), 350);
            });

            state.sidebarToggleControl = container;
            return container;
        }
    });
    new SidebarToggleControl().addTo(state.map);

    // OpenStreetMap public tiles — no API key needed
    const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        
    state.tileLayer = L.tileLayer(tileUrl, {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20
    }).addTo(state.map);

    // Add markers for each sensor node
    SENSOR_NODES.forEach(node => {
        createMarker(node);
    });

    // Map click to deselect
    state.map.on('click', () => {
        deselectNode();
    });
}

// ===== Create Custom Marker =====
function createMarker(node) {
    const aqi = getAQILevel(node.data.pm25);
    const markerClass = `marker-${aqi.class}`;

    const icon = L.divIcon({
        className: `custom-marker ${markerClass}`,
        html: `
            <div class="marker-outer">
                <div class="marker-inner">${getFacultyIcon(node.id)}</div>
                <span class="marker-label">${node.name}</span>
            </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -28],
    });

    const marker = L.marker([node.lat, node.lng], { icon }).addTo(state.map);

    // Popup
    marker.bindPopup(() => createPopupContent(node), {
        closeButton: true,
        className: '',
        maxWidth: 260,
    });

    marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectNode(node.id);
    });

    state.markers[node.id] = marker;
}

function createPopupContent(node) {
    const aqi = getAQILevel(node.data.pm25);
    const pm25 = node.data.pm25 !== null ? node.data.pm25.toFixed(1) : '--';
    const temp = node.data.temperature !== null ? node.data.temperature.toFixed(1) : '--';
    const hum = node.data.humidity !== null ? node.data.humidity.toFixed(1) : '--';

    return `
        <div class="popup-content">
            <div class="popup-title">${node.name}</div>
            <div class="popup-row">
                <span class="popup-row-label">PM2.5</span>
                <span class="popup-row-value" style="color:${aqi.color}">${pm25} <small>μg/m³</small></span>
            </div>
            <div class="popup-row">
                <span class="popup-row-label">อุณหภูมิ</span>
                <span class="popup-row-value" style="color:#f97316">${temp} <small>°C</small></span>
            </div>
            <div class="popup-row">
                <span class="popup-row-label">ความชื้น</span>
                <span class="popup-row-value" style="color:#22d3ee">${hum} <small>%</small></span>
            </div>
            <button class="popup-btn" onclick="selectNode('${node.id}')">ดูรายละเอียด</button>
        </div>
    `;
}

// ===== Update Marker =====
function updateMarker(nodeId) {
    const node = SENSOR_NODES.find(n => n.id === nodeId);
    if (!node) return;

    const marker = state.markers[nodeId];
    if (!marker) return;

    const aqi = getAQILevel(node.data.pm25);
    const markerClass = `marker-${aqi.class}`;
    const isActive = state.selectedNodeId === nodeId;

    const icon = L.divIcon({
        className: `custom-marker ${markerClass} ${isActive ? 'marker-active' : ''}`,
        html: `
            <div class="marker-outer">
                <div class="marker-inner">${getFacultyIcon(node.id)}</div>
                <span class="marker-label">${node.name}</span>
            </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -28],
    });

    marker.setIcon(icon);

    // Update popup content
    marker.setPopupContent(createPopupContent(node));
}

// ===== Node Selection =====
function selectNode(nodeId) {
    const node = SENSOR_NODES.find(n => n.id === nodeId);
    if (!node) return;

    // Deselect previous
    if (state.selectedNodeId) {
        updateMarker(state.selectedNodeId);
    }

    state.selectedNodeId = nodeId;
    updateMarker(nodeId);
    updateDetailPanel(node);
    renderHistoryChart();
    updateNodeList();

    // Pan to marker
    state.map.panTo([node.lat, node.lng], { animate: true, duration: 0.5 });

    // Close popup if open
    const marker = state.markers[nodeId];
    if (marker) marker.closePopup();

    // Show detail panel
    dom.detailPanel.classList.add('active');

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        dom.sidebar.classList.remove('open');
    }
}

function deselectNode() {
    if (state.selectedNodeId) {
        const prevId = state.selectedNodeId;
        state.selectedNodeId = null;
        updateMarker(prevId);
        updateNodeList();
    }
    dom.detailPanel.classList.remove('active');
}

// ===== Detail Panel =====
function updateDetailPanel(node) {
    const aqi = getAQILevel(node.data.pm25);
    const advice = getHealthAdvice(node.data.pm25);

    dom.detailNodeName.textContent = node.name;
    dom.detailNodeLocation.textContent = node.description;
    dom.detailMarkerIcon.style.background = `linear-gradient(135deg, ${aqi.color}, ${aqi.color}dd)`;
    dom.detailMarkerIcon.innerHTML = getFacultyIcon(node.id);

    // PM2.5 — dynamic color
    const pm25 = node.data.pm25;
    dom.detailPM25.textContent = pm25 !== null ? pm25.toFixed(1) : '--';
    dom.detailPM25.style.color = aqi.color;
    dom.detailPM25Bar.style.width = pm25 !== null ? Math.min(pm25 / 150 * 100, 100) + '%' : '0%';
    dom.detailPM25Status.textContent = aqi.text;
    dom.detailPM25Status.style.color = aqi.color;

    // Temperature
    const temp = node.data.temperature;
    dom.detailTemp.textContent = temp !== null ? temp.toFixed(1) : '--';
    dom.detailTempBar.style.width = temp !== null ? Math.min(temp / 50 * 100, 100) + '%' : '0%';
    dom.detailTempStatus.textContent = getTempStatus(temp);

    // Humidity
    const hum = node.data.humidity;
    dom.detailHum.textContent = hum !== null ? hum.toFixed(1) : '--';
    dom.detailHumBar.style.width = hum !== null ? Math.min(hum, 100) + '%' : '0%';
    dom.detailHumStatus.textContent = getHumStatus(hum);

    // PM1.0 / PM10 / ความสว่าง (มีเฉพาะข้อมูลจาก Aerolink API)
    const extra = document.getElementById('detailExtra');
    if (extra) {
        const items = [
            ['pm1', 'PM1.0', 'μg/m³', 1],
            ['pm10', 'PM10', 'μg/m³', 1],
            ['lux', 'ความสว่าง', 'lux', 0],
        ];
        const hasAny = items.some(([k]) => node.data[k] !== null && node.data[k] !== undefined);
        extra.hidden = !hasAny;
        if (hasAny) {
            extra.innerHTML = items.map(([k, label, unit, digits]) => {
                const v = node.data[k];
                const text = v !== null && v !== undefined ? v.toFixed(digits) : '--';
                return `<div class="de-item"><span class="de-label">${label}</span><span class="de-value">${text}<small>${unit}</small></span></div>`;
            }).join('');
        }
    }

    // Detail health advisory
    setHealthIcon(dom.detailHealthIcon, advice);
    if (dom.detailHealthText) dom.detailHealthText.textContent = `${advice.text} — ${advice.sub}`;

    // Last update
    if (node.data.lastUpdate) {
        const time = node.data.lastUpdate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        dom.detailUpdate.textContent = `อัปเดตล่าสุด: ${time}`;
    } else {
        dom.detailUpdate.textContent = 'รอข้อมูล...';
    }
}

// ===== Node List (Sidebar) =====
function buildNodeList() {
    if (!dom.nodeList) return;
    dom.nodeList.innerHTML = '';
    SENSOR_NODES.forEach(node => {
        const aqi = getAQILevel(node.data.pm25);
        const el = document.createElement('div');
        el.className = `node-item ${state.selectedNodeId === node.id ? 'active' : ''}`;
        el.dataset.nodeId = node.id;

        const pm25 = node.data.pm25 !== null ? node.data.pm25.toFixed(1) : '--';
        const temp = node.data.temperature !== null ? node.data.temperature.toFixed(1) : '--';
        const hum = node.data.humidity !== null ? node.data.humidity.toFixed(1) : '--';

        el.innerHTML = `
            <div class="node-marker" style="background:${aqi.color}">
                ${getFacultyIcon(node.id)}
            </div>
            <div class="node-info">
                <div class="node-name">${node.name}</div>
                <div class="node-readings">
                    <span class="node-reading"><strong>${pm25}</strong> μg/m³</span>
                    <span class="node-reading"><strong>${temp}</strong> °C</span>
                    <span class="node-reading"><strong>${hum}</strong> %</span>
                </div>
            </div>
        `;

        el.addEventListener('click', () => selectNode(node.id));
        dom.nodeList.appendChild(el);
    });
}

function updateNodeList() {
    if (!dom.nodeList) return;
    const items = dom.nodeList.querySelectorAll('.node-item');
    items.forEach(item => {
        const nodeId = item.dataset.nodeId;
        const node = SENSOR_NODES.find(n => n.id === nodeId);
        if (!node) return;

        const aqi = getAQILevel(node.data.pm25);
        item.className = `node-item ${state.selectedNodeId === nodeId ? 'active' : ''}`;

        const marker = item.querySelector('.node-marker');
        marker.style.background = aqi.color;
        marker.style.color = '#fff';

        const pm25 = node.data.pm25 !== null ? node.data.pm25.toFixed(1) : '--';
        const temp = node.data.temperature !== null ? node.data.temperature.toFixed(1) : '--';
        const hum = node.data.humidity !== null ? node.data.humidity.toFixed(1) : '--';

        const readings = item.querySelector('.node-readings');
        readings.innerHTML = `
            <span class="node-reading"><strong>${pm25}</strong> μg/m³</span>
            <span class="node-reading"><strong>${temp}</strong> °C</span>
            <span class="node-reading"><strong>${hum}</strong> %</span>
        `;
    });
}

// ===== Update Overview =====
function updateOverview() {
    const pm25Nodes = SENSOR_NODES.filter(n => n.data.pm25 !== null);
    const tempNodes = SENSOR_NODES.filter(n => n.data.temperature !== null);
    const humNodes = SENSOR_NODES.filter(n => n.data.humidity !== null);

    if (pm25Nodes.length > 0) {
        const avg = pm25Nodes.reduce((s, n) => s + n.data.pm25, 0) / pm25Nodes.length;
        const aqi = getAQILevel(avg);
        const advice = getHealthAdvice(avg);

        dom.avgPM25.textContent = avg.toFixed(1);
        dom.avgPM25.style.color = aqi.color;
        dom.avgPM25.classList.add('value-update');
        setTimeout(() => dom.avgPM25.classList.remove('value-update'), 500);

        // Update sidebar health advisory
        setHealthIcon(dom.healthIcon, advice);
        if (dom.healthText) dom.healthText.textContent = advice.text;
        if (dom.healthSub) dom.healthSub.textContent = advice.sub;
        if (dom.healthAdvisory) {
            dom.healthAdvisory.className = `health-advisory ha-${advice.class}`;
        }
    } else if (state.realMode) {
        const advice = getHealthAdvice(null);
        dom.avgPM25.textContent = '--';
        dom.avgPM25.style.color = '';
        setHealthIcon(dom.healthIcon, advice);
        if (dom.healthText) dom.healthText.textContent = 'ไม่มีข้อมูล';
        if (dom.healthSub) dom.healthSub.textContent = 'เซนเซอร์ยังไม่ได้ส่งข้อมูลล่าสุด';
        if (dom.healthAdvisory) dom.healthAdvisory.className = 'health-advisory ha-nodata';
    }

    if (tempNodes.length > 0) {
        const avg = tempNodes.reduce((s, n) => s + n.data.temperature, 0) / tempNodes.length;
        dom.avgTemp.textContent = avg.toFixed(1);
        dom.avgTemp.classList.add('value-update');
        setTimeout(() => dom.avgTemp.classList.remove('value-update'), 500);
    } else if (state.realMode) {
        dom.avgTemp.textContent = '--';
    }

    if (humNodes.length > 0) {
        const avg = humNodes.reduce((s, n) => s + n.data.humidity, 0) / humNodes.length;
        dom.avgHum.textContent = avg.toFixed(1);
        dom.avgHum.classList.add('value-update');
        setTimeout(() => dom.avgHum.classList.remove('value-update'), 500);
    } else if (state.realMode) {
        dom.avgHum.textContent = '--';
    }

    renderCompareDiffs();
}

// ===== Compare with other sources (live APIs, no API key) =====
const COMPARE_LOCATION = { lat: 7.9126, lng: 98.3872 }; // PKRU campus
const COMPARE_REFRESH_MS = 10 * 60 * 1000;
const COMPARE_THRESHOLDS = [15, 25, 37.5]; // เกณฑ์ PM2.5 กรมควบคุมมลพิษ
const COMPARE_SERIES = [
    { key: 'pkru', label: 'PKRU', color: '#818cf8' },
    { key: 'air4thai', label: 'Air4Thai', color: '#10b981' },
    { key: 'gistda', label: 'GISTDA', color: '#f59e0b' },
    { key: 'openmeteo', label: 'Open-Meteo', color: '#22d3ee' },
];
const compareState = { view: 'now', data: {} };

function distanceKm(lat1, lon1, lat2, lon2) {
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
}

async function fetchJSON(url, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

// "2026-09-17 20:00:00" / "2026-09-17T20:00" → Date (เวลาไทย)
function parseBangkokTime(text) {
    const clean = String(text).replace(' ', 'T').replace(/\.\d+Z?$|Z$/, '');
    return new Date((clean.length === 16 ? clean + ':00' : clean) + '+07:00');
}

function bangkokDate(offsetDays = 0) {
    return new Date(Date.now() + offsetDays * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

function formatHour(date) {
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
}

const COMPARE_SOURCES = {
    // กรมควบคุมมลพิษ — สถานีภาคพื้นดินที่ใกล้มหาวิทยาลัยที่สุด (ค่ารายชั่วโมง)
    async air4thai() {
        const list = await fetchJSON('https://air4thai.com/forweb/getAQI_JSON.php');
        const nearest = (list.stations || [])
            .map(s => ({ s, km: distanceKm(COMPARE_LOCATION.lat, COMPARE_LOCATION.lng, +s.lat, +s.long) }))
            .filter(x => Number.isFinite(x.km) && parseFloat(x.s.AQILast?.PM25?.value) >= 0)
            .sort((a, b) => a.km - b.km)[0];
        if (!nearest) throw new Error('no station');
        const { s, km } = nearest;
        const stationName = (window.PKRU_LANG === 'en' && s.nameEN) || s.nameTH;
        const place = `${stationName} · ${km.toFixed(1)} กม.`;

        try {
            const hist = await fetchJSON(`https://air4thai.com/forweb/getHistoryData.php?stationID=${encodeURIComponent(s.stationID)}&param=PM25&type=hr&sdate=${bangkokDate(-1)}&edate=${bangkokDate(0)}&stime=00&etime=23`);
            // Air4Thai ส่ง 0 หรือ -1 เมื่อชั่วโมงนั้นยังไม่มีค่า (เช่น ชั่วโมงปัจจุบันที่ยังไม่ครบ) — ตัดทิ้ง
            const series = (hist.stations?.[0]?.data || [])
                .map(r => ({ t: parseBangkokTime(r.DATETIMEDATA), v: Number(r.PM25) }))
                .filter(p => Number.isFinite(p.v) && p.v > 0 && !isNaN(p.t));
            if (!series.length) throw new Error('empty history');
            const last = series[series.length - 1];
            return { value: last.v, meta: `${place} · ${formatHour(last.t)}`, series };
        } catch (err) {
            // ถ้าดึงรายชั่วโมงไม่ได้ ใช้ค่าล่าสุดจากรายการสถานี (ค่าเฉลี่ย 24 ชม.)
            console.warn('Air4Thai history failed, using AQILast:', err);
            const fallback = parseFloat(s.AQILast.PM25.value);
            if (!Number.isFinite(fallback) || fallback <= 0) throw new Error('no data');
            return { value: fallback, meta: `${place} · ${s.AQILast.time || ''} น. (เฉลี่ย 24 ชม.)`, series: [] };
        }
    },
    // GISTDA — ค่าประมาณจากดาวเทียมรายตำบล
    async gistda() {
        const res = await fetchJSON(`https://pm25.gistda.or.th/rest/getPM25byLocation?lat=${COMPARE_LOCATION.lat}&lng=${COMPARE_LOCATION.lng}`);
        const d = res.data;
        if (!d || !Number.isFinite(d.pm25)) throw new Error('no data');
        // เวลาใน graphHistory24hrs เป็นเวลาไทย (ถึงจะลงท้ายด้วย Z)
        const series = (d.graphHistory24hrs || [])
            .map(([v, t]) => ({ t: parseBangkokTime(t), v: Number(v) }))
            .filter(p => Number.isFinite(p.v) && !isNaN(p.t));
        const place = (window.PKRU_LANG === 'en' && d.loc?.tb_en) ? d.loc.tb_en : (d.loc?.tb_tn ? `ต.${d.loc.tb_tn}` : 'ตำแหน่งมหาวิทยาลัย');
        const time = (d.datetimeThai?.timeThai || '').replace('เวลา ', '');
        return { value: d.pm25, meta: `${place} · ${time}`, series };
    },
    // Open-Meteo — แบบจำลอง CAMS (Copernicus)
    async openmeteo() {
        const res = await fetchJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${COMPARE_LOCATION.lat}&longitude=${COMPARE_LOCATION.lng}&current=pm2_5&hourly=pm2_5&past_days=1&forecast_days=1&timezone=Asia%2FBangkok`);
        const v = res.current?.pm2_5;
        if (!Number.isFinite(v)) throw new Error('no data');
        const now = Date.now();
        const series = (res.hourly?.time || [])
            .map((t, i) => ({ t: parseBangkokTime(t), v: res.hourly.pm2_5[i] }))
            .filter(p => Number.isFinite(p.v) && p.t.getTime() <= now);
        return { value: v, meta: `แบบจำลอง · ${formatHour(parseBangkokTime(res.current.time))}`, series };
    },
};

function getSelfPM25() {
    const nodes = SENSOR_NODES.filter(n => n.data.pm25 !== null);
    if (!nodes.length) return null;
    return nodes.reduce((s, n) => s + n.data.pm25, 0) / nodes.length;
}

// ค่าเฉลี่ยรายชั่วโมงของเซนเซอร์ PKRU จากประวัติที่เก็บในเบราว์เซอร์
function getSelfSeries(hours = 24) {
    const cutoff = Date.now() - hours * 3600000;
    const buckets = new Map();
    const apiRows = apiHistory.get(null, Math.ceil(hours / 24), () => { if (compareState.view === 'trend') renderCompareTrend(); });
    (apiRows || loadHistory()).forEach(row => {
        const t = new Date(row.timestamp).getTime();
        const v = Number(row.pm25);
        if (!(t >= cutoff) || !Number.isFinite(v)) return;
        const hour = Math.floor(t / 3600000) * 3600000;
        const b = buckets.get(hour) || { sum: 0, n: 0 };
        b.sum += v; b.n += 1;
        buckets.set(hour, b);
    });
    return [...buckets.entries()].sort((a, b) => a[0] - b[0])
        .map(([hour, b]) => ({ t: new Date(hour + 1800000), v: b.sum / b.n }));
}

function renderCompareBars() {
    const values = { pkru: getSelfPM25() };
    Object.keys(COMPARE_SOURCES).forEach(k => { values[k] = compareState.data[k]?.value ?? null; });
    const finite = Object.values(values).filter(Number.isFinite);
    const max = Math.max(50, Math.ceil(Math.max(0, ...finite) / 10) * 10);
    const pct = v => `${Math.min(100, Math.max(0, v / max * 100)).toFixed(1)}%`;

    document.querySelectorAll('.compare-bar-row').forEach(row => {
        const v = values[row.dataset.source];
        const bar = row.querySelector('[data-role="bar"]');
        const valueEl = row.querySelector('[data-role="value"]');
        const track = row.querySelector('.compare-bar-track');
        track.querySelectorAll('.compare-tick').forEach(t => t.remove());
        COMPARE_THRESHOLDS.forEach(th => {
            const tick = document.createElement('span');
            tick.className = 'compare-tick';
            tick.style.left = pct(th);
            track.appendChild(tick);
        });
        if (Number.isFinite(v)) {
            bar.style.width = pct(v);
            bar.style.backgroundColor = getAQILevel(v).color;
            valueEl.textContent = v.toFixed(1);
        } else {
            bar.style.width = '0';
            valueEl.textContent = '--';
        }
    });

    const axis = document.getElementById('compareAxis');
    if (axis) {
        axis.innerHTML = [0, ...COMPARE_THRESHOLDS, max]
            .map(v => `<span style="left:${pct(v)}">${v}</span>`).join('');
    }
}

function renderCompareTrend() {
    const svg = document.getElementById('compareTrendChart');
    if (!svg) return;
    const W = 300, H = 140, L = 24, R = 6, T = 8, B = 16;
    const w = W - L - R, h = H - T - B;
    const end = Date.now(), start = end - 24 * 3600000;

    const series = COMPARE_SERIES.map(cfg => ({
        ...cfg,
        points: (cfg.key === 'pkru' ? getSelfSeries() : (compareState.data[cfg.key]?.series || []))
            .filter(p => p.t.getTime() >= start && p.t.getTime() <= end),
    }));
    const all = series.flatMap(s => s.points.map(p => p.v));
    if (!all.length) {
        svg.innerHTML = `<text class="compare-trend-empty" x="${W / 2}" y="${H / 2}" text-anchor="middle">ยังไม่มีข้อมูลย้อนหลัง</text>`;
        return;
    }
    const max = Math.max(50, Math.ceil(Math.max(...all) / 10) * 10);
    const x = t => L + (t - start) / (end - start) * w;
    const y = v => T + (1 - Math.min(v, max) / max) * h;

    let out = '';
    // เส้นเกณฑ์ + ป้ายแกน Y
    [0, ...COMPARE_THRESHOLDS, max].forEach(v => {
        const isTh = COMPARE_THRESHOLDS.includes(v);
        out += `<line x1="${L}" x2="${L + w}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${isTh ? getAQILevel(v + 0.1).color : 'rgba(148,163,184,.2)'}" stroke-opacity="${isTh ? .35 : 1}" stroke-dasharray="${isTh ? '3 3' : ''}"/>`;
        out += `<text x="${L - 4}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${v}</text>`;
    });
    // ป้ายแกน X
    [[start, '-24 ชม.'], [start + 12 * 3600000, '-12 ชม.'], [end, 'ตอนนี้']].forEach(([t, label], i) => {
        out += `<text x="${x(t).toFixed(1)}" y="${H - 3}" text-anchor="${['start', 'middle', 'end'][i]}">${label}</text>`;
    });
    // เส้นข้อมูล
    series.forEach(s => {
        if (!s.points.length) return;
        const pts = s.points.map(p => `${x(p.t.getTime()).toFixed(1)},${y(p.v).toFixed(1)}`);
        if (pts.length > 1) {
            out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.key === 'pkru' ? 2.2 : 1.6}" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        const last = pts[pts.length - 1].split(',');
        out += `<circle cx="${last[0]}" cy="${last[1]}" r="2.4" fill="${s.color}"><title>${s.label}: ${s.points[s.points.length - 1].v.toFixed(1)} µg/m³</title></circle>`;
    });
    svg.innerHTML = out;
}

function renderCompare() {
    renderCompareBars();
    if (compareState.view === 'trend') renderCompareTrend();
}

// เรียกจาก updateOverview เมื่อค่าเซนเซอร์เปลี่ยน
function renderCompareDiffs() {
    renderCompare();
}

async function refreshCompareSources() {
    const btn = document.getElementById('compareRefresh');
    const updated = document.getElementById('compareUpdated');
    if (btn) btn.classList.add('loading');

    await Promise.all(Object.entries(COMPARE_SOURCES).map(async ([key, load]) => {
        const row = document.querySelector(`.compare-bar-row[data-source="${key}"]`);
        const metaEl = row?.querySelector('[data-role="meta"]');
        try {
            compareState.data[key] = await load();
            row?.classList.remove('error');
            if (metaEl) { metaEl.textContent = compareState.data[key].meta; metaEl.title = compareState.data[key].meta; }
        } catch (err) {
            console.warn(`Compare source ${key} failed:`, err);
            delete compareState.data[key];
            row?.classList.add('error');
            if (metaEl) { metaEl.textContent = 'ดึงข้อมูลไม่ได้'; metaEl.title = String(err); }
        }
    }));

    renderCompare();
    if (updated) {
        updated.textContent = 'อัปเดต ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
    if (btn) btn.classList.remove('loading');
}

function setCompareView(view) {
    compareState.view = view;
    document.querySelectorAll('[data-compare-view]').forEach(tab => tab.classList.toggle('active', tab.dataset.compareView === view));
    const nowView = document.getElementById('compareNowView');
    const trendView = document.getElementById('compareTrendView');
    if (nowView) nowView.hidden = view !== 'now';
    if (trendView) trendView.hidden = view !== 'trend';
    renderCompare();
}

function initCompareSources() {
    if (!document.getElementById('compareSourceList')) return;
    document.getElementById('compareRefresh')?.addEventListener('click', refreshCompareSources);
    document.querySelectorAll('[data-compare-view]').forEach(tab => {
        tab.addEventListener('click', () => setCompareView(tab.dataset.compareView));
    });
    renderCompareBars();
    refreshCompareSources();
    setInterval(refreshCompareSources, COMPARE_REFRESH_MS);
}

// ===== Global Timestamp =====
// สถานะการเชื่อมต่อแสดงที่บรรทัดเวลาในแถบข้าง (แทนกล่องแจ้งเตือน)
//   online     ได้ข้อมูลล่าสุดแล้ว
//   nodata     API ทำงาน แต่เซนเซอร์ไม่ได้ส่งข้อมูลใน 10 นาทีที่ผ่านมา (API ตอบ 404)
//   error      เชื่อมต่อ API/MQTT ไม่ได้
//   connecting กำลังเชื่อมต่อ
function formatClock(date) {
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function simulationNote() {
    if (!API.enabled) return '';
    if (state.connectionStatus === 'error') return ' · รอ API';
    if (state.connectionStatus === 'nodata') return ' · รอเซนเซอร์';
    return '';
}

function setConnectionStatus(status) {
    state.connectionStatus = status;
    const dot = dom.globalTimestampDot;
    if (dot) {
        dot.classList.toggle('active', status === 'online' && !!state.lastDataAt);
        dot.classList.toggle('offline', status === 'offline' || status === 'error' || status === 'nodata');
        dot.classList.toggle('connecting', status === 'connecting');
    }
    if (dom.globalTimestamp) {
        const err = status === 'error' && apiState.lastError ? apiState.lastError.message : '';
        dom.globalTimestamp.title = err;
    }
    if (!dom.globalTimestampText) return;
    if (simulationInterval) { // ระหว่างจำลองข้อมูล ให้บรรทัดเวลาแสดง "ข้อมูลจำลอง"
        dom.globalTimestampText.textContent = `ข้อมูลจำลอง · ${formatClock(new Date())}${simulationNote()}`;
        return;
    }
    const last = state.lastDataAt ? formatClock(state.lastDataAt) : null;
    if (status === 'connecting') {
        dom.globalTimestampText.textContent = last ? `กำลังเชื่อมต่อใหม่… · ข้อมูลล่าสุด ${last}` : 'กำลังเชื่อมต่อเซนเซอร์…';
    } else if (status === 'offline' || status === 'error') {
        dom.globalTimestampText.textContent = last ? `ขาดการเชื่อมต่อ · ข้อมูลล่าสุด ${last}` : 'เชื่อมต่อเซนเซอร์ไม่ได้ — กำลังลองใหม่';
    } else if (status === 'nodata') {
        dom.globalTimestampText.textContent = last ? `เซนเซอร์ไม่ได้ส่งข้อมูล · ข้อมูลล่าสุด ${last}` : 'เซนเซอร์ไม่ได้ส่งข้อมูลใน 10 นาทีที่ผ่านมา';
    } else if (status === 'online' && !last) {
        dom.globalTimestampText.textContent = 'เชื่อมต่อแล้ว · รอข้อมูลจากเซนเซอร์';
    } else if (status === 'online') {
        updateGlobalTimestamp(state.lastDataAt);
    }
}

// at = เวลาที่เซนเซอร์วัดค่า (จาก API) — ถ้าไม่ระบุใช้เวลาปัจจุบัน
function updateGlobalTimestamp(at) {
    const time = at instanceof Date && !isNaN(at) ? at : new Date();
    if (!state.lastDataAt || time > state.lastDataAt || simulationInterval) state.lastDataAt = time;
    const shown = state.lastDataAt;
    const dateStr = shown.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = formatClock(shown);
    if (dom.globalTimestampText) {
        dom.globalTimestampText.textContent = simulationInterval
            ? `ข้อมูลจำลอง · ${timeStr}${simulationNote()}`
            : `${dateStr} ${timeStr}`;
    }
    if (dom.globalTimestampDot && (simulationInterval || state.connectionStatus === 'online' || !API.enabled)) {
        dom.globalTimestampDot.classList.add('active');
        dom.globalTimestampDot.classList.remove('offline', 'connecting');
    }
}

// ===== Aerolink API (แหล่งข้อมูลหลัก — ตั้งค่าที่ config.js) =====
const API = window.PKRU_API || { enabled: false };
const apiState = { timer: null, lastOk: null, lastError: null, busy: false };

// ใส่ค่าจาก API ลงจุดบนแผนที่
function applyApiReading(r) {
    const node = SENSOR_NODES.find(n => n.id === r.nodeId);
    if (!node) return;
    node.data.pm25 = r.pm25;
    node.data.pm1 = r.pm1;
    node.data.pm10 = r.pm10;
    node.data.temperature = r.temperature;
    node.data.humidity = r.humidity;
    node.data.lux = r.lux;
    node.data.lastUpdate = r.time || new Date();
    onNodeDataUpdate(node.id);
}

// จุดที่ไม่มีค่าใหม่เกิน 10 นาที → แสดง "ไม่มีข้อมูล" แทนค่าเก่า
function clearStaleNodes(freshIds) {
    const now = Date.now();
    SENSOR_NODES.forEach(node => {
        if (freshIds.has(node.id)) return;
        const t = node.data.lastUpdate ? node.data.lastUpdate.getTime() : 0;
        const hasValues = ['pm25', 'pm1', 'pm10', 'temperature', 'humidity', 'lux'].some(k => node.data[k] !== null);
        if (!hasValues || now - t < API.staleMs) return;
        ['pm25', 'pm1', 'pm10', 'temperature', 'humidity', 'lux'].forEach(k => { node.data[k] = null; });
        updateMarker(node.id);
        updateNodeList();
        updateOverview();
        if (state.selectedNodeId === node.id) updateDetailPanel(node);
    });
}

async function pollApi() {
    if (!API.enabled || apiState.busy) return;
    apiState.busy = true;
    try {
        const rows = await API.latest();
        apiState.lastOk = Date.now();
        apiState.lastError = null;
        if (!rows.length) {
            // API ตอบ 404: เซิร์ฟเวอร์ทำงาน แต่ไม่มีค่าจากเซนเซอร์ใน 10 นาทีที่ผ่านมา
            if (state.realMode) clearStaleNodes(new Set());
            setConnectionStatus('nodata');
            return;
        }
        switchToRealData();
        state.connectionStatus = 'online';
        rows.forEach(applyApiReading);
        clearStaleNodes(new Set(rows.map(r => r.nodeId)));
        setConnectionStatus('online');
        // ข้อมูลใหม่เข้ามา → ให้กราฟย้อนหลังโหลดใหม่ในรอบถัดไป
        apiHistory.expireRecent();
    } catch (err) {
        apiState.lastError = err;
        console.warn('[API]', err.message || err);
        if (state.realMode) clearStaleNodes(new Set());
        setConnectionStatus('error');
    } finally {
        apiState.busy = false;
    }
}

// ใช้พิกัดจาก /api/buildings (เปิดได้ที่ config.js → useApiCoordinates)
async function applyApiCoordinates() {
    if (!API.enabled || !API.config?.useApiCoordinates) return;
    try {
        const list = await API.buildings();
        list.forEach(b => {
            const node = SENSOR_NODES.find(n => n.id === b.nodeId);
            if (!node || !Number.isFinite(b.lat) || !Number.isFinite(b.lon)) return;
            node.lat = b.lat;
            node.lng = b.lon;
            state.markers[node.id]?.setLatLng([b.lat, b.lon]);
        });
    } catch (err) {
        console.warn('[API] buildings:', err.message || err);
    }
}

function startApiPolling() {
    setConnectionStatus('connecting');
    applyApiCoordinates();
    pollApi();
    apiState.timer = setInterval(pollApi, API.pollMs);
    // กลับมาที่แท็บ → ดึงค่าใหม่ทันที
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && (!apiState.lastOk || Date.now() - apiState.lastOk > 15000)) pollApi();
    });
}

// ข้อมูลย้อนหลังจาก API (เก็บไว้ชั่วคราว 5 นาที)
const apiHistory = {
    TTL: 5 * 60 * 1000,
    cache: new Map(),
    pending: new Set(),
    key(nodeId, days) { return `${nodeId || 'all'}|${days}`; },
    // คืนแถวที่มีอยู่ (หรือ null ถ้ายังไม่เคยโหลด) และสั่งโหลดใหม่เบื้องหลังเมื่อหมดอายุ แล้วเรียก onReady
    get(nodeId, days, onReady) {
        if (!API.enabled) return null;
        const key = this.key(nodeId, days);
        const hit = this.cache.get(key);
        if ((!hit || Date.now() - hit.at > this.TTL) && !this.pending.has(key)) {
            this.pending.add(key);
            const deviceId = nodeId ? API.deviceIdFor(nodeId) : undefined;
            API.history(days * 24, { deviceId })
                .then(res => {
                    this.cache.set(key, { at: Date.now(), rows: res.rows.map(apiRowToHistory).filter(Boolean) });
                })
                .catch(err => {
                    console.warn('[API] history:', err.message || err);
                    // ลองใหม่ใน 1 นาที โดยยังใช้ข้อมูลเดิม (ถ้ามี)
                    this.cache.set(key, { at: Date.now() - this.TTL + 60000, rows: hit ? hit.rows : null });
                })
                .finally(() => {
                    this.pending.delete(key);
                    if (typeof onReady === 'function') onReady();
                });
        }
        return hit ? hit.rows : null;
    },
    // ช่วง 1 วันเปลี่ยนเร็ว ให้หมดอายุทุก 2 นาที
    expireRecent() {
        this.cache.forEach((v, k) => {
            if (k.endsWith('|1') && Date.now() - v.at > 2 * 60 * 1000) v.at = 0;
        });
    },
};

function apiRowToHistory(r) {
    if (r.pm25 === null && r.temperature === null && r.humidity === null) return null;
    return {
        nodeId: r.nodeId,
        timestamp: new Date(r.t).toISOString(),
        pm25: r.pm25,
        pm1: r.pm1,
        pm10: r.pm10,
        temperature: r.temperature,
        humidity: r.humidity,
        lux: r.lux,
    };
}

// ===== Discord Alert =====
async function sendDiscordAlert(node, pm25) {
    if (!DISCORD_CONFIG.webhookUrl) return;
    if (pm25 < DISCORD_CONFIG.threshold) return;

    // Check cooldown
    const lastAlert = state.discordLastAlert[node.id];
    const now = Date.now();
    if (lastAlert && (now - lastAlert) < DISCORD_CONFIG.cooldownMinutes * 60 * 1000) return;

    const aqi = getAQILevel(pm25);
    const advice = getHealthAdvice(pm25);

    const colorMap = { 'very-good': 0x22d3ee, 'good': 0x10b981, 'moderate': 0xeab308, 'unhealthy-sg': 0xf97316, 'unhealthy': 0xf43f5e, 'hazardous': 0xa855f7 };

    const embed = {
        title: `${advice.icon} แจ้งเตือนค่าฝุ่น PM2.5 สูง!`,
        description: `**${node.name}** มีค่า PM2.5 สูงเกินเกณฑ์`,
        color: colorMap[aqi.class] || 0xff0000,
        fields: [
            { name: '📍 สถานที่', value: node.name, inline: true },
            { name: '💨 PM2.5', value: `${pm25.toFixed(1)} μg/m³`, inline: true },
            { name: '🏷️ ระดับ', value: aqi.text, inline: true },
            { name: '🩺 คำแนะนำ', value: `${advice.text} — ${advice.sub}`, inline: false },
        ],
        footer: { text: 'PKRU Air Quality Monitor' },
        timestamp: new Date().toISOString(),
    };

    try {
        await fetch(DISCORD_CONFIG.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] }),
        });
        state.discordLastAlert[node.id] = now;
        console.log(`[Discord] Alert sent for ${node.name}: PM2.5 = ${pm25.toFixed(1)}`);
    } catch (err) {
        console.error('[Discord] Failed to send alert:', err);
    }
}

// ===== MQTT =====
function parseValue(payload, key) {
    const str = payload.toString().trim();
    try {
        const json = JSON.parse(str);
        if (typeof json === 'number') return json;
        if (typeof json === 'object') {
            if (json.value !== undefined) return parseFloat(json.value);
            if (json[key] !== undefined) return parseFloat(json[key]);
        }
    } catch {
        // Not JSON
    }
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

function connectMQTT() {
    if (state.client) {
        state.client.end(true);
        state.client = null;
    }

    const config = MQTT_CONFIG;
    const url = `${config.protocol}://${config.host}:${config.port}${config.path}`;
    showToast(`กำลังเชื่อมต่อ ${config.host}...`, 'info');
    setConnectionStatus('connecting');

    const options = {
        clientId: 'pkru_aqm_' + Math.random().toString(16).substring(2, 10),
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
    };

    if (config.username) {
        options.username = config.username;
        options.password = config.password;
    }

    try {
        state.client = mqtt.connect(url, options);
    } catch (err) {
        showToast(`เชื่อมต่อล้มเหลว: ${err.message}`, 'error');
        setConnectionStatus('error');
        return;
    }

    state.client.on('connect', () => {
        state.connected = true;
        showToast('เชื่อมต่อ MQTT สำเร็จ', 'success');
        setConnectionStatus('online');

        // Subscribe to all node topics
        const wildcard = `${config.topicPrefix}/+/+`;
        state.client.subscribe(wildcard, { qos: 0 }, (err) => {
            if (err) showToast(`Subscribe ล้มเหลว: ${wildcard}`, 'error');
        });

        // Also subscribe to per-node JSON topic
        const wildcardSingle = `${config.topicPrefix}/+`;
        state.client.subscribe(wildcardSingle, { qos: 0 });
    });

    state.client.on('message', (topic, message) => {
        // ได้ข้อมูลจริงแล้ว → หยุดโหมดจำลอง
        if (SENSOR_NODES.some(n => n.id === topic.split('/')[1])) switchToRealData();
        const prefix = MQTT_CONFIG.topicPrefix;
        const parts = topic.split('/');

        // Expected patterns:
        // {prefix}/{nodeId}/{dataType} → e.g. sensor/node1/pm25
        // {prefix}/{nodeId} → JSON with all data e.g. sensor/node1 → {"pm25":25,"temperature":32,"humidity":65}

        if (parts.length >= 2) {
            // Check if topic matches pattern with 3 parts
            if (parts.length >= 3) {
                const dataType = parts[parts.length - 1]; // pm25, temperature, humidity
                const nId = parts[parts.length - 2];
                const node = SENSOR_NODES.find(n => n.id === nId);
                if (node) {
                    const val = parseValue(message, dataType);
                    if (val !== null) {
                        if (dataType === 'pm25') node.data.pm25 = val;
                        else if (dataType === 'temperature' || dataType === 'temp') node.data.temperature = val;
                        else if (dataType === 'humidity' || dataType === 'hum') node.data.humidity = val;
                        node.data.lastUpdate = new Date();
                        onNodeDataUpdate(node.id);
                    }
                }
            }
            // Check if topic matches single-level JSON topic: {prefix}/{nodeId}
            else if (parts.length === 2) {
                const nId = parts[1];
                const node = SENSOR_NODES.find(n => n.id === nId);
                if (node) {
                    try {
                        const json = JSON.parse(message.toString());
                        if (json.pm25 !== undefined) node.data.pm25 = parseFloat(json.pm25);
                        if (json.temperature !== undefined) node.data.temperature = parseFloat(json.temperature);
                        if (json.temp !== undefined) node.data.temperature = parseFloat(json.temp);
                        if (json.humidity !== undefined) node.data.humidity = parseFloat(json.humidity);
                        if (json.hum !== undefined) node.data.humidity = parseFloat(json.hum);
                        node.data.lastUpdate = new Date();
                        onNodeDataUpdate(node.id);
                    } catch {
                        // Not valid JSON for single topic
                    }
                }
            }
        }
    });

    state.client.on('error', (err) => {
        console.error('MQTT Error:', err);
        showToast(`MQTT Error: ${err.message}`, 'error');
        setConnectionStatus('error');
    });

    state.client.on('close', () => {
        if (state.connected) {
            state.connected = false;
            showToast('ขาดการเชื่อมต่อ MQTT', 'warning');
            if (!state.realMode) startSimulation();
        }
        setConnectionStatus('offline');
    });

    state.client.on('reconnect', () => {
        showToast('กำลังเชื่อมต่อใหม่...', 'info');
        setConnectionStatus('connecting');
    });
}

function disconnectMQTT() {
    if (state.client) {
        state.client.end(true);
        state.client = null;
        state.connected = false;
        showToast('ตัดการเชื่อมต่อ MQTT', 'info');
        setConnectionStatus('offline');
        if (!state.realMode) startSimulation();
    }
}

// ===== Historical data =====
// เก็บค่าในเบราว์เซอร์เพื่อให้กราฟและ CSV แสดงข้อมูลที่ได้รับจริง
// v2: เริ่มเก็บใหม่เมื่อเปลี่ยนเป็นข้อมูลจริงจาก MQTT (ข้อมูล v1 เป็นข้อมูลจำลอง)
const HISTORY_STORAGE_KEY = 'pkru-air-quality-history-v2';
try { localStorage.removeItem('pkru-air-quality-history-v1'); } catch { /* ignore */ }
const HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function loadHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveHistory(rows) {
    try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(rows)); } catch { /* Storage unavailable */ }
}

function recordHistory(node) {
    if (!node || node.data.pm25 === null || node.data.temperature === null || node.data.humidity === null) return;
    const now = Date.now();
    const rows = loadHistory().filter(row => now - new Date(row.timestamp).getTime() <= HISTORY_RETENTION_MS);
    const last = rows[rows.length - 1];

    // รวมค่าที่เข้ามาในช่วง 20 วินาทีเดียวกันเป็นหนึ่งจุด เพื่อให้กราฟอ่านง่าย
    if (last && last.nodeId === node.id && now - new Date(last.timestamp).getTime() < 20000) {
        last.timestamp = new Date(now).toISOString();
        last.pm25 = node.data.pm25;
        last.temperature = node.data.temperature;
        last.humidity = node.data.humidity;
    } else {
        rows.push({
            nodeId: node.id,
            timestamp: new Date(now).toISOString(),
            pm25: node.data.pm25,
            temperature: node.data.temperature,
            humidity: node.data.humidity,
        });
    }
    saveHistory(rows);
}

function getHistoryRows(nodeId, days = state.historyRange) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    // มี API → ใช้ข้อมูลจาก InfluxDB ของ Aerolink (ถ้าโหลดไม่ได้ ใช้ข้อมูลที่เบราว์เซอร์เก็บไว้แทน)
    const apiRows = apiHistory.get(nodeId, days, () => { if (state.selectedNodeId === nodeId) renderHistoryChart(); });
    if (apiRows) return apiRows.filter(row => new Date(row.timestamp).getTime() >= cutoff);
    return loadHistory()
        .filter(row => row.nodeId === nodeId && new Date(row.timestamp).getTime() >= cutoff)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function getHistoryCoverage(rows) {
    const timestamps = rows
        .map(row => new Date(row.timestamp).getTime())
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
    if (!timestamps.length) return null;
    return {
        first: timestamps[0],
        last: timestamps[timestamps.length - 1],
        duration: Math.max(0, timestamps[timestamps.length - 1] - timestamps[0]),
    };
}

function formatHistoryCoverage(duration) {
    const minutes = Math.max(1, Math.round(duration / 60000));
    if (minutes < 60) return `${minutes} นาที`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} ชั่วโมง`;
    const days = Math.round(hours / 24);
    return `${days} วัน`;
}

// เฉลี่ยทุกจุดตรวจวัดในแต่ละช่วงเวลา (ข้ามค่าที่ว่าง)
function averageRowsByBucket(rows, bucketMs) {
    const buckets = new Map();
    rows.forEach(row => {
        const t = new Date(row.timestamp).getTime();
        if (!Number.isFinite(t)) return;
        const k = Math.floor(t / bucketMs) * bucketMs;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(row);
    });
    const avg = (list, key) => {
        const vals = list.map(r => r[key]).filter(v => v !== null && v !== undefined && Number.isFinite(Number(v))).map(Number);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([t, list]) => ({
        timestamp: new Date(t).toISOString(),
        pm25: avg(list, 'pm25'),
        temperature: avg(list, 'temperature'),
        humidity: avg(list, 'humidity'),
    })).filter(r => r.pm25 !== null && r.temperature !== null && r.humidity !== null);
}

function getOverviewHistoryRows(days = state.overviewHistoryRange) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const apiRows = apiHistory.get(null, days, renderOverviewChart);
    if (apiRows) {
        return averageRowsByBucket(apiRows.filter(r => new Date(r.timestamp).getTime() >= cutoff), days <= 2 ? 5 * 60000 : 3600000);
    }
    const buckets = new Map();
    loadHistory().filter(row => new Date(row.timestamp).getTime() >= cutoff).forEach(row => {
        const bucket = Math.floor(new Date(row.timestamp).getTime() / 20000) * 20000;
        const values = buckets.get(bucket) || [];
        values.push(row);
        buckets.set(bucket, values);
    });
    return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([timestamp, rows]) => ({
        timestamp: new Date(timestamp).toISOString(),
        pm25: rows.reduce((total, row) => total + Number(row.pm25), 0) / rows.length,
        temperature: rows.reduce((total, row) => total + Number(row.temperature), 0) / rows.length,
        humidity: rows.reduce((total, row) => total + Number(row.humidity), 0) / rows.length,
    }));
}

// แกนเวลาจริง: กราฟครอบคลุมช่วงที่เลือกทั้งช่วง (ถ้ามีข้อมูลแค่บางส่วน ด้านซ้ายจะว่าง)
// และตัดเส้นเมื่อข้อมูลขาดช่วง
function timeSegments(rows, x, y, key) {
    const times = rows.map(r => new Date(r.timestamp).getTime());
    const steps = times.slice(1).map((t, i) => t - times[i]).filter(d => d > 0).sort((a, b) => a - b);
    const typical = steps.length ? steps[Math.floor(steps.length / 2)] : 0;
    const maxGap = Math.max(typical * 3, 20 * 60000);
    const segs = [];
    let cur = [];
    rows.forEach((row, i) => {
        const v = Number(row[key]);
        if (row[key] === null || row[key] === undefined || !Number.isFinite(v)) { if (cur.length) segs.push(cur); cur = []; return; }
        if (cur.length && times[i] - times[i - 1] > maxGap) { segs.push(cur); cur = []; }
        cur.push(`${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`);
    });
    if (cur.length) segs.push(cur);
    return segs;
}

function formatRangeEdge(date, days) {
    return days === 1
        ? date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

// ข้อความบอกว่ามีข้อมูลจริงกี่ชั่วโมง/วัน เมื่อยังไม่ครบช่วงที่เลือก
function coverageNote(rows, days) {
    const coverage = getHistoryCoverage(rows);
    if (!coverage) return '';
    const requested = days * 86400000;
    if (coverage.duration >= requested - 90 * 60000) return '';
    return `มีข้อมูล ${formatHistoryCoverage(coverage.duration)}`;
}

function renderOverviewChart() {
    if (!dom.overviewChart) return;
    const days = state.overviewHistoryRange;
    const rows = getOverviewHistoryRows();
    if (dom.overviewChartEmpty) dom.overviewChartEmpty.classList.toggle('visible', rows.length < 2);
    const axis = document.getElementById('overviewChartAxis');
    const end = Date.now(), start = end - days * 86400000;
    if (axis) {
        const note = rows.length ? coverageNote(rows, days) : '';
        axis.innerHTML = `<span>${formatRangeEdge(new Date(start), days)}</span><span class="oca-note">${note}</span><span>ตอนนี้</span>`;
    }
    if (!rows.length) {
        dom.overviewChart.innerHTML = '';
        return;
    }

    const metrics = [
        { key: 'pm25', color: '#818cf8' },
        { key: 'temperature', color: '#f97316' },
        { key: 'humidity', color: '#22d3ee' },
    ];
    const upper = Math.max(100, Math.ceil(Math.max(...metrics.flatMap(metric => rows.map(row => Number(row[metric.key])).filter(Number.isFinite))) / 10) * 10);
    const left = 6, right = 6, top = 7, bottom = 7, width = 290 - left - right, height = 120 - top - bottom;
    const x = t => left + Math.max(0, Math.min(1, (t - start) / (end - start))) * width;
    const y = value => top + (upper - Math.max(0, value)) / upper * height;
    const grid = [.25, .5, .75].map(position => `<line x1="${left}" y1="${top + height * position}" x2="${left + width}" y2="${top + height * position}" stroke="rgba(148,163,184,.13)" stroke-dasharray="2 3"/>`).join('');
    const lines = metrics.map(metric => timeSegments(rows, x, y, metric.key).map(seg => seg.length > 1
        ? `<polyline points="${seg.join(' ')}" fill="none" stroke="${metric.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`
        : `<line x1="${seg[0].split(',')[0]}" y1="${seg[0].split(',')[1]}" x2="${seg[0].split(',')[0]}" y2="${seg[0].split(',')[1]}" stroke="${metric.color}" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`).join('')).join('');
    dom.overviewChart.innerHTML = `${grid}${lines}`;
}

function renderHistoryChart() {
    if (!dom.historyChart || !state.selectedNodeId) return;
    const metrics = [
        { key: 'pm25', label: 'PM2.5', unit: 'μg/m³', color: '#818cf8' },
        { key: 'temperature', label: 'อุณหภูมิ', unit: '°C', color: '#f97316' },
        { key: 'humidity', label: 'ความชื้น', unit: '%RH', color: '#22d3ee' },
    ];
    const days = state.historyRange;
    const rows = getHistoryRows(state.selectedNodeId)
        .filter(row => [row.pm25, row.temperature, row.humidity].every(v => v !== null && v !== undefined && Number.isFinite(Number(v))));
    const note = coverageNote(rows, days);
    if (dom.historyRangeLabel) {
        dom.historyRangeLabel.textContent = [`ย้อนหลัง ${days} วัน`, note, `มี ${rows.length.toLocaleString('th-TH')} รายการ`].filter(Boolean).join(' · ');
    }
    if (dom.historyEmpty) dom.historyEmpty.classList.toggle('visible', rows.length < 2);

    if (rows.length === 0) {
        dom.historyChart.innerHTML = '';
        if (dom.historySummary) dom.historySummary.textContent = 'ยังไม่มีข้อมูลบันทึก';
        return;
    }

    // ลดจำนวนจุดที่วาดเพื่อรักษาความลื่นไหลบนช่วง 30 วัน
    const maxPoints = 240;
    const step = Math.max(1, Math.ceil(rows.length / maxPoints));
    const points = rows.filter((_, index) => index % step === 0 || index === rows.length - 1);
    const values = metrics.flatMap(metric => points.map(row => Number(row[metric.key]))).filter(Number.isFinite);
    const upper = Math.max(100, Math.ceil(Math.max(...values) / 10) * 10);
    const left = 36, right = 10, top = 12, bottom = 28, width = 580 - left - right, height = 180 - top - bottom;
    const end = Date.now(), start = end - days * 86400000;
    const x = t => left + Math.max(0, Math.min(1, (t - start) / (end - start))) * width;
    const y = value => top + (upper - Math.max(0, value)) / upper * height;
    const grid = [0, .5, 1].map(position => {
        const value = upper - upper * position;
        const gridY = top + height * position;
        return `<line x1="${left}" y1="${gridY}" x2="${left + width}" y2="${gridY}" stroke="rgba(148,163,184,.18)" stroke-dasharray="3 4"/><text x="0" y="${gridY + 4}" fill="#64748b" font-size="10">${value.toFixed(0)}</text>`;
    }).join('');
    // ป้ายแกนเวลา: ต้นช่วง / กลางช่วง / ตอนนี้
    const labels = [[start, 'start'], [start + (end - start) / 2, 'middle'], [end, 'end']].map(([t, anchor]) =>
        `<text x="${x(t).toFixed(1)}" y="174" text-anchor="${anchor}" fill="#64748b" font-size="10">${t === end ? 'ตอนนี้' : formatRangeEdge(new Date(t), days)}</text>`).join('');
    const showDots = points.length <= 60;
    const lines = metrics.map(metric => {
        const segs = timeSegments(points, x, y, metric.key);
        const paths = segs.map(seg => seg.length > 1
            ? `<polyline points="${seg.join(' ')}" fill="none" stroke="${metric.color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`
            : `<circle cx="${seg[0].split(',')[0]}" cy="${seg[0].split(',')[1]}" r="3" fill="${metric.color}"/>`).join('');
        const dots = showDots ? points.map(row => {
            const t = new Date(row.timestamp).getTime();
            return `<circle cx="${x(t).toFixed(1)}" cy="${y(Number(row[metric.key])).toFixed(1)}" r="2" fill="${metric.color}"><title>${metric.label} · ${new Date(t).toLocaleString('th-TH')}: ${Number(row[metric.key]).toFixed(1)} ${metric.unit}</title></circle>`;
        }).join('') : '';
        return paths + dots;
    }).join('');

    dom.historyChart.innerHTML = `${grid}${lines}${labels}`;
    if (dom.historySummary) {
        const latest = points[points.length - 1];
        dom.historySummary.textContent = `ล่าสุด: PM2.5 ${Number(latest.pm25).toFixed(1)} · ${Number(latest.temperature).toFixed(1)}°C · ${Number(latest.humidity).toFixed(1)}%RH`;
    }
}

// ===== On Data Update =====
function onNodeDataUpdate(nodeId) {
    updateMarker(nodeId);
    updateNodeList();
    updateOverview();
    updateGlobalTimestamp(SENSOR_NODES.find(n => n.id === nodeId)?.data.lastUpdate);

    // Update detail panel if this node is selected
    if (state.selectedNodeId === nodeId) {
        const node = SENSOR_NODES.find(n => n.id === nodeId);
        if (node) updateDetailPanel(node);
    }

    // Discord alert check
    const node = SENSOR_NODES.find(n => n.id === nodeId);
    recordHistory(node);
    renderOverviewChart();
    if (node && node.data.pm25 !== null) {
        sendDiscordAlert(node, node.data.pm25);
    }

    if (state.selectedNodeId === nodeId) renderHistoryChart();
}

// ===== Event Listeners =====
if (dom.themeToggle) {
    dom.themeToggle.addEventListener('click', toggleTheme);
}

if (dom.sidebarToggle) dom.sidebarToggle.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        dom.sidebar.classList.toggle('open');
        dom.sidebarToggle.setAttribute('aria-expanded', String(dom.sidebar.classList.contains('open')));
    } else {
        dom.sidebar.classList.toggle('collapsed');
        dom.sidebarToggle.setAttribute('aria-expanded', String(!dom.sidebar.classList.contains('collapsed')));
        // Show/hide the Leaflet sidebar-open control
        if (dom.sidebar.classList.contains('collapsed') && state.sidebarToggleControl) {
            state.sidebarToggleControl.classList.add('visible');
        } else if (state.sidebarToggleControl) {
            state.sidebarToggleControl.classList.remove('visible');
        }
        setTimeout(() => state.map.invalidateSize(), 350);
    }
});

if (dom.mobileToggle) dom.mobileToggle.addEventListener('click', () => {
    dom.sidebar.classList.toggle('open');
    dom.mobileToggle.setAttribute('aria-expanded', String(dom.sidebar.classList.contains('open')));
});

if (dom.detailClose) dom.detailClose.addEventListener('click', () => {
    deselectNode();
});

document.querySelectorAll('[data-history-range]').forEach(button => {
    button.addEventListener('click', () => {
        state.historyRange = Number(button.dataset.historyRange);
        document.querySelectorAll('[data-history-range]').forEach(tab => tab.classList.toggle('active', tab === button));
        renderHistoryChart();
    });
});

document.querySelectorAll('[data-overview-range]').forEach(button => {
    button.addEventListener('click', () => {
        state.overviewHistoryRange = Number(button.dataset.overviewRange);
        document.querySelectorAll('[data-overview-range]').forEach(tab => tab.classList.toggle('active', tab === button));
        renderOverviewChart();
    });
});

if (dom.historyDownload) dom.historyDownload.addEventListener('click', exportCSV);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.detailPanel.classList.contains('active')) {
        deselectNode();
    }
});

// ===== Data Export (CSV) =====
// ใช้ข้อมูลชุดเดียวกับกราฟ: ดึงจาก API ใหม่ (ทุกค่า: PM1.0/PM2.5/PM10/อุณหภูมิ/ความชื้น/ความสว่าง)
// ถ้า API ใช้ไม่ได้ ใช้ข้อมูลที่เบราว์เซอร์เก็บไว้แทน — เวลาเป็นเวลาไทย (UTC+7) พร้อมคอลัมน์ UTC
function pad2(n) { return String(n).padStart(2, '0'); }
function bangkokTimeText(date) {
    const d = new Date(date.getTime() + 7 * 3600000);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

async function loadRowsForCSV(nodeId, days) {
    if (API.enabled) {
        try {
            const res = await API.history(days * 24, { deviceId: nodeId ? API.deviceIdFor(nodeId) : undefined });
            const rows = res.rows.map(apiRowToHistory).filter(Boolean);
            return { rows, source: 'Aerolink API', resolution: res.resolution };
        } catch (err) {
            console.warn('[CSV] API history failed, using local data:', err.message || err);
        }
    }
    const cutoff = Date.now() - days * 86400000;
    const rows = loadHistory()
        .filter(row => (!nodeId || row.nodeId === nodeId) && new Date(row.timestamp).getTime() >= cutoff);
    return { rows, source: 'browser', resolution: null };
}

async function exportCSV() {
    const selected = state.selectedNodeId;
    const days = state.historyRange;
    const btn = dom.historyDownload;
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    let loaded;
    try {
        loaded = await loadRowsForCSV(selected, days);
    } finally {
        if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    }
    const rows = loaded.rows
        .filter(row => Number.isFinite(new Date(row.timestamp).getTime()))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp) || String(a.nodeId).localeCompare(String(b.nodeId)));
    if (!rows.length) {
        if (dom.historySummary) dom.historySummary.textContent = 'ยังไม่มีข้อมูลย้อนหลังสำหรับดาวน์โหลด';
        showToast('ยังไม่มีข้อมูลย้อนหลังสำหรับดาวน์โหลด', 'warning');
        return;
    }

    const csvEscape = value => {
        const text = String(value ?? '');
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const fmt = (v, digits) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) ? '' : Number(v).toFixed(digits);
    const header = [
        'datetime_bangkok', 'timestamp_utc', 'device_id', 'location',
        'pm1_0_ugm3', 'pm2_5_ugm3', 'pm10_ugm3', 'temperature_c', 'humidity_pct', 'lux', 'aqi_level',
    ];
    const lines = [header.join(',')];
    rows.forEach(row => {
        const t = new Date(row.timestamp);
        const node = SENSOR_NODES.find(item => item.id === row.nodeId);
        const pm25 = row.pm25 === null || row.pm25 === undefined ? null : Number(row.pm25);
        lines.push([
            bangkokTimeText(t),
            t.toISOString(),
            (API.deviceIdFor && API.deviceIdFor(row.nodeId)) || row.nodeId,
            node ? node.name : 'ไม่ทราบตำแหน่ง',
            fmt(row.pm1, 1), fmt(pm25, 1), fmt(row.pm10, 1),
            fmt(row.temperature, 1), fmt(row.humidity, 1), fmt(row.lux, 0),
            Number.isFinite(pm25) ? getAQILevel(pm25).text : '',
        ].map(csvEscape).join(','));
    });

    const blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = bangkokTimeText(new Date()).slice(0, 10).replace(/-/g, '');
    const scope = selected ? ((API.deviceIdFor && API.deviceIdFor(selected)) || selected) : 'all';
    const res = loaded.resolution === '5min_mean' ? '_5min' : (loaded.resolution ? '_hourly' : '');
    link.download = `PKRU_AQI_${scope}_${days}d${res}_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    const coverage = getHistoryCoverage(rows);
    const hasFullCoverage = coverage && coverage.duration >= days * 86400000 - 90 * 60000;
    const coverageText = coverage ? formatHistoryCoverage(coverage.duration) : 'ไม่ทราบช่วงเวลา';
    showToast(
        hasFullCoverage
            ? `ดาวน์โหลด ${rows.length.toLocaleString('th-TH')} รายการย้อนหลัง ${days} วันแล้ว`
            : `ดาวน์โหลด ${rows.length.toLocaleString('th-TH')} รายการ · มีข้อมูลจริง ${coverageText} (ยังไม่ครบ ${days} วัน)`,
        hasFullCoverage ? 'success' : 'warning',
        6000
    );
}

// ===== Initialize =====
function init() {
    initTheme();
    initMap();
    buildNodeList();
    updateOverview();
    renderOverviewChart();
    initCompareSources();

    // โหมดจำลอง — หยุดเองเมื่อได้ข้อมูลจริง (ดู USE_SIMULATION ด้านบน)
    startSimulation();

    if (API.enabled) {
        // แหล่งข้อมูลหลัก: Aerolink API (ตั้งค่า URL ที่ config.js)
        console.info('[API] ใช้ข้อมูลจาก', API.baseUrl);
        startApiPolling();
    } else {
        // สำรอง: MQTT
        setConnectionStatus('connecting');
        setTimeout(() => connectMQTT(), 300);
    }

    // Hide loading screen after map is initialized
    setTimeout(() => {
        const loading = document.getElementById('loadingScreen');
        if (loading) loading.classList.add('hidden');
    }, 1500);
}

init();
