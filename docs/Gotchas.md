# Known Gotchas & Troubleshooting

1.  **Webhook Timeout (2-Second Limit):**
    * LINE บังคับว่าต้องตอบกลับ `200 OK` ภายใน 2 วินาที
    * *วิธีรันโค้ด (AI Rule):* ห้ามเขียนโค้ดที่ทำ External HTTP Call หรือ Heavy Database Query ใน Request Thread หลัก ให้ส่งเข้า Redis Queue แล้วตอบกลับทันที
2.  **Signature Mismatch Error (403):**
    * การคำนวณ `x-line-signature` ต้องใช้ **Raw Request Body (Buffer/String)** ดั้งเดิมเสมอ
    * *วิธีรันโค้ด (AI Rule):* ปิดการพาร์ส JSON อัตโนมัติใน Next.js API Route สำหรับ Endpoint ที่รับ Webhook จาก LINE (`bodyParser: false`)
3.  **Event Redelivery (Webhook ซ้ำ):**
    * LINE อาจส่ง Event ซ้ำมาหากเน็ตเวิร์กมีปัญหา
    * *วิธีรันโค้ด (AI Rule):* ต้องใช้ `webhookEventId` ตรวจสอบใน Database (Upsert/Check) ก่อนประมวลผลเสมอ
4.  **ESM TypeScript Running Issue in Worker (`ts-node` Error):**
    * ในระบบ Node 20 (ESM) การใช้ `ts-node` เพื่อเรียกสคริปต์ `.ts` นอก Next.js Context อาจขึ้นข้อผิดพลาด `TypeError: Unknown file extension ".ts"`
    * *วิธีแก้ไข:* เปลี่ยนการเรียกใช้งานใน Dockerfile สำหรับรัน Worker เป็น `npx tsx src/worker/index.ts`
5.  **Database URL Parsing Failure (Special Characters in Password):**
    * หากรหัสผ่าน Postgres มีอักขระพิเศษ เช่น `@` หรือ `#` การต่อ URL ตรงๆ ใน `DATABASE_URL` จะถูกตีความเป็น Host/Delimiter ผิดเพี้ยน และส่งผลให้ Drizzle Kit หรือ db client โยนข้อผิดพลาด `getaddrinfo ENOTFOUND`
    * *วิธีแก้ไข:* ทำการ URL-encode ส่วนของรหัสผ่านใน `DATABASE_URL` (เช่น เปลี่ยน `@` -> `%40`, `#` -> `%23`) โดยที่ตัวแปรเดี่ยว `POSTGRES_PASSWORD` ให้ระบุรหัสผ่านดิบตามปกติ
6.  **NextAuth Redirect URI Mismatch Behind Reverse Proxy:**
    * เมื่อเข้าใช้งานผ่าน Cloudflare Tunnel หรือ Reverse Proxy ตัว NextAuth มักทำ Redirect URI ผิดโปรโตคอล (เป็น HTTP แทนที่จะเป็น HTTPS) ทำให้หน้าล็อกอิน Google แจ้งข้อผิดพลาด 400: `redirect_uri_mismatch`
    * *วิธีแก้ไข:* ต้องกำหนดค่าสภาพแวดล้อม `TRUST_HOST=true` ในคอนเทนเนอร์เว็บบัญชีเสมอ เพื่ออนุญาตให้ NextAuth ไว้วางใจโปรโตคอลและโฮสต์จาก Headers ที่ส่งมาจาก Reverse Proxy ด้านหน้า