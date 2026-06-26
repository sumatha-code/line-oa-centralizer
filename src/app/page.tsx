"use client";

import React from "react";
import { Button } from "antd";
import { LoginOutlined } from "@ant-design/icons";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dark-bg p-6">
      <div className="max-w-md w-full bg-dark-card border border-dark-border p-8 rounded-2xl shadow-xl text-center space-y-6">
        <div className="flex justify-center">
          <span className="w-16 h-16 rounded-full bg-line flex items-center justify-center text-white text-xl font-bold">
            LINE
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">LINE API EDUC Center</h1>
          <p className="text-gray-400 text-sm">
            ระบบจัดการ Webhook และ API Gateway ส่วนกลาง คณะศึกษาศาสตร์ มหาวิทยาลัยศิลปากร
          </p>
        </div>
        <div className="pt-4">
          <Button
            type="primary"
            size="large"
            icon={<LoginOutlined />}
            className="w-full bg-line hover:bg-line-hover border-none h-12 text-base font-semibold"
          >
            เข้าสู่ระบบ Admin Panel
          </Button>
        </div>
        <div className="text-xs text-gray-500 pt-4 border-t border-dark-border">
          © 2026 Faculty of Education, Silpakorn University
        </div>
      </div>
    </main>
  );
}
