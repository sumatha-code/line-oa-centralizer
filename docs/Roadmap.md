# Project Roadmap

## Phase 1: Core Gateway, Multi-account & Admin Panel (Current)
- [x] สร้าง Docker Compose Environment (Next.js, Queue Worker, Postgres, Redis)
- [x] พัฒนา Data Models ด้วย Drizzle ORM (`line_accounts`, `admin_whitelist`, `users`, `groups`, `webhook_events`, `api_keys`, `usage_logs` และตารางสิทธิ์)
- [x] พัฒนา Dynamic Webhook Endpoint `/api/webhooks/line/[accountId]` ดักจับ signature และรับข้อมูลลงคิว
- [x] พัฒนา Queue Worker (Async Consumer) ดึง Event จาก Redis และส่งต่อไปยัง Chatbot URL ของบัญชีนั้นๆ
- [x] พัฒนาหน้า Admin Panel รองรับ Google Login พร้อมตรวจสอบสิทธิ์จาก Whitelist
- [x] พัฒนาหน้าจอตั้งค่า LINE Accounts (เพิ่ม/ลบ/แก้ไขข้อมูล API Credentials และ Forward URL)
- [x] พัฒนาหน้าจอจัดการ API Keys และ Whitelisted Admins (กำหนดสิทธิ์การเข้าถึงแยกราย LINE Account)
- [x] พัฒนา Internal Endpoint `/api/internal/messages/send` โดยเช็คสิทธิ์ API Key และ LINE Account
- [x] การติดตั้งระบบและการขยายขีดความสามารถการรับงานจริงบน Production (Docker Compose + 4 Replicas Queue Worker + Cloudflared Reverse Proxy)
- [x] เพิ่มคู่มือขั้นตอนการเซ็ตอัพและส่วนรหัสตัวอย่างการเชื่อมต่อ (cURL, Node.js, Python) บนหน้าจอระบบจัดการสำหรับนักพัฒนาย่อย


## Phase 2: Analytics & Advanced Features
- [x] หน้า Dashboard แสดงสถิติการใช้งานแยกตาม API Key และ LINE Account
- [x] ระบบค้นหา Profile User/Group อัตโนมัติจาก LINE API มาบันทึกเพิ่ม (Profile Enrichment)
- [x] ระบบเก็บข้อมูลประวัติการใช้งานแบบละเอียดและการกรองดู Logs ย้อนหลังตามสิทธิ์ของแอดมินแต่ละคน