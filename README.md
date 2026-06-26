# Line OA Centralizer

**Line OA Centralizer** คือระบบ Webhook Gateway และ API Gateway ส่วนกลางสำหรับบริหารจัดการ LINE Official Accounts (LINE OA) หลายบัญชีพร้อมกัน ทำหน้าที่เป็นจุดรับ Webhook หลักเพียงจุดเดียวขององค์กรหรือระบบงาน แล้วส่งต่อ (Forward) ข้อมูลอย่างปลอดภัยและมีประสิทธิภาพไปยังแอปพลิเคชันหรือ Chatbot ปลายทางได้หลายระบบพร้อมกันในลักษณะขนาน (Parallel Delivery) รวมถึงเปิดจุดบริการส่งข้อความออก (Messaging API Gateway) ให้กับแอปพลิเคชันย่อยอื่น ๆ ได้ผ่านระบบควบคุมสิทธิ์ API Key

---

## 🌟 คุณสมบัติหลัก (Key Features)

### 1. Multi-destination Webhook Forwarding
* **Single Endpoint:** รับ Webhook จาก LINE OA ได้ไม่จำกัดด้วยเส้นทางเดียวแบบไดนามิก `/api/webhooks/line/[accountId]`
* **Redis Queue buffering:** มีระบบจัดคิวแบบ FIFO ด้วย Redis ช่วยรับ Payload ความเร็วสูง แล้วส่งตอบกลับสถานะ HTTP 200 OK ให้กับเซิร์ฟเวอร์ LINE ได้ภายใน 2 วินาที (ป้องกัน LINE Timeout)
* **Parallel Delivery:** มี Queue Worker (สเกลได้สูงสุด 4 Replicas) ดึง Event ไปส่งต่อให้กับ Chatbot ปลายทางทุกจุดตามที่ตั้งค่าไว้แบบขนานด้วย `Promise.allSettled` หากปลายทางใดเสียหายจะไม่ส่งผลกระทบต่อปลายทางอื่น ๆ

### 2. background Profile Enrichment
* **Auto Sync:** เมื่อมีเหตุการณ์ใหม่ (เช่น Follow หรือ Message) เกิดขึ้น Worker จะทำการสืบค้นและอัปเดตข้อมูลโปรไฟล์ผู้ใช้ (`displayName`, `pictureUrl`) หรือสรุปกลุ่มข้อมูลกลุ่ม (`groupName`) จาก LINE API โดยอัตโนมัติ
* **Cache Strategy:** เก็บข้อมูลลงตารางแคชใน PostgreSQL และจำเกณฑ์ระยะเวลาอัปเดตแคช 7 วัน เพื่อช่วยป้องกันอัตราคำขอเกินขีดจำกัด (Rate Limit) ของฝั่ง LINE API

### 3. Unified Admin Dashboard (Premium Dark Mode)
* แดชบอร์ดสรุปสถิติจำนวน LINE Accounts, API Keys ที่รันอยู่ในระบบ
* **สถิติรายวัน (Traffic Volumes):** กราฟแท่งบอกปริมาณ Webhook รายวัน 7 วันย้อนหลังพร้อมรายละเอียด Tooltip
* **เปอร์เซ็นต์สัดส่วน (Analytics):** แผนภูมิสัดส่วนประเภทอีเวนต์ (Event Types) และส่วนแบ่งปริมาณคำขอส่งออกของแต่ละ Sub-App แยกรายโปรเจกต์
* ตารางแสดงผลประวัติ Webhook ล่าสุด 5 รายการ แสดงผลแบบ Mono-font เพื่อความสะดวกรวดเร็วในการก๊อปปี้ User ID หรือ Group ID ไปใช้งานต่อ

### 4. Scoped Access Control (Hybrid Whitelist)
* แบ่งสิทธิ์ออกเป็น 2 ระดับด้วยการล็อกอินผ่าน Google OAuth:
  1. **Super Admin:** กำหนดตายตัวใน Environment Variable เข้าถึงและจัดการแก้ไขตั้งค่าได้ทุกส่วนของระบบ (รวมถึงจัดการรายชื่อสิทธิ์ Whitelist)
  2. **Whitelisted Admin:** บัญชีอีเมลที่ Super Admin เพิ่มลงในตารางสิทธิ์ ซึ่งจะเห็นข้อมูลและจัดการได้เฉพาะ LINE Accounts ที่ได้รับอนุญาตเท่านั้น (Scope Isolation)

### 5. Detailed Logs & Filtering
* บันทึกประวัติการเรียกใช้งาน (API Calls) และการรับ Webhook แบบละเอียด
* ระบบสืบค้นและตัวกรองที่ยืดหยุ่น: กรองตาม LINE OA, กรองตาม API Key, เลือกเฉพาะประวัติที่ทำงานล้มเหลว (Status Code >= 400 - Error Only), หรือค้นหาด้วย Keyword

---

## 🛠️ Tech Stack & Architecture

* **Core Framework:** Next.js 14 (App Router สำหรับ Admin Panel & Dynamic API Routes)
* **Language:** TypeScript
* **Database:** PostgreSQL (เก็บการตั้งค่า, แคชโปรไฟล์ และประวัติการทำงาน)
* **ORM:** Drizzle ORM
* **Queue Engine:** Redis (คิวพักข้อมูล Webhook)
* **CSS Framework:** Tailwind CSS
* **UI Components:** Ant Design (Dark Mode theme)
* **Reverse Proxy:** Cloudflared Tunnel (Cloudflare Tunnel)

---

## 📦 โครงสร้างคอนเทนเนอร์ (Docker Compose)

ระบบถูกแพ็คเกจโครงสร้างด้วย Docker Compose แยกออกเป็น 4 เซอร์วิสหลัก:

```yaml
services:
  db:
    image: postgres:15-alpine
    # เก็บข้อมูลการตั้งค่าและประวัติระบบ
  redis:
    image: redis:7-alpine
    # บริหารคิวรับ Event (educ_line_events)
  web:
    build: .
    # Next.js Application สำหรับ Webhook Gateway และ Admin UI
  worker:
    build: .
    # Script Worker รันจำนวน 4 Replicas สำหรับกระจาย Webhook และ Sync Profiles
```

---

## 🚀 ขั้นตอนการติดตั้งและการรันระบบ (Setup & Installation)

### 1. การเตรียม Environment Variables
คัดลอกไฟล์ `.env.example` ไปเป็น `.env` และกรอกข้อมูลการตั้งค่าระบบ:
```bash
cp .env.example .env
```

ฟิลด์สำคัญที่ต้องกำหนดค่า:
* `DATABASE_URL`: Connection string ของ PostgreSQL (เช่น `postgresql://user:pass@db:5432/line_centralizer`)
* `REDIS_URL`: URL ของ Redis (เช่น `redis://redis:6379`)
* `SUPER_ADMIN_EMAILS`: รายชื่อ Gmail ของแอดมินสูงสุด คั่นด้วยจุลภาค (เช่น `admin@example.com,super@example.com`)
* `NEXTAUTH_SECRET`: คีย์สุ่มความปลอดภัยของ NextAuth
* `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: สำหรับระบบ Google OAuth Authentication

### 2. การสร้างและอพยพฐานข้อมูล (Database Migrations)
ใช้ Drizzle Kit เพื่อสร้างและรันสคีมาฐานข้อมูล:
```bash
# สร้างชุด Migration SQL
npm run db:generate

# ส่ง Migration ไปรันบนฐานข้อมูลจริง
npm run db:migrate
```

### 3. สั่งรันด้วย Docker Compose
สั่ง Build และเริ่มต้นคอนเทนเนอร์ทั้งหมด (รวมถึงสั่งขยาย replicas ของ worker):
```bash
docker compose up -d --build --scale worker=4
```

---

## 🔌 API Specifications

### 1. Webhook Gateway Receive
* **Endpoint:** `POST /api/webhooks/line/[lineAccountId]`
* **ลักษณะการใช้งาน:** นำไปกรอกลงในช่อง Webhook URL ของ LINE Developers บัญชี LINE OA นั้น ๆ
* **การส่งต่อ:** Payload จะถูกยืนยันลายเซ็น (Signature Verification) แล้วส่งต่อแบบขนานไปยังปลายทางที่ตั้งค่าไว้ในตาราง `line_account_forward_urls`

### 2. Sub-App Push Message Gateway
* **Endpoint:** `POST /api/internal/messages/send`
* **Headers:**
  - `Content-Type: application/json`
  - `X-EDUC-Hub-Token: <YOUR_API_KEY_TOKEN>`
* **Request Body:**
  ```json
  {
    "lineAccountId": "UUID-of-LINE-Account",
    "to": "LINE-USER-ID-OR-GROUP-ID",
    "messages": [
      {
        "type": "text",
        "text": "ข้อความส่งจากระบบย่อย"
      }
    ]
  }
  ```

---

## 📄 License

โปรเจกต์นี้เปิดใช้งานเผยแพร่ภายใต้สัญญาอนุญาต **MIT License** สามารถนำไปดัดแปลง ใช้งาน และแจกจ่ายต่อได้ฟรีทั้งในรูปแบบส่วนตัวและเชิงพาณิชย์ (ดูรายละเอียดเพิ่มเติมในไฟล์ [LICENSE](file:///d:/Project/Line%20API%20EDUC%20Center/LICENSE))
