"use client";

import React, { useEffect } from "react";
import { Layout, Menu, Avatar, Button, Spin } from "antd";
import {
  DashboardOutlined,
  CommentOutlined,
  KeyOutlined,
  UserOutlined,
  LogoutOutlined,
  SafetyOutlined,
  HistoryOutlined
} from "@ant-design/icons";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

const { Header, Sider, Content } = Layout;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-dark-bg">
        <Spin size="large" tip="กำลังตรวจสอบสิทธิ์..." />
      </div>
    );
  }

  const isSuperAdmin = !!session?.user?.isSuperAdmin;

  // Build menu items
  const menuItems = [
    {
      key: "/admin",
      icon: <DashboardOutlined />,
      label: "Overview",
    },
    {
      key: "/admin/accounts",
      icon: <CommentOutlined />,
      label: "LINE Accounts",
    },
    {
      key: "/admin/keys",
      icon: <KeyOutlined />,
      label: "API Keys",
    },
    {
      key: "/admin/logs",
      icon: <HistoryOutlined />,
      label: "System Logs",
    },
    ...(isSuperAdmin
      ? [
          {
            key: "/admin/whitelist",
            icon: <SafetyOutlined />,
            label: "Admin Whitelist",
          },
        ]
      : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  // Get active key based on pathname
  let activeKey = "/admin";
  if (pathname.startsWith("/admin/accounts")) activeKey = "/admin/accounts";
  else if (pathname.startsWith("/admin/keys")) activeKey = "/admin/keys";
  else if (pathname.startsWith("/admin/whitelist")) activeKey = "/admin/whitelist";
  else if (pathname.startsWith("/admin/logs")) activeKey = "/admin/logs";

  return (
    <Layout className="min-h-screen bg-dark-bg">
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        className="border-r border-dark-border"
        style={{
          background: "#1f1f1f",
        }}
      >
        <div className="h-16 flex items-center px-6 gap-3 border-b border-dark-border">
          <span className="w-8 h-8 rounded-full bg-line flex items-center justify-center text-white text-xs font-bold">
            LOAC
          </span>
          <span className="text-white font-bold text-sm tracking-wide">
            OA Centralizer
          </span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={handleMenuClick}
          className="pt-4"
          style={{
            background: "#1f1f1f",
          }}
        />
      </Sider>
      
      <Layout style={{ background: "#141414" }}>
        <Header
          className="h-16 px-6 flex items-center justify-between border-b border-dark-border"
          style={{
            background: "#1f1f1f",
          }}
        >
          <div>
            {isSuperAdmin && (
              <span className="px-2.5 py-0.5 bg-red-950/40 text-red-400 text-xs rounded border border-red-900/50 font-medium">
                Super Admin
              </span>
            )}
            {!isSuperAdmin && (
              <span className="px-2.5 py-0.5 bg-blue-950/40 text-blue-400 text-xs rounded border border-blue-900/50 font-medium">
                Whitelisted Admin
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={session?.user?.image}
                icon={<UserOutlined />}
                className="border border-dark-border flex-shrink-0"
              />
              <div className="hidden sm:flex flex-col text-right max-w-[150px] md:max-w-[200px]" style={{ lineHeight: "normal" }}>
                <div className="text-white text-xs font-semibold truncate" title={session?.user?.name || ""}>
                  {session?.user?.name}
                </div>
                <div className="text-gray-500 text-[10px] mt-1 truncate" title={session?.user?.email || ""}>
                  {session?.user?.email}
                </div>
              </div>
            </div>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-gray-400 hover:text-red-400"
            />
          </div>
        </Header>
        
        <Content className="p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
