// ===== ข้อมูลย้อนหลังสำหรับหน้าต่าง "ข้อมูลย้อนหลัง" =====
// ใส่ข้อมูลจำลอง (mock) หรือข้อมูลเก่าไว้ในอาร์เรย์นี้ หน้าเว็บจะรวมกับข้อมูลที่เบราว์เซอร์เก็บไว้ให้เอง
//
// รูปแบบแต่ละแถว:
//   nodeId      : 'node2' | 'node3' | 'node4'   (ตรงกับ SENSOR_NODES ใน app.js)
//   timestamp   : เวลาแบบ ISO เช่น '2024-01-01T13:00:00+07:00'
//   pm25        : µg/m³
//   temperature : °C
//   humidity    : %RH
//
// ตัวอย่าง:
// window.PKRU_HISTORY_MOCK = [
//     { nodeId: 'node2', timestamp: '2024-01-01T00:00:00+07:00', pm25: 18.2, temperature: 27.4, humidity: 82 },
//     { nodeId: 'node3', timestamp: '2024-01-01T00:00:00+07:00', pm25: 20.1, temperature: 27.1, humidity: 84 },
// ];
window.PKRU_HISTORY_MOCK = window.PKRU_HISTORY_MOCK || [];
