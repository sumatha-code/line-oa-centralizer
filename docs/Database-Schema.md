# Database Schema (PostgreSQL + Drizzle ORM)

*อ้างอิงสำหรับการเขียน Schema ใน Drizzle:*

- `line_accounts`:
  - `id` (uuid, pk, defaultRandom)
  - `name` (varchar) - *เช่น CCTV Service, EDUC News*
  - `lineId` (varchar) - *LINE Basic ID เช่น @cctv_educ*
  - `channelId` (varchar, unique)
  - `channelSecret` (varchar)
  - `channelAccessToken` (varchar)
  - `webhookForwardUrl` (varchar, nullable) - *URL สำหรับส่งต่อ Webhook*
  - `isActive` (boolean, default: true)
  - `createdAt` (timestamp), `updatedAt` (timestamp)

- `admin_whitelist`:
  - `id` (uuid, pk, defaultRandom)
  - `email` (varchar, unique)
  - `createdAt` (timestamp)
  - `createdBy` (varchar) - *อีเมลของผู้ดูแลระบบที่เพิ่มสิทธิ์นี้เข้ามา (Super Admin)*

- `admin_line_accounts` (ความสัมพันธ์แบบ N-to-M ระหว่าง Admin และ LINE Account):
  - `id` (uuid, pk, defaultRandom)
  - `adminId` (uuid, fk -> admin_whitelist.id, onDelete cascade)
  - `lineAccountId` (uuid, fk -> line_accounts.id, onDelete cascade)
  - `createdAt` (timestamp)

- `users` (เก็บโปรไฟล์ผู้ใช้งาน LINE ที่พิมพ์เข้ามา):
  - `id` (uuid, pk, defaultRandom)
  - `lineUserId` (varchar, unique)
  - `displayName` (varchar)
  - `pictureUrl` (varchar, nullable)
  - `createdAt` (timestamp), `updatedAt` (timestamp)

- `groups` (เก็บข้อมูลห้องแชทกลุ่ม LINE ที่บอทเข้าไปอยู่):
  - `id` (uuid, pk, defaultRandom)
  - `lineGroupId` (varchar, unique)
  - `groupName` (varchar, nullable)
  - `createdAt` (timestamp), `updatedAt` (timestamp)

- `webhook_events` (เก็บ Log รายการ Webhook และใช้เช็คซ้ำ):
  - `webhookEventId` (varchar, pk) - *จาก LINE*
  - `lineAccountId` (uuid, fk -> line_accounts.id, onDelete cascade)
  - `eventType` (varchar) - *เช่น message, follow, join*
  - `processedAt` (timestamp, defaultNow)

- `api_keys` (สำหรับเชื่อมต่อระบบย่อย):
  - `id` (uuid, pk, defaultRandom)
  - `keyHash` (varchar, unique)
  - `projectName` (varchar)
  - `isActive` (boolean, default: true)
  - `createdAt` (timestamp)

- `api_key_line_accounts` (ความสัมพันธ์แบบ N-to-M ระหว่าง API Key และ LINE Account ที่อนุญาตให้ใช้):
  - `id` (uuid, pk, defaultRandom)
  - `apiKeyId` (uuid, fk -> api_keys.id, onDelete cascade)
  - `lineAccountId` (uuid, fk -> line_accounts.id, onDelete cascade)
  - `createdAt` (timestamp)

- `usage_logs`:
  - `id` (uuid, pk, defaultRandom)
  - `apiKeyId` (uuid, fk -> api_keys.id, onDelete cascade)
  - `lineAccountId` (uuid, fk -> line_accounts.id, onDelete cascade, nullable) - *LINE Account ที่เรียกใช้งานส่งข้อความ*
  - `endpoint` (varchar)
  - `statusCode` (integer)
  - `createdAt` (timestamp, defaultNow)