"use client";

import React, { useEffect } from "react";
import { Button, Spin } from "antd";
import { LoginOutlined, DashboardOutlined } from "@ant-design/icons";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Automatically redirect to /admin if logged in
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/admin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-dark-bg p-6">
        <Spin size="large" tip="กำลังโหลด..." />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dark-bg p-6">
      <div className="max-w-md w-full bg-dark-card border border-dark-border p-8 rounded-2xl shadow-xl text-center space-y-6">
        <div className="flex justify-center">
          <span className="w-16 h-16 rounded-full bg-line flex items-center justify-center text-white text-xl font-bold">
            LINE
          </span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Line OA Centralizer</h1>
          <p className="text-gray-400 text-sm">
            ระบบจัดการ Webhook และ API Gateway ส่วนกลางสำหรับ LINE Official Accounts
          </p>
        </div>
        
        <div className="pt-4">
          {session ? (
            <Button
              type="primary"
              size="large"
              icon={<DashboardOutlined />}
              onClick={() => router.push("/admin")}
              className="w-full bg-line hover:bg-line-hover border-none h-12 text-base font-semibold"
            >
              ไปยังหน้า Dashboard
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              icon={<LoginOutlined />}
              onClick={() => signIn("google", { callbackUrl: "/admin" })}
              className="w-full bg-line hover:bg-line-hover border-none h-12 text-base font-semibold"
            >
              เข้าสู่ระบบด้วย Google Account
            </Button>
          )}
        </div>
        
        <div className="text-xs text-gray-500 pt-4 border-t border-dark-border">
          © 2026 Faculty of Education, Silpakorn University
        </div>
      </div>
    </main>
  );
}
