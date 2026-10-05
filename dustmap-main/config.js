// ===== PKRU Air Quality — ค่าเชื่อมต่อ (ใช้ร่วมกันทั้ง index.html และ dashboard.html) =====
// ✏️ แก้ค่าตรงนี้ที่เดียว

// ---------- 1) Supabase (แหล่งข้อมูลหลัก) ----------
// เอาค่า 2 ตัวนี้มาจาก Supabase Dashboard > Project Settings > API
//   - Project URL            รูปแบบ https://xxxxxxxx.supabase.co
//   - anon / publishable key  คีย์สาธารณะ ใส่ในเว็บได้ปลอดภัย เพราะ RLS คุมสิทธิ์การเขียนไว้แล้ว
//     (ตารางอ่านได้ทุกคน เขียนได้แต่ผ่านฟังก์ชัน ingest() ที่ตรวจรหัสบอร์ดเท่านั้น)
// ตั้ง supabaseUrl เป็น '' เพื่อปิดการใช้ Supabase (จะกลับไปใช้ MQTT ด้านล่าง)
window.PKRU_API_CONFIG = {
    supabaseUrl: 'https://luqoxklgvxkvpjfgsrtf.supabase.co',
    supabaseAnonKey: 'sb_publishable_QZ4CeGhhwiJqPT9HkWP08g_xgTM3_iR',
    pollMs: 30000,          // ดึงค่าล่าสุดทุก 30 วินาที
    timeoutMs: 15000,
    staleMinutes: 10,       // ค่าที่เก่ากว่านี้ถือว่า "ไม่ได้อัปเดต"
    // จับคู่ device_id ของ Supabase → จุดบนแผนที่ของเว็บเรา
    devices: {
        'esp32-sci': 'node2',   // คณะวิทยาศาสตร์และเทคโนโลยี
        'esp32-hss': 'node3',   // คณะมนุษยศาสตร์และสังคมศาสตร์
        'esp32-fms': 'node4',   // คณะวิทยาการจัดการ
    },
};

// ---------- 2) MQTT (สำรอง — ใช้เมื่อ supabaseUrl ว่าง) ----------
//   1) {topicPrefix}/{nodeId}            ส่ง JSON  เช่น  sensor/node2  →  {"pm25":18.2,"temperature":30.1,"humidity":78}
//   2) {topicPrefix}/{nodeId}/{ค่า}       ส่งตัวเลข เช่น  sensor/node2/pm25  →  18.2
window.PKRU_MQTT_CONFIG = {
    host: 'test.mosquitto.org',
    port: 8081,
    protocol: 'wss',
    path: '/mqtt',
    username: '',
    password: '',
    topicPrefix: 'sensor',
};
