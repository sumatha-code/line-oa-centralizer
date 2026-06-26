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