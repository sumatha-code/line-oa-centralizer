# Project Roadmap

## Phase 1: Core Gateway, Multi-account & Admin Panel (Current)
- [ ] สร้าง Docker Compose Environment (Next.js, Queue Worker, Postgres, Redis)
- [ ] พัฒนา Data Models ด้วย Drizzle ORM (`line_accounts`, `admin_whitelist`, `users`, `groups`, `webhook_events`, `api_keys`, `usage_logs` และตารางสิทธิ์)
- [ ] พัฒนา Dynamic Webhook Endpoint `/api/webhooks/line/[accountId]` ดักจับ signature และรับข้อมูลลงคิว
- [ ] พัฒนา Queue Worker (Async Consumer) ดึง Event จาก Redis และส่งต่อไปยัง Chatbot URL ของบัญชีนั้นๆ
- [ ] พัฒนาหน้า Admin Panel รองรับ Google Login พร้อมตรวจสอบสิทธิ์จาก Whitelist
- [ ] พัฒนาหน้าจอตั้งค่า LINE Accounts (เพิ่ม/ลบ/แก้ไขข้อมูล API Credentials และ Forward URL)
- [ ] พัฒนาหน้าจอจัดการ API Keys และ Whitelisted Admins (กำหนดสิทธิ์การเข้าถึงแยกราย LINE Account)
- [ ] พัฒนา Internal Endpoint `/api/internal/messages/send` โดยเช็คสิทธิ์ API Key และ LINE Account

## Phase 2: Analytics & Advanced Features
- [ ] หน้า Dashboard แสดงสถิติการใช้งานแยกตาม API Key และ LINE Account
- [ ] ระบบค้นหา Profile User/Group อัตโนมัติจาก LINE API มาบันทึกเพิ่ม (Profile Enrichment)
- [ ] ระบบเก็บข้อมูลประวัติการใช้งานแบบละเอียดและการกรองดู Logs ย้อนหลังตามสิทธิ์ของแอดมินแต่ละคน