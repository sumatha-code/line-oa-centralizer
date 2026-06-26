# LINE API EDUC Center - AI Agent Context

**Project Description:** โครงการพัฒนาระบบ LINE API และ Webhook Gateway ส่วนกลาง สำหรับคณะศึกษาศาสตร์ มหาวิทยาลัยศิลปากร ทำหน้าที่เป็นตัวรับ Webhook หลักตัวเดียวของ LINE OA แล้วประมวลผล ส่งต่อ (Forward) หรือจัดคิว (Queue) ไปให้ระบบย่อยต่างๆ ภายในคณะตามกติกาที่กำหนด 

**AI Agent Instructions:**
เมื่อคุณ (AI) ต้องเขียนโค้ด แก้ไข หรือให้คำแนะนำเกี่ยวกับโปรเจกต์นี้ ให้อ่านไฟล์ Context เหล่านี้เพื่อทำความเข้าใจสถาปัตยกรรมและข้อตกลงที่ตัดสินใจไปแล้ว ห้ามคาดเดาหรือเปลี่ยนสถาปัตยกรรมเองโดยไม่ถามผู้ใช้

**Context Routing:**
- สถาปัตยกรรมและ Tech Stack: อ่าน [Architecture.md](./docs/Architecture.md)
- กติกา UI/UX และสี: อ่าน [Design.md](./docs/Design.md)
- โครงสร้างฐานข้อมูล: อ่าน [Database-Schema.md](./docs/Database-Schema.md)
- สเปก API ปลายทาง: อ่าน [API-Docs.md](./docs/API-Docs.md)
- เหตุผลการตัดสินใจของโปรเจกต์: อ่าน [Decisions.md](./docs/Decisions.md)
- ปัญหาที่เคยเจอและต้องระวัง: อ่าน [Gotchas.md](./docs/Gotchas.md)
- ปัญหาของ Line ที่เคยเจอและแนวทางแก้ไข: อ่าน [Line-Integration-Troubleshooting.md](./docs/Line-Integration-Troubleshooting.md)
- แผนงาน: อ่าน [Roadmap.md](./docs/Roadmap.md)