// ===== PKRU Air Quality — เปลี่ยนภาษา ไทย / English =====
// ใช้ร่วมกันทั้ง index.html และ dashboard.html
// - เลือกภาษาที่หน้าหลัก (ปุ่ม TH / EN) แล้วจำไว้ใน localStorage ('pkru_lang') → หน้า dashboard ใช้ภาษาเดียวกัน
// - แปลข้อความบนหน้าเว็บตามพจนานุกรมด้านล่าง (ข้อความไทย → อังกฤษ) รวมถึงข้อความที่สคริปต์สร้างขึ้นภายหลัง
// - เพิ่มคำแปลใหม่: เพิ่มบรรทัดใน DICT โดยใช้ข้อความไทยที่แสดงบนหน้าเว็บเป็น key
(function () {
    'use strict';

    const STORAGE_KEY = 'pkru_lang';
    const getLang = () => { try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'th'; } catch { return 'th'; } };
    const setLang = lang => { try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ } };
    window.PKRU_LANG = getLang();

    // ---------- พจนานุกรม ----------
    const DICT = {
        // ===== หน้าหลัก =====
        'PKRU Air Quality — ระบบตรวจวัดคุณภาพอากาศ มรภ.ภูเก็ต': 'PKRU Air Quality — Campus Air Quality Monitoring, Phuket Rajabhat University',
        'ระบบตรวจวัดคุณภาพอากาศ มหาวิทยาลัยราชภัฏภูเก็ต — PM2.5, อุณหภูมิ, ความชื้น แบบเรียลไทม์': 'Air quality monitoring at Phuket Rajabhat University — real-time PM2.5, temperature and humidity',
        'แดชบอร์ด': 'Dashboard',
        'ภาษา': 'Language',
        'ระบบเฝ้าระวังคุณภาพอากาศ': 'Air Quality Monitoring System',
        'รู้คุณภาพอากาศ': 'Check the air',
        'ก่อนออกจากอาคาร': 'before you head out',
        'ตรวจสอบ PM2.5 อุณหภูมิ และความชื้นจาก 3 จุดสำคัญในมหาวิทยาลัย เพื่อวางแผนกิจกรรมได้อย่างมั่นใจ': 'Check PM2.5, temperature and humidity from 3 key points on campus and plan your activities with confidence.',
        'ดู Dashboard': 'Open Dashboard',
        'เกี่ยวกับระบบ': 'About the system',
        '3 จุดตรวจวัด': '3 monitoring points',
        'ข้อมูลอัปเดตต่อเนื่อง': 'Continuously updated',
        'สรุปคุณภาพอากาศล่าสุด': 'Latest air quality summary',
        'สถานะล่าสุด': 'Latest status',
        'PM2.5 เฉลี่ย': 'Average PM2.5',
        'ค่าเฉลี่ย PM2.5': 'Average PM2.5',
        'กำลังเชื่อมต่อเซนเซอร์...': 'Connecting to sensors...',
        'กำลังเชื่อมต่อเซนเซอร์…': 'Connecting to sensors…',
        'มาตรฐาน PM2.5': 'PM2.5 standard',
        'ดูรายละเอียดทั้งหมด →': 'View full details →',
        'จุดตรวจวัดทั่ว Campus': 'Monitoring points across campus',
        'ติดตั้งเซ็นเซอร์ตรวจวัดคุณภาพอากาศ 3 จุดทั่วมหาวิทยาลัย เพื่อให้ข้อมูลแบบเรียลไทม์': 'Air quality sensors are installed at 3 points across the university to provide real-time data.',
        'วัดค่าฝุ่นละอองขนาดเล็กแบบเรียลไทม์ พร้อมแจ้งเตือนเมื่อเกินเกณฑ์': 'Measures fine particulate matter in real time and alerts when it exceeds the threshold.',
        'อุณหภูมิ': 'Temperature',
        'ตรวจวัดอุณหภูมิอากาศรอบบริเวณตึกแต่ละคณะ': 'Measures the air temperature around each faculty building.',
        'ความชื้น': 'Humidity',
        'วัดความชื้นสัมพัทธ์ในอากาศ เพื่อประเมินสภาพอากาศโดยรวม': 'Measures relative humidity to assess overall weather conditions.',
        'แจ้งเตือน Discord': 'Discord alerts',
        'รับการแจ้งเตือนอัตโนมัติผ่าน Discord เมื่อคุณภาพอากาศอยู่ในระดับอันตราย': 'Get automatic Discord alerts when air quality reaches a harmful level.',
        'มาตรฐานสีคุณภาพอากาศ (PM2.5)': 'Air quality color scale (PM2.5)',
        'ดีมาก': 'Very good',
        'ดี': 'Good',
        'ปานกลาง': 'Moderate',
        'เริ่มมีผลกระทบ': 'Unhealthy for sensitive groups',
        'มีผลต่อสุขภาพ': 'Unhealthy',
        'เปิดแผนที่ดูข้อมูลเชิงลึก': 'Open the map for detailed data',
        'เกี่ยวกับโครงการ': 'About the project',
        'โครงงานพัฒนาระบบตรวจวัดและแจ้งเตือนคุณภาพอากาศแบบเรียลไทม์ภายในมหาวิทยาลัยราชภัฏภูเก็ต เพื่อเฝ้าระวังและดูแลสุขภาพของนักศึกษา บุคลากร และประชาชนทั่วไป': 'A project to develop a real-time air quality monitoring and alert system at Phuket Rajabhat University, helping protect the health of students, staff and the public.',
        'วัตถุประสงค์': 'Objectives',
        'เฝ้าระวังคุณภาพอากาศภายในมหาวิทยาลัยแบบเรียลไทม์': 'Monitor air quality on campus in real time',
        'แจ้งเตือนอัตโนมัติเมื่อค่าฝุ่นเกินเกณฑ์มาตรฐาน': 'Send automatic alerts when dust levels exceed the standard',
        'เก็บข้อมูลระยะยาวเพื่อการวิเคราะห์และวิจัย': 'Collect long-term data for analysis and research',
        'ส่งเสริมแนวคิด Smart Campus ของมหาวิทยาลัย': 'Support the university\'s Smart Campus vision',
        'ให้ข้อมูลคุณภาพอากาศที่เข้าถึงง่ายผ่านเว็บไซต์ ทั้งบนคอมพิวเตอร์และโทรศัพท์': 'Make air quality data easy to access on the web, on both computers and phones',
        'ช่วยให้นักศึกษาและบุคลากรวางแผนกิจกรรมกลางแจ้งได้อย่างปลอดภัย': 'Help students and staff plan outdoor activities safely',
        'เปรียบเทียบค่าที่วัดได้กับแหล่งข้อมูลอ้างอิง เช่น กรมควบคุมมลพิษ และ GISTDA': 'Compare our readings with reference sources such as the Pollution Control Department and GISTDA',
        'เป็นต้นแบบการใช้ IoT ต้นทุนต่ำ เพื่อการเรียนการสอนและต่อยอดสู่พื้นที่อื่น': 'Serve as a low-cost IoT prototype for teaching and for expansion to other areas',
        'เทคโนโลยีที่ใช้': 'Technology',
        'เซ็นเซอร์:': 'Sensors:',
        'PMS7003 (PM2.5) + DHT22 (อุณหภูมิ/ความชื้น)': 'PMS7003 (PM2.5) + DHT22 (temperature/humidity)',
        'ไมโครคอนโทรลเลอร์:': 'Microcontroller:',
        'ESP32 พร้อม WiFi': 'ESP32 with WiFi',
        'โปรโตคอล:': 'Protocol:',
        'MQTT สำหรับส่งข้อมูลแบบเรียลไทม์': 'MQTT for real-time data delivery',
        'มาตรฐาน:': 'Standard:',
        'อ้างอิงเกณฑ์ PM2.5 กรมควบคุมมลพิษ 2566': 'Pollution Control Department PM2.5 thresholds (2023)',
        'ขอบเขตการติดตั้ง': 'Installation scope',
        'ติดตั้งเซ็นเซอร์ 3 จุดภายในมหาวิทยาลัย': '3 sensors installed on campus',
        'คณะวิทยาศาสตร์ · คณะมนุษยศาสตร์': 'Faculty of Science · Faculty of Humanities',
        'คณะวิทยาการจัดการ': 'Faculty of Management Sciences',
        'ส่งข้อมูลอัตโนมัติทุก 30 วินาที ตลอด 24 ชั่วโมง': 'Automatic data every 30 seconds, 24 hours a day',
        'ข้อมูลย้อนหลัง': 'Historical data',
        'สถิติค่า PM2.5 รายสัปดาห์': 'Weekly PM2.5 statistics',
        'ระบบเก็บข้อมูลต่อเนื่อง เพื่อวิเคราะห์แนวโน้มและนำไปใช้ในงานวิจัย': 'Data is collected continuously to analyze trends and support research.',
        'ค่าเฉลี่ย PM2.5 รายวัน': 'Daily average PM2.5',
        'ย้อนหลัง 7 วัน (ข้อมูลตัวอย่าง)': 'Last 7 days (sample data)',
        'เกณฑ์เฝ้าระวัง (37.5)': 'Alert threshold (37.5)',
        'จ.': 'Mon', 'อ.': 'Tue', 'พ.': 'Wed', 'พฤ.': 'Thu', 'ศ.': 'Fri', 'ส.': 'Sat', 'อา.': 'Sun',
        'ค่าต่ำสุด': 'Minimum',
        'ค่าเฉลี่ย': 'Average',
        'ค่าสูงสุด': 'Maximum',
        'เกินเกณฑ์': 'Above threshold',
        'ทีมผู้จัดทำ': 'Team',
        'ผู้พัฒนาโครงการ': 'Project developers',
        'สาขาวิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์และเทคโนโลยี': 'Computer Science Program, Faculty of Science and Technology',
        'มหาวิทยาลัยราชภัฏภูเก็ต': 'Phuket Rajabhat University',
        'อาจารย์ที่ปรึกษา': 'Advisor',
        'ผศ.ดร.ทรงเกียรติ ภาวดี': 'Asst. Prof. Dr. Songkiat Pawadee',
        'สาขาวิชาวิทยาการคอมพิวเตอร์': 'Computer Science Program',
        'ผู้พัฒนา': 'Developer',
        'นายศิรวิทย์ จันสุกศรี': 'Mr. Sirawit Jansuksri',
        'นายปรมินทร์ ข้องรัก': 'Mr. Poramin Khongrak',
        'ติดต่อสอบถาม': 'Contact us',
        'คลิกเพื่อเข้าร่วม Discord สอบถามข้อมูลเพิ่มเติม': 'Join our Discord for more information',
        'มรภ.ภูเก็ต': 'PKRU',
        'ข้อจำกัดความรับผิดชอบ:': 'Disclaimer:',
        'ข้อมูลที่แสดงในระบบนี้ได้มาจากเซ็นเซอร์ที่ติดตั้งภายในมหาวิทยาลัยราชภัฏภูเก็ต มีวัตถุประสงค์เพื่อการเฝ้าระวังเบื้องต้นเท่านั้น ไม่สามารถใช้อ้างอิงทางกฎหมายหรือการแพทย์ได้ เซ็นเซอร์ส่งข้อมูลทุก 30 วินาที ค่าที่แสดงอาจมีความคลาดเคลื่อนจากค่ามาตรฐานของกรมควบคุมมลพิษ': 'Data shown here comes from sensors installed at Phuket Rajabhat University and is intended for preliminary monitoring only. It cannot be used as a legal or medical reference. Sensors report every 30 seconds, and values may differ from the Pollution Control Department\'s reference measurements.',
        '© 2026 PKRU Air Quality Monitor — มหาวิทยาลัยราชภัฏภูเก็ต | พัฒนาเป็นส่วนหนึ่งของโครงงานสาขาวิชาวิทยาการคอมพิวเตอร์': '© 2026 PKRU Air Quality Monitor — Phuket Rajabhat University | Developed as part of a Computer Science project',
        'ทำกิจกรรมกลางแจ้งได้ตามปกติ': 'Outdoor activities are fine',
        'ผู้มีโรคประจำตัวควรระวัง': 'People with health conditions should take care',
        'ควรสวมหน้ากากอนามัย': 'Wear a face mask',
        'งดกิจกรรมกลางแจ้ง ปิดหน้าต่าง': 'Avoid outdoor activities and close windows',
        'เชื่อมต่อเซนเซอร์ไม่ได้': 'Cannot connect to sensors',
        'รอข้อมูลจากเซนเซอร์...': 'Waiting for sensor data...',
        'รอข้อมูลจากเซนเซอร์…': 'Waiting for sensor data…',
        'ขาดการเชื่อมต่อ กำลังลองใหม่...': 'Disconnected, retrying...',
        'เชื่อมต่อเซนเซอร์ไม่ได้ กำลังลองใหม่...': 'Cannot connect to sensors, retrying...',
        'กำลังโหลดข้อมูล...': 'Loading data...',

        // ===== หน้า Dashboard =====
        'PKRU Air Quality Map — มหาวิทยาลัยราชภัฏภูเก็ต': 'PKRU Air Quality Map — Phuket Rajabhat University',
        'แผนที่แสดงคุณภาพอากาศ มหาวิทยาลัยราชภัฏภูเก็ต — PM2.5, อุณหภูมิ, ความชื้น แบบเรียลไทม์': 'Air quality map of Phuket Rajabhat University — real-time PM2.5, temperature and humidity',
        'กลับหน้าแรก': 'Back to home',
        'ซ่อนแถบข้อมูล': 'Hide panel',
        'เปิดแถบข้อมูล': 'Open panel',
        'ภาพรวมคุณภาพอากาศ': 'Air quality overview',
        'อุณหภูมิเฉลี่ย': 'Avg. temperature',
        'ความชื้นเฉลี่ย': 'Avg. humidity',
        'รอข้อมูล': 'Waiting for data',
        'รอข้อมูล...': 'Waiting for data...',
        'ยังไม่มีข้อมูล': 'No data yet',
        'ทุกจุดตรวจวัด': 'All monitoring points',
        'กราฟภาพรวมย้อนหลัง': 'Overview history',
        'ช่วงเวลาของกราฟภาพรวม': 'Overview chart range',
        '1 วัน': '1 day', '7 วัน': '7 days', '30 วัน': '30 days',
        'กราฟภาพรวมของทุกจุดตรวจวัด': 'Overview chart of all monitoring points',
        'กำลังรอข้อมูล': 'Waiting for data',
        'ดูข้อมูลย้อนหลังทั้งหมด': 'View all historical data',
        'เปรียบเทียบ PM2.5 กับแหล่งอื่น': 'Compare PM2.5 with other sources',
        'ดึงข้อมูลเปรียบเทียบใหม่': 'Refresh comparison data',
        'กำลังโหลด…': 'Loading…',
        'มุมมองการเปรียบเทียบ': 'Comparison view',
        'กราฟแท่ง: ค่าล่าสุดของแต่ละแหล่ง': 'Bar chart: latest value from each source',
        'ตอนนี้': 'Now',
        'กราฟเส้น: ค่ารายชั่วโมงย้อนหลัง 24 ชั่วโมง': 'Line chart: hourly values over the last 24 hours',
        '24 ชม.': '24 h',
        '-24 ชม.': '-24 h',
        '-12 ชม.': '-12 h',
        'เซนเซอร์ของเรา': 'Our sensors',
        'กราฟ PM2.5 ย้อนหลัง 24 ชั่วโมงเทียบแต่ละแหล่ง': 'PM2.5 over the last 24 hours by source',
        'หน่วย µg/m³ · Air4Thai = สถานีกรมควบคุมมลพิษที่ใกล้ที่สุด · GISTDA และ Open-Meteo เป็นค่าประมาณจากดาวเทียม/แบบจำลอง ค่าอาจต่างกันตามตำแหน่งและวิธีวัด': 'Units: µg/m³ · Air4Thai = nearest Pollution Control Department station · GISTDA and Open-Meteo are satellite/model estimates. Values may differ by location and method.',
        'เปิดมาตรฐาน PM2.5 ของกรมควบคุมมลพิษในแท็บใหม่': 'Open the Pollution Control Department PM2.5 standard in a new tab',
        'ดีมาก (0–15.0)': 'Very good (0–15.0)',
        'ดี (15.1–25.0)': 'Good (15.1–25.0)',
        'ปานกลาง (25.1–37.5)': 'Moderate (25.1–37.5)',
        'เริ่มมีผลกระทบ (37.6–75.0)': 'Unhealthy for sensitive groups (37.6–75.0)',
        'มีผลต่อสุขภาพ (>75.0)': 'Unhealthy (>75.0)',
        'เปลี่ยนเป็นแผนที่มืด': 'Switch to dark mode',
        'เปลี่ยนเป็นแผนที่สว่าง': 'Switch to light mode',
        'เปิดเมนู': 'Open menu',
        'ปิดรายละเอียดจุดตรวจวัด': 'Close point details',
        'แนวโน้มการตรวจวัด': 'Measurement trend',
        'ดาวน์โหลดข้อมูลช่วงเวลาที่เลือกเป็น CSV': 'Download the selected range as CSV',
        'ตัวเลือกข้อมูลย้อนหลัง': 'History options',
        'ช่วงเวลา': 'Period',
        'คำอธิบายเส้นกราฟ': 'Chart legend',
        'กราฟข้อมูลย้อนหลัง': 'History chart',
        'กำลังรอข้อมูลย้อนหลัง': 'Waiting for historical data',
        'ยังไม่มีข้อมูลบันทึก': 'No recorded data yet',
        'ยังไม่มีข้อมูลย้อนหลัง': 'No historical data yet',
        'ดูรายละเอียด': 'View details',
        'ไม่มีข้อมูล': 'No data',
        'อากาศดีมาก': 'Very good air',
        'อากาศดี': 'Good air',
        'ผู้ที่มีโรคประจำตัวควรลดกิจกรรมกลางแจ้ง': 'People with health conditions should limit outdoor activities',
        'ควรสวมหน้ากาก ลดกิจกรรมกลางแจ้ง': 'Wear a mask and limit outdoor activities',
        'งดกิจกรรมกลางแจ้ง สวมหน้ากาก N95': 'Avoid outdoor activities and wear an N95 mask',
        'เย็น': 'Cool', 'สบาย': 'Comfortable', 'อบอุ่น': 'Warm', 'ร้อน': 'Hot',
        'แห้ง': 'Dry', 'ชื้น': 'Humid', 'ชื้นมาก': 'Very humid',
        'ดึงข้อมูลไม่ได้': 'Unavailable',
        'ตำแหน่งมหาวิทยาลัย': 'University location',
        'เชื่อมต่อแล้ว · รอข้อมูลจากเซนเซอร์': 'Connected · waiting for sensor data',
        'เชื่อมต่อเซนเซอร์ไม่ได้ — กำลังลองใหม่': 'Cannot connect to sensors — retrying',
        'ไม่ทราบช่วงเวลา': 'Unknown period',
        'ไม่ทราบตำแหน่ง': 'Unknown location',
        'คุณภาพอากาศ': 'Air quality',
        'แตะเพื่อดูรายละเอียด': 'Tap for details',
        'เปิดรายละเอียดคุณภาพอากาศ': 'Open air quality details',
        'PKRU (เซนเซอร์ของเรา)': 'PKRU (our sensors)',
        'ค่าเฉลี่ยทุกจุดตรวจวัด': 'Average of all points',

        // คณะ
        'คณะวิทยาศาสตร์และเทคโนโลยี': 'Faculty of Science and Technology',
        'คณะวิทยาศาสตร์': 'Faculty of Science',
        'คณะมนุษยศาสตร์': 'Faculty of Humanities',
        'คณะมนุษยศาสตร์และสังคมศาสตร์': 'Faculty of Humanities and Social Sciences',

        // หน้าต่างข้อมูลย้อนหลัง
        'ค่าจากเซนเซอร์ของมหาวิทยาลัยราชภัฏภูเก็ต': 'Readings from Phuket Rajabhat University sensors',
        'ปิด': 'Close',
        'ความละเอียดของข้อมูล': 'Data resolution',
        'รายชั่วโมง': 'Hourly', 'รายวัน': 'Daily', 'รายเดือน': 'Monthly', 'รายปี': 'Yearly',
        'จุดตรวจวัด': 'Monitoring point',
        'ค่าที่ต้องการ': 'Measurements',
        'ความชื้นสัมพัทธ์': 'Relative humidity',
        'เริ่มต้น': 'From', 'สิ้นสุด': 'To',
        'เดือนเริ่มต้น': 'Start month', 'ปีเริ่มต้น': 'Start year', 'ชั่วโมงเริ่มต้น': 'Start hour',
        'เดือนสิ้นสุด': 'End month', 'ปีสิ้นสุด': 'End year', 'ชั่วโมงสิ้นสุด': 'End hour',
        'ตรวจสอบ →': 'Search →',
        'ดาวน์โหลด CSV': 'Download CSV',
        'ทุกจุดตรวจวัด (ค่าเฉลี่ย)': 'All points (average)',
        'ไม่พบข้อมูลในช่วงเวลาที่เลือก': 'No data found for the selected period',
        'จำนวนค่า': 'Samples',
        'ค่าเฉลี่ย (แถบจาง = ต่ำสุด–สูงสุด)': 'Average (shaded band = min–max)',
        'เฉลี่ย': 'Average',
        'กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด': 'Please choose a start and end date',
        'กรุณาเลือกเดือนเริ่มต้นและเดือนสิ้นสุด': 'Please choose a start and end month',
        'ช่วงเวลาสิ้นสุดต้องอยู่หลังช่วงเวลาเริ่มต้น': 'The end must be after the start',
        'ข้อมูลรายชั่วโมงเลือกได้ไม่เกิน 31 วัน — ลองใช้ "รายวัน" แทน': 'Hourly data is limited to 31 days — try "Daily" instead',
        'ข้อมูลรายวันเลือกได้ไม่เกินประมาณ 1 ปี — ลองใช้ "รายเดือน" แทน': 'Daily data is limited to about 1 year — try "Monthly" instead',
        'กรุณาเลือกค่าที่ต้องการอย่างน้อย 1 รายการ': 'Please choose at least one measurement',

        // Aerolink API
        'รอ API': 'waiting for API',
        'รอเซนเซอร์': 'waiting for sensors',
        'เซนเซอร์ไม่ได้ส่งข้อมูล': 'Sensors not reporting',
        'เซนเซอร์ไม่ได้ส่งข้อมูลใน 10 นาทีที่ผ่านมา': 'No sensor data in the last 10 minutes',
        'เซนเซอร์ยังไม่ได้ส่งข้อมูลล่าสุด': 'No recent sensor readings',
        'ความสว่าง': 'Light',
        'กำลังโหลดข้อมูล…': 'Loading data…',
        'แหล่งข้อมูล: Aerolink API': 'Source: Aerolink API',
        'ช่วงก่อนหน้าใช้ข้อมูลจำลอง': 'earlier periods use simulated data',
        'เชื่อมต่อ API ไม่ได้ — แสดงข้อมูลที่มีในเครื่องแทน': 'Cannot reach the API — showing locally stored data instead',
        'เชื่อมต่อ API ไม่ได้ (เซิร์ฟเวอร์ปิด, URL เปลี่ยน หรือถูกบล็อก CORS)': 'Cannot reach the API (server off, URL changed or blocked by CORS)',
        'API ตอบช้าเกินไป': 'The API took too long to respond',
        'ดึงข้อมูลย้อนหลังจาก API ไม่ได้ — แสดงข้อมูลที่มีในเครื่องแทน': 'Could not load history from the API — showing locally stored data instead',
        'เปิดดูคำตอบจากเซิร์ฟเวอร์': 'Open the server response',
        'ยังไม่มีข้อมูลย้อนหลังสำหรับดาวน์โหลด': 'No history data to download yet',
        'ข้อมูลจาก API ไม่ใช่ JSON': 'The API response is not JSON',
    };

    // สถานที่ที่มาจาก API (ภาษาไทย)
    const PLACES = {
        'ศูนย์บริการสาธารณสุขเทศบาลภูเก็ต': 'Phuket Municipal Health Center',
        'รัษฎา': 'Ratsada',
    };
    const MONTHS = { 'ม.ค.': 'Jan', 'ก.พ.': 'Feb', 'มี.ค.': 'Mar', 'เม.ย.': 'Apr', 'พ.ค.': 'May', 'มิ.ย.': 'Jun', 'ก.ค.': 'Jul', 'ส.ค.': 'Aug', 'ก.ย.': 'Sep', 'ต.ค.': 'Oct', 'พ.ย.': 'Nov', 'ธ.ค.': 'Dec' };
    const MONTH_RE = '(ม\\.ค\\.|ก\\.พ\\.|มี\\.ค\\.|เม\\.ย\\.|พ\\.ค\\.|มิ\\.ย\\.|ก\\.ค\\.|ส\\.ค\\.|ก\\.ย\\.|ต\\.ค\\.|พ\\.ย\\.|ธ\\.ค\\.)';

    // ข้อความที่มีตัวแปร (ตัวเลข/เวลา)
    const RULES = [
        [/^อัปเดตล่าสุด:\s*(.+)$/, (m, a) => `Last updated: ${a}`],
        [/^อัปเดต\s+(.+)$/, (m, a) => `Updated ${a}`],
        [/^ข้อมูลจำลอง · (.+)$/, (m, a) => `Simulated data · ${tr(a)}`],
        [/^ข้อมูลล่าสุด (.+)$/, (m, a) => `last data ${a}`],
        [/^API ตอบกลับ (\d+)$/, (m, n) => `API responded with ${n}`],
        [/^กำลังเชื่อมต่อใหม่… · ข้อมูลล่าสุด (.+)$/, (m, a) => `Reconnecting… · last data ${a}`],
        [/^ขาดการเชื่อมต่อ · ข้อมูลล่าสุด (.+)$/, (m, a) => `Disconnected · last data ${a}`],
        [/^อากาศ(ดีมาก|ดี|ปานกลาง|เริ่มมีผลกระทบ|มีผลต่อสุขภาพ)$/, (m, a) => DICT[a]],
        [/^ย้อนหลัง (\d+) วัน$/, (m, n) => `Last ${n} day${n === '1' ? '' : 's'}`],
        [/^มี ([\d,]+) รายการ$/, (m, n) => `${n} record${n === '1' ? '' : 's'}`],
        [/^ล่าสุด:\s*(.+)$/, (m, a) => `Latest: ${a}`],
        [/^(\d+) นาที$/, (m, n) => `${n} min`],
        [/^(\d+) ชั่วโมง$/, (m, n) => `${n} h`],
        [/^(\d+) วัน$/, (m, n) => `${n} day${n === '1' ? '' : 's'}`],
        [/^ต่ำสุด ([^·]+)$/, (m, a) => `Min ${a}`],
        [/^สูงสุด ([^·]+)$/, (m, a) => `Max ${a}`],
        [/^มีข้อมูล ([\d,]+) จาก ([\d,]+) ช่วง$/, (m, a, b) => `${a} of ${b} periods with data`],
        [/^มีข้อมูล (\d+ (?:นาที|ชั่วโมง|วัน))$/, (m, a) => `only ${tr(a)} of data`],
        [/^แสดง ([\d,]+) แถวล่าสุด — ดาวน์โหลด CSV เพื่อดูทั้งหมด$/, (m, n) => `Showing the latest ${n} rows — download CSV for all`],
        [/^แบบจำลอง$/, () => 'Model'],
        [/^\(?เฉลี่ย 24 ชม\.\)?$/, () => '(24-h average)'],
        [/^ต\.(?!ค\.)([^\s·]+)$/, (m, a) => PLACES[a] || a],
        [/^(.+) ถึง (.+)$/, (m, a, b) => `${tr(a)} to ${tr(b)}`],
    ];

    // แทนที่ส่วนย่อยในข้อความ (หน่วย วันที่ ปี พ.ศ.)
    function tokens(s) {
        s = s.replace(new RegExp(`(\\d{1,2}) ${MONTH_RE} (\\d{4})`, 'g'), (m, d, mo, y) => `${d} ${MONTHS[mo]} ${+y > 2400 ? +y - 543 : y}`);
        s = s.replace(new RegExp(`${MONTH_RE} (\\d{4})\\b`, 'g'), (m, mo, y) => `${MONTHS[mo]} ${+y > 2400 ? +y - 543 : y}`);
        s = s.replace(new RegExp(`${MONTH_RE} (\\d{2})\\b`, 'g'), (m, mo, y) => `${MONTHS[mo]} '${String((+y + 57) % 100).padStart(2, '0')}`);
        s = s.replace(new RegExp(`(\\d{1,2}) ${MONTH_RE}`, 'g'), (m, d, mo) => `${d} ${MONTHS[mo]}`);
        s = s.replace(new RegExp(MONTH_RE, 'g'), mo => MONTHS[mo]);
        s = s.replace(/^25([5-9]\d)$/, (m, y) => String(+m - 543));
        s = s.replace(/\(เฉลี่ย 24 ชม\.\)/g, '(24-h average)');
        s = s.replace(/(\d)\s*กม\./g, '$1 km');
        s = s.replace(/(\d{1,2}:\d{2})\s*น\./g, '$1');
        s = s.replace(/^เวลา\s+/, '');
        return s;
    }

    const TH = /[฀-๿]/;
    const cache = new Map();

    function tr(text) {
        if (!TH.test(text)) return tokens(text);
        const key = text.replace(/\s+/g, ' ').trim();
        if (cache.has(key)) return cache.get(key);
        let out = null;
        if (DICT[key] !== undefined) out = DICT[key];
        else if (PLACES[key]) out = PLACES[key];
        else if (MONTHS[key]) out = MONTHS[key];
        if (out === null) {
            for (const [re, fn] of RULES) {
                const m = key.match(re);
                if (m) { out = fn(...m); break; }
            }
        }
        if (out === null) {
            // แยกเป็นส่วน ๆ ตามตัวคั่นที่ใช้บ่อย แล้วแปลทีละส่วน
            for (const sep of [' — ', ' · ', ' | ']) {
                if (key.includes(sep)) { out = key.split(sep).map(p => tr(p)).join(sep); break; }
            }
        }
        if (out === null) {
            const t = tokens(key);
            out = t !== key ? tr(t) : key;
        }
        cache.set(key, out);
        return out;
    }
    window.PKRU_T = tr;

    // ---------- ใช้กับหน้าเว็บ ----------
    const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
    const origText = new WeakMap();     // text node → ข้อความไทยเดิม
    const origAttr = new WeakMap();     // element → { attr: ข้อความไทยเดิม }
    const lastSet = new WeakMap();      // text node → ข้อความที่เราใส่ล่าสุด
    const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);

    function applyText(node, lang) {
        const cur = node.nodeValue;
        if (lang === 'en') {
            if (lastSet.get(node) === cur) return;      // เป็นข้อความที่เราแปลไว้แล้ว
            if (!TH.test(cur) && !/\b25[5-9]\d\b/.test(cur)) { origText.delete(node); return; }
            origText.set(node, cur);
            const leading = cur.match(/^\s*/)[0], trailing = cur.match(/\s*$/)[0];
            const t = leading + tr(cur) + trailing;
            if (t !== cur) { lastSet.set(node, t); node.nodeValue = t; }
        } else if (origText.has(node)) {
            const o = origText.get(node);
            origText.delete(node);
            lastSet.delete(node);                       // ล้างสถานะ เพื่อให้กดเปลี่ยนเป็นอังกฤษได้อีกครั้ง
            node.nodeValue = o;
        }
    }

    function applyAttrs(el, lang) {
        let saved = origAttr.get(el);
        for (const a of ATTRS) {
            if (!el.hasAttribute(a)) continue;
            const v = el.getAttribute(a);
            if (lang === 'en') {
                if (!TH.test(v)) continue;
                const t = tr(v);
                if (t === v) continue;           // ไม่มีคำแปล — ไม่แตะ (กันวนซ้ำไม่รู้จบ)
                saved = saved || {};
                saved[a] = v;
                el.setAttribute(a, t);
            } else if (saved && saved[a] !== undefined) {
                el.setAttribute(a, saved[a]);
                delete saved[a];
            }
        }
        if (saved) origAttr.set(el, saved);
    }

    function walk(root, lang) {
        if (root.nodeType === 3) { applyText(root, lang); return; }
        if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
        applyAttrs(root, lang);
        const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: n => (n.nodeType === 1 && SKIP.has(n.nodeName)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
        });
        let n;
        while ((n = it.nextNode())) {
            if (n.nodeType === 3) applyText(n, lang);
            else applyAttrs(n, lang);
        }
    }

    // เก็บ title / description เดิม
    const meta = document.querySelector('meta[name="description"]');
    const orig = { title: document.title, desc: meta ? meta.content : '' };

    function applyAll(lang) {
        document.documentElement.lang = lang;
        document.documentElement.dataset.lang = lang;
        document.title = lang === 'en' ? tr(orig.title) : orig.title;
        if (meta) meta.content = lang === 'en' ? tr(orig.desc) : orig.desc;
        walk(document.body, lang);
        document.querySelectorAll('[data-lang-btn]').forEach(b => {
            const on = b.dataset.langBtn === lang;
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', String(on));
        });
    }

    // ข้อความที่สคริปต์เปลี่ยนภายหลัง
    const observer = new MutationObserver(muts => {
        if (window.PKRU_LANG !== 'en') return;
        for (const m of muts) {
            if (m.type === 'characterData') applyText(m.target, 'en');
            else if (m.type === 'attributes') applyAttrs(m.target, 'en');
            else m.addedNodes.forEach(n => walk(n, 'en'));
        }
    });

    function setLanguage(lang) {
        window.PKRU_LANG = lang;
        setLang(lang);
        applyAll(lang);
        document.dispatchEvent(new CustomEvent('pkru:langchange', { detail: { lang } }));
    }
    window.PKRU_setLanguage = setLanguage;

    function start() {
        document.querySelectorAll('[data-lang-btn]').forEach(b => {
            b.addEventListener('click', () => setLanguage(b.dataset.langBtn));
        });
        applyAll(window.PKRU_LANG);
        observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
        document.documentElement.classList.remove('i18n-pending');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
