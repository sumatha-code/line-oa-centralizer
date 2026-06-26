# Design System & UI Rules

## 🎨 Color Palette
* **LINE Green:** `#06C755` (ใช้สำหรับปุ่มตกลง, สถานะสำเร็จ, สัญลักษณ์ที่เกี่ยวกับ LINE)
* **Faculty Dark Blue:** `#002244` (สีน้ำเงินเข้มประจำคณะ ใช้สำหรับ Sidebar, Header, และ Background Elements)
* **Dark Mode Background:** `#141414` (Ant Design Default Dark)
* **Text/Typography:** ใช้สีขาว (`#FFFFFF`) หรือเทาอ่อน (`#D9D9D9`) บนพื้นหลังเข้ม

## 📐 UI Library (Ant Design + Tailwind)
* ใช้ **Ant Design (ConfigProvider - Dark Algorithm)** เป็นคอมโพเนนต์หลัก (Table, Button, Modal, Form)
* ใช้ **Tailwind CSS** สำหรับการจัดการ Layout (Flexbox, Grid, Margin, Padding) เพื่อความรวดเร็ว ห้ามเขียน Custom CSS ถ้าไม่จำเป็น
* **Responsive Design:** หน้า Dashboard ต้องรองรับการแสดงผลบน Tablet (iPad) เป็นอย่างน้อย (แผงควบคุมมักใช้บนจอใหญ่)
* **Layout:** มี Sidebar ด้านซ้าย (เมนู: Dashboard, LINE Accounts, API Keys, Admins Whitelist, System Logs) และ Topbar (แสดงชื่อผู้ใช้จาก Google Login และปุ่ม Logout)