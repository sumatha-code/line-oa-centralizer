# Changelog

All notable changes to the LINE API & Webhook Gateway project will be documented in this file.

## [0.2.0] - 2026-06-26

### Added
- **Production Deployment & Scaling:** ดำเนินการติดตั้งระบบเสร็จสมบูรณ์บนเซิร์ฟเวอร์ `line-api-manager` โดยใช้ Docker Compose รัน Worker ทั้งหมด 4 Replicas สำหรับกระจายโหลดงาน Webhook ขนานกัน
- **Interactive UI User Guides:** เพิ่มคู่มือและตัวอย่างซอร์สโค้ดในการส่งข้อความผ่าน API แบบอิงโฮสต์จริงและอัปเดตแบบเรียลไทม์ (cURL, Node.js, Python) เข้าในหน้าจอจัดการ API Keys และขั้นตอนเชื่อม Webhook ในหน้าจอ LINE Accounts
- **Reverse Proxy Support:** ปรับตั้งค่าความเข้ากันได้ของการทำงานหลังระบบ Cloudflared Reverse Proxy (เปิดใช้งาน `TRUST_HOST=true` เพื่อขจัดปัญหา Google OAuth Redirect URI Mismatch)
- **Multi-destination Webhook Forwarding:** เพิ่มตาราง `line_account_forward_urls` และระบบเวิร์กเกอร์ในการส่ง Payload ไปยังบอทปลายทางพร้อมกันหลายเว็บแบบขนาน (Promise.allSettled)
- **UI & Layout Hotfixes:** ปรับแก้การจัดกึ่งกลางแนวตั้งบน Topbar (ขจัดปัญหาบักชื่อลอยหลุดจาก Header) และเพิ่มคุณสมบัติ scroll แนวนอนให้กับตารางสรุปผลหลักทั้งหมดเพื่อความพร้อมใช้งานบนอุปกรณ์แท็บเล็ต

### Changed
- **Worker Execution Context:** เปลี่ยนเอนจิ้นรันสคริปต์ Worker ใน Dockerfile จาก `ts-node` เป็น `tsx` เพื่อหลีกเลี่ยงปัญหาตัวอ่านไฟล์ TypeScript (ESM module loader error)
- **Database URL Security Compliance:** ทำการเข้ารหัสแบบ URL-encoded กับรหัสผ่านที่มีอักขระพิเศษ (เช่น `@` แปลงเป็น `%40`) เพื่อป้องกัน Drizzle Kit ทำการเชื่อมต่อล้มเหลว
- **Security Sanitizations:** ลบความลับและรหัสผ่านระบบจริงออกจากเอกสารประกอบและ `.env.example` ทั้งหมดเพื่อความมั่นคงปลอดภัย (Security Best Practices)

### Document Updates
- บันทึกปัญหาการติดตั้งและข้อแก้ไขเชิงเทคนิคลงใน [Gotchas.md](file:///d:/Project/Line%20API%20EDUC%20Center/docs/Gotchas.md)
- ปรับปรุงคู่มือแผนงานความคืบหน้าโครงการใน [Roadmap.md](file:///d:/Project/Line%20API%20EDUC%20Center/docs/Roadmap.md)
- ปรับรายละเอียดโครงสร้างเครือข่ายและการเซ็ตอัพใน [Architecture.md](file:///d:/Project/Line%20API%20EDUC%20Center/docs/Architecture.md)

## [0.1.0] - 2026-06-26

### Added
- **Multi-account LINE OA Support:** ออกแบบระบบให้รองรับการเชื่อมต่อกับ LINE OA หลายบัญชีพร้อมกัน โดยเก็บประวัติการเชื่อมต่อในฐานข้อมูลแทน Environment Variable
- **Admin Access Control:**
  - เพิ่มตาราง `admin_whitelist` สำหรับเก็บรายชื่ออีเมลผู้ดูแลระบบทั่วไปที่ได้รับอนุญาต
  - เพิ่มตาราง `admin_line_accounts` เพื่อให้ Super Admin สามารถจำกัดสิทธิ์ในการจัดการ LINE OA ของผู้ดูแลระบบแต่ละคนแยกเป็นรายบัญชีได้
- **API Key Scoping:** เพิ่มตาราง `api_key_line_accounts` สำหรับเชื่อมโยง API Key ของแอปย่อยให้เรียกส่งข้อความได้เฉพาะบัญชี LINE OA ที่ได้รับอนุญาตเท่านั้น
- **Changelog:** สร้างไฟล์ `changelog.md` สำหรับบันทึกประวัติการพัฒนาและเปลี่ยนแปลงของโครงการ

### Changed
- **Dynamic Webhook Routing:** ปรับเส้นทางรับ Webhook จากเดิมที่เป็นจุดเดียว (Single Endpoint) เป็นแบบไดนามิก: `/api/webhooks/line/[accountId]` เพื่อให้รองรับหลายบัญชี
- **Webhook Forward URL:** เปลี่ยนจากการกำหนด URL ปลายทางของ Chatbot ระบบเดียว มาเป็นการเก็บในฟิลด์ `webhookForwardUrl` ของแต่ละแถวในตาราง `line_accounts` เพื่อให้ส่งต่อ Webhook แยกกันได้
- **Send Message Payload:** ปรับเพิ่มการรับค่า `lineAccountId` (UUID) ใน HTTP Body ของ Endpoint `/api/internal/messages/send` เพื่อระบุบัญชี LINE OA ที่จะใช้ส่งข้อความออก
- **Queue Worker Container:** ปรับผังการทำงานของ Queue Worker แยกเป็น 1 คอนเทนเนอร์แยกเฉพาะ (`worker`) ใน Docker Compose ร่วมกับเว็บคอนเทนเนอร์หลัก (`web`)
- **Admin Panel Sidebar Menu:** ขยายเมนูหน้าหลังบ้านเป็น 5 เมนู: Dashboard, LINE Accounts, API Keys, Admins Whitelist, System Logs

### Document Updates
- อัปเดตข้อมูลโครงสร้างระบบใน [Architecture.md](file:///d:/Project/Line%20API%20EDUC%20Center/docs/Architecture.md)
- อัปเดตรายการเมนูแสดงผลใน [Design.md](file:///d:/Project/Line%20API%20EDUC%20Center/docs/Design.md)
- ปรับโครงสร้าง Schema ตารางและความสัมพันธ์ใน [Database-Schema.md](file:///d:/Project/Line%20API%20EDUC%20Center/docs/Database-Schema.md)
- อัปเดตสเปก Interface การเรียกใช้งานใน [API-Docs.md](file:///d:/Project/Line%20API%20EDUC%20Center/docs/API-Docs.md)
- บันทึกการตัดสินใจเชิงเทคนิคใหม่ (ADR #8 และ #9) ใน [Decisions.md](file:///d:/Project/Line%20API%20EDUC%20Center/docs/Decisions.md)
- ปรับปรุงเป้าหมายและรายการเช็คลิสต์ Phase 1 ใน [Roadmap.md](file:///d:/Project/Line%20API%20EDUC%20Center/docs/Roadmap.md)
- อัปเดตหน้าแสดงผลภาพรวมสถาปัตยกรรมใน [line_api_educ_center.html](file:///d:/Project/Line%20API%20EDUC%20Center/docs/line_api_educ_center.html)
