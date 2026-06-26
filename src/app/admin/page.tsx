"use client";

import React, { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Table, Spin, Alert, Typography } from "antd";
import { CommentOutlined, KeyOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";

const { Title } = Typography;

interface OverviewData {
  accountCount: number;
  keyCount: number;
  recentEvents: Array<{
    id: string;
    eventType: string;
    processedAt: string;
    accountName: string;
    userId: string | null;
    groupId: string | null;
  }>;
}

interface AnalyticsData {
  dailyStats: Array<{ date: string; count: number }>;
  eventTypes: Array<{ type: string; count: number }>;
  apiKeyUsage: Array<{ projectName: string; count: number }>;
}

export default function OverviewPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<OverviewData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/metrics").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch metrics");
        return res.json();
      }),
      fetch("/api/admin/analytics").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      }),
    ])
      .then(([metricsData, analyticsData]) => {
        setData(metricsData);
        setAnalytics(analyticsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="กำลังโหลดข้อมูลแดชบอร์ด..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="เกิดข้อผิดพลาดในการโหลดข้อมูล"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  const columns = [
    {
      title: "Event ID",
      dataIndex: "id",
      key: "id",
      className: "text-white font-mono text-xs",
    },
    {
      title: "LINE Account",
      dataIndex: "accountName",
      key: "accountName",
      className: "text-white",
    },
    {
      title: "Event Type",
      dataIndex: "eventType",
      key: "eventType",
      render: (type: string) => (
        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700 font-medium">
          {type}
        </span>
      ),
    },
    {
      title: "User ID",
      dataIndex: "userId",
      key: "userId",
      className: "text-zinc-400 font-mono text-[11px] max-w-[120px] truncate",
      render: (val: string | null) => val ? (
        <span className="select-all" title={val}>{val}</span>
      ) : (
        <span className="text-zinc-600">-</span>
      ),
    },
    {
      title: "Group ID",
      dataIndex: "groupId",
      key: "groupId",
      className: "text-zinc-400 font-mono text-[11px] max-w-[120px] truncate",
      render: (val: string | null) => val ? (
        <span className="select-all" title={val}>{val}</span>
      ) : (
        <span className="text-zinc-600">-</span>
      ),
    },
    {
      title: "Processed At",
      dataIndex: "processedAt",
      key: "processedAt",
      render: (date: string) => new Date(date).toLocaleString("th-TH"),
      className: "text-gray-400",
    },
  ];

  const formatDateShort = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
    } catch {
      return dateStr;
    }
  };

  const maxDailyCount = Math.max(...(analytics?.dailyStats.map((d) => d.count) || [0]), 1);
  const totalEvents = analytics?.eventTypes.reduce((acc, curr) => acc + curr.count, 0) || 0;
  const totalUsage = analytics?.apiKeyUsage.reduce((acc, curr) => acc + curr.count, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <Title level={2} className="text-white !mb-1">
          ยินดีต้อนรับ, {session?.user?.name}
        </Title>
        <p className="text-gray-400 text-sm">
          นี่คือแดชบอร์ดสรุปผลการทำงานและการประมวลผล Webhook Gateway
        </p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card
            bordered={false}
            className="bg-dark-card border border-dark-border"
          >
            <Statistic
              title={<span className="text-gray-400">LINE Accounts</span>}
              value={data?.accountCount || 0}
              prefix={<CommentOutlined className="text-line mr-2" />}
              valueStyle={{ color: "#fff", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12}>
          <Card
            bordered={false}
            className="bg-dark-card border border-dark-border"
          >
            <Statistic
              title={<span className="text-gray-400">API Keys</span>}
              value={data?.keyCount || 0}
              prefix={<KeyOutlined className="text-amber-500 mr-2" />}
              valueStyle={{ color: "#fff", fontWeight: "bold" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Analytics Visuals */}
      <Row gutter={[16, 16]}>
        {/* Daily Traffic Bar Chart */}
        <Col xs={24} lg={12}>
          <Card
            title={<span className="text-white font-medium">สถิติจำนวน Webhook Events 7 วันย้อนหลัง</span>}
            bordered={false}
            className="bg-dark-card border border-dark-border h-[320px]"
          >
            {analytics && analytics.dailyStats.length > 0 ? (
              <div className="h-48 flex items-end justify-between gap-2 pt-4 px-2">
                {analytics.dailyStats.map((day) => {
                  const pct = (day.count / maxDailyCount) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center group cursor-pointer">
                      {/* Tooltip on hover */}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-zinc-800 text-white text-xs px-2 py-0.5 rounded border border-zinc-700 mb-1 font-mono">
                        {day.count}
                      </span>
                      {/* Bar */}
                      <div
                        className="w-full bg-gradient-to-t from-line/30 to-line hover:from-line/50 hover:to-line-hover transition-all duration-300 rounded-t-md"
                        style={{ height: `${Math.max(pct, 4)}%`, minHeight: "4px" }}
                      />
                      <span className="text-[10px] text-zinc-500 mt-2 text-center whitespace-nowrap">
                        {formatDateShort(day.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
                ไม่พบข้อมูลสถิติรายวัน
              </div>
            )}
          </Card>
        </Col>

        {/* Event Types & Sub-app Share Distribution */}
        <Col xs={24} lg={12}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* Event Distribution */}
            <Card
              title={<span className="text-white font-medium">สัดส่วนประเภท Event (30 วัน)</span>}
              bordered={false}
              className="bg-dark-card border border-dark-border h-[320px]"
              bodyStyle={{ padding: "16px 24px" }}
            >
              {analytics && analytics.eventTypes.length > 0 ? (
                <div className="space-y-4 pt-2 overflow-y-auto max-h-[220px]">
                  {analytics.eventTypes.map((item) => {
                    const pct = totalEvents > 0 ? (item.count / totalEvents) * 100 : 0;
                    return (
                      <div key={item.type} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-300 font-mono font-medium">{item.type}</span>
                          <span className="text-zinc-500 font-mono">{item.count} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-line rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
                  ไม่พบข้อมูลสัดส่วนประเภท Event
                </div>
              )}
            </Card>

            {/* API Key Usage Share */}
            <Card
              title={<span className="text-white font-medium">ส่วนแบ่งการส่งออก Sub-App (30 วัน)</span>}
              bordered={false}
              className="bg-dark-card border border-dark-border h-[320px]"
              bodyStyle={{ padding: "16px 24px" }}
            >
              {analytics && analytics.apiKeyUsage.length > 0 ? (
                <div className="space-y-4 pt-2 overflow-y-auto max-h-[220px]">
                  {analytics.apiKeyUsage.map((item) => {
                    const pct = totalUsage > 0 ? (item.count / totalUsage) * 100 : 0;
                    return (
                      <div key={item.projectName} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-300 font-medium truncate max-w-[100px]">{item.projectName}</span>
                          <span className="text-zinc-500 font-mono">{item.count} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
                  ไม่พบข้อมูลการส่งของ Sub-App
                </div>
              )}
            </Card>
          </div>
        </Col>
      </Row>

      <Card
        title={
          <span className="text-white flex items-center gap-2">
            <CheckCircleOutlined className="text-line" />
            ประวัติการประมวลผล Webhook ล่าสุด (5 รายการล่าสุด)
          </span>
        }
        bordered={false}
        className="bg-dark-card border border-dark-border"
      >
        <Table
          dataSource={data?.recentEvents || []}
          columns={columns}
          rowKey="id"
          pagination={false}
          className="ant-table-dark border-none"
          locale={{ emptyText: "ไม่พบข้อมูลการทำรายการล่าสุด" }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}
