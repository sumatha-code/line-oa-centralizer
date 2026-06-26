# System Architecture & Tech Stack

## Tech Stack
* **Core Framework:** Next.js (App Router สำหรับ Admin Panel, API Routes สำหรับ Webhook Gateway)
* **Language:** TypeScript (Strict Mode)
* **Database:** PostgreSQL (Official Docker Image)
* **ORM:** Drizzle ORM
* **Message Queue:** Redis (Official Docker Image)
* **UI Library:** Ant Design (Dark Mode), Tailwind CSS
* **Authentication:** NextAuth.js / Auth.js (Google Provider สำหรับ Admin Panel)
* **Deployment:** Docker Compose บน Proxmox (On-premise) ประกอบด้วยบริการ: `web` (Next.js), `worker` (Queue Consumer รันจำนวน 4 Replicas ขนานกัน), `db` (PostgreSQL), และ `redis` (Redis) พร้อมเชื่อมต่อออกสู่ภายนอกผ่าน Cloudflared Reverse Proxy (Cloudflare Tunnel) ในพอร์ต 443 (HTTPS) ไปยังโดเมน `https://line-api.educ-su.work`

## System Overview
1.  **Webhook Gateway:** รับ HTTP POST ที่เส้นทาง `/api/webhooks/line/[accountId]` -> ดึง Secret ของ Account นั้นจาก Database -> ตรวจสอบ `x-line-signature` -> ดักจับ ID ผู้ใช้/กลุ่มลง Database -> โยน Event ลง Redis Queue -> ตอบกลับ `200 OK` ทันทีภายใน 2 วินาที
2.  **Queue Consumer (Worker Container):** ดึง Event จาก Redis Queue -> สืบค้นรายการ URLs ปลายทางทั้งหมดที่ตั้งค่าไว้และเปิดใช้งานจากตาราง `line_account_forward_urls` ของบัญชี LINE OA นั้น -> ดำเนินการยิง Forward Webhook ไปยังบอทปลายทางทุกแห่งพร้อมกันแบบขนาน (Parallel Delivery) ด้วย `Promise.allSettled` โดยอิสระต่อกัน
3.  **Admin Panel:** เข้าสู่ระบบด้วย Google -> ตรวจสอบสิทธิ์ว่าอยู่ใน `SUPER_ADMIN_EMAILS` หรือตาราง `admin_whitelist` -> หน้า Dashboard จัดการบัญชี LINE OA, สร้าง/ระงับ API Key และดูประวัติการใช้งาน (Logs) ตามระดับสิทธิ์ที่ได้รับมอบหมาย

## Environment Variables (Template)
```env
# Security (Generated Secure Random)
NEXTAUTH_SECRET=your_nextauth_secret_here
EDUC_HUB_MASTER_TOKEN=your_master_token_here

# Database (Postgres)
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=your_postgres_db
DATABASE_URL=postgresql://your_postgres_user:your_postgres_password@db:5432/your_postgres_db

# Redis
REDIS_URL=redis://redis:6379

# Google Auth (NextAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000

# Super Admins (เข้าถึงได้ทุกบัญชีและจัดการสิทธิ์ได้ทั้งหมด)
SUPER_ADMIN_EMAILS="admin@example.com"
```