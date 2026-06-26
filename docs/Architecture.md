# System Architecture & Tech Stack

## Tech Stack
* **Core Framework:** Next.js (App Router สำหรับ Admin Panel, API Routes สำหรับ Webhook Gateway)
* **Language:** TypeScript (Strict Mode)
* **Database:** PostgreSQL (Official Docker Image)
* **ORM:** Drizzle ORM
* **Message Queue:** Redis (Official Docker Image)
* **UI Library:** Ant Design (Dark Mode), Tailwind CSS
* **Authentication:** NextAuth.js / Auth.js (Google Provider สำหรับ Admin Panel)
* **Deployment:** Docker Compose บน Proxmox (On-premise) แยกเป็น 4 Containers: `web` (Next.js), `worker` (Queue Consumer), `db` (PostgreSQL), `redis` (Redis)

## System Overview
1.  **Webhook Gateway:** รับ HTTP POST ที่เส้นทาง `/api/webhooks/line/[accountId]` -> ดึง Secret ของ Account นั้นจาก Database -> ตรวจสอบ `x-line-signature` -> ดักจับ ID ผู้ใช้/กลุ่มลง Database -> โยน Event ลง Redis Queue -> ตอบกลับ `200 OK` ทันทีภายใน 2 วินาที
2.  **Queue Consumer (Worker Container):** ดึง Event จาก Redis Queue -> ประมวลผลดึง `webhookForwardUrl` ของ LINE Account นั้น -> ยิง Forward Webhook ไปยัง Chatbot ปลายทาง
3.  **Admin Panel:** เข้าสู่ระบบด้วย Google -> ตรวจสอบสิทธิ์ว่าอยู่ใน `SUPER_ADMIN_EMAILS` หรือตาราง `admin_whitelist` -> หน้า Dashboard จัดการบัญชี LINE OA, สร้าง/ระงับ API Key และดูประวัติการใช้งาน (Logs) ตามระดับสิทธิ์ที่ได้รับมอบหมาย

## Environment Variables (Template)
```env
# Security (Generated Secure Random)
NEXTAUTH_SECRET=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
EDUC_HUB_MASTER_TOKEN=educhub_sec_v1_8a7b6c5d4e3f2a1b

# Database (Postgres)
POSTGRES_USER=educ_admin
POSTGRES_PASSWORD=P@ssw0rd_EducL1ne_2026_xYz!#
POSTGRES_DB=line_gateway
DATABASE_URL=postgresql://educ_admin:P@ssw0rd_EducL1ne_2026_xYz!#@db:5432/line_gateway

# Redis
REDIS_URL=redis://redis:6379

# Google Auth (NextAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000

# Super Admins (เข้าถึงได้ทุกบัญชีและจัดการสิทธิ์ได้ทั้งหมด)
SUPER_ADMIN_EMAILS="super1@silpakorn.edu,super2@silpakorn.edu,super3@silpakorn.edu"
```