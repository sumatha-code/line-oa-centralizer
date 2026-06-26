"use client";

import React from "react";
import { ConfigProvider, theme } from "antd";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#06C755", // LINE Green
          colorBgBase: "#141414", // Dark Mode Background
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
