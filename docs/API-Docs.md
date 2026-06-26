# Internal API & Webhook Specifications

## 1. Webhook Endpoint (จาก LINE OA)
* **Endpoint:** `POST /api/webhooks/line/[accountId]`
* **Description:** สำหรับให้ LINE OA ยิง Webhook เข้ามาเก็บข้อมูลและประมวลผลต่อ โดยระบบกลางจะนำ `accountId` ไปค้นหารายละเอียด Channel Secret ในฐานข้อมูลมาทำการตรวจสอบ `x-line-signature` และบันทึกข้อมูลก่อนจัดลงคิว
* **Headers:**
  * `x-line-signature`: ลายเซ็นดิจิตอลสำหรับยืนยันความถูกต้องของ Request

---

## 2. Send Message (สำหรับแอปย่อย)
* ทุก Request จากแอปพลิเคชันย่อย ต้องแนบ Header: `X-EDUC-Hub-Token: <API_KEY>`

* **Endpoint:** `POST /api/internal/messages/send`
* **Description:** ยิงข้อความประเภทต่างๆ (Text, Flex, etc.) ผ่าน Messaging API โดยระบบจะตรวจสอบสิทธิ์ของ API Key ที่แนบมาก่อนว่าได้รับอนุญาตให้ใช้ LINE Account ที่ระบุหรือไม่
* **Body (JSON):**
    ```json
    {
      "lineAccountId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "to": "U1234567890abcdef...",
      "messages": [
        {
          "type": "text",
          "text": "Hello from CCTV Request System"
        }
      ]
    }
    ```

---

## 3. Get Users / Groups (อนาคต)
* ทุก Request จากแอปพลิเคชันย่อย ต้องแนบ Header: `X-EDUC-Hub-Token: <API_KEY>`

* **Endpoint:** `GET /api/internal/users?search={keyword}&lineAccountId={lineAccountId}`
* **Description:** ค้นหา `lineUserId` จากฐานข้อมูลส่วนกลางเฉพาะผู้ใช้ที่ลงทะเบียน/พิมพ์เข้ามาใน LINE Account นั้น เพื่อนำไปใช้ส่งข้อความปลายทาง