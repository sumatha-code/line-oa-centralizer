"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Table, Card, Typography, Space, Select, Input, Switch, Button, Tag, Row, Col, Alert, Spin } from "antd";
import { SearchOutlined, ReloadOutlined, WarningOutlined, ApiOutlined, CommentOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";

const { Title } = Typography;

interface LogEntry {
  id: string;
  endpoint: string;
  statusCode: number;
  createdAt: string;
  projectName: string;
  accountName: string | null;
}

interface LineAccountOption {
  id: string;
  name: string;
}

interface ApiKeyOption {
  id: string;
  projectName: string;
}

export default function LogsPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<LineAccountOption[]>([]);
  const [keys, setKeys] = useState<ApiKeyOption[]>([]);

  // Filter States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [lineAccountId, setLineAccountId] = useState<string | undefined>(undefined);
  const [apiKeyId, setApiKeyId] = useState<string | undefined>(undefined);
  const [errorOnly, setErrorOnly] = useState(false);

  // Fetch LINE accounts options
  const fetchAccounts = useCallback(() => {
    fetch("/api/admin/accounts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAccounts(data.filter((acc) => acc.isActive));
        }
      })
      .catch((err) => console.error("Error fetching accounts:", err));
  }, []);

  // Fetch API Keys options
  const fetchKeys = useCallback(() => {
    fetch("/api/admin/keys")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setKeys(data.filter((k) => k.isActive));
        }
      })
      .catch((err) => console.error("Error fetching API keys:", err));
  }, []);

  // Fetch Logs list
  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (search.trim()) params.append("search", search.trim());
    if (lineAccountId) params.append("lineAccountId", lineAccountId);
    if (apiKeyId) params.append("apiKeyId", apiKeyId);
    if (errorOnly) params.append("errorOnly", "true");

    fetch(`/api/admin/logs?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch logs");
        return res.json();
      })
      .then((resData) => {
        setLogs(resData.data || []);
        setTotal(resData.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [page, pageSize, search, lineAccountId, apiKeyId, errorOnly]);

  useEffect(() => {
    fetchAccounts();
    fetchKeys();
  }, [fetchAccounts, fetchKeys]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleReset = () => {
    setSearch("");
    setLineAccountId(undefined);
    setApiKeyId(undefined);
    setErrorOnly(false);
    setPage(1);
  };

  const columns = [
    {
      title: "วัน-เวลา (ประวัติ)",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleString("th-TH"),
      className: "text-gray-400 text-xs w-[180px]",
    },
    {
      title: "Sub-App / Project",
      dataIndex: "projectName",
      key: "projectName",
      render: (name: string) => (
        <span className="text-white font-medium flex items-center gap-1.5">
          <ApiOutlined className="text-amber-500 text-xs" />
          {name}
        </span>
      ),
      className: "w-[160px] truncate",
    },
    {
      title: "LINE OA",
      dataIndex: "accountName",
      key: "accountName",
      render: (name: string | null) => name ? (
        <span className="text-white flex items-center gap-1.5">
          <CommentOutlined className="text-line text-xs" />
          {name}
        </span>
      ) : (
        <span className="text-zinc-600">-</span>
      ),
      className: "w-[160px] truncate",
    },
    {
      title: "API Endpoint Called",
      dataIndex: "endpoint",
      key: "endpoint",
      className: "text-zinc-300 font-mono text-xs max-w-xs truncate",
    },
    {
      title: "Status Code",
      dataIndex: "statusCode",
      key: "statusCode",
      render: (status: number) => {
        const isError = status >= 400;
        return (
          <Tag color={isError ? "red" : "green"} className="font-mono">
            {isError && <WarningOutlined className="mr-1" />}
            {status}
          </Tag>
        );
      },
      className: "w-[110px]",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Title level={2} className="text-white !mb-1">
            System Logs
          </Title>
          <p className="text-gray-400 text-sm">
            ประวัติการส่งข้อมูลของ Sub-Apps ย่อยทั้งหมดพร้อมข้อมูลคีย์รับส่งและสถานะ
          </p>
        </div>
        <Button
          type="default"
          icon={<ReloadOutlined />}
          onClick={fetchLogs}
          className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white"
        >
          รีโหลดประวัติ
        </Button>
      </div>

      {/* Filter Control Box */}
      <Card bordered={false} className="bg-dark-card border border-dark-border">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Input
              placeholder="ค้นหา Endpoint หรือโปรเจกต์..."
              prefix={<SearchOutlined className="text-zinc-500" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              allowClear
              className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 hover:border-zinc-600 focus:border-line"
            />
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="เลือกกรองบัญชี LINE OA..."
              value={lineAccountId}
              onChange={(val) => {
                setLineAccountId(val);
                setPage(1);
              }}
              allowClear
              className="w-full bg-zinc-800 border-zinc-700 text-white"
              dropdownStyle={{ background: "#1f1f1f" }}
              options={accounts.map((acc) => ({
                label: acc.name,
                value: acc.id,
              }))}
            />
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="เลือกกรอง API Key..."
              value={apiKeyId}
              onChange={(val) => {
                setApiKeyId(val);
                setPage(1);
              }}
              allowClear
              className="w-full bg-zinc-800 border-zinc-700 text-white"
              dropdownStyle={{ background: "#1f1f1f" }}
              options={keys.map((k) => ({
                label: k.projectName,
                value: k.id,
              }))}
            />
          </Col>

          <Col xs={24} md={6} className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-xs">แสดงเฉพาะ Error:</span>
              <Switch
                checked={errorOnly}
                onChange={(checked) => {
                  setErrorOnly(checked);
                  setPage(1);
                }}
                className="bg-zinc-700"
              />
            </div>
            <Button
              type="text"
              onClick={handleReset}
              className="text-zinc-400 hover:text-white text-xs ml-auto sm:ml-0"
            >
              ล้างตัวกรอง
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Logs Table */}
      <Card bordered={false} className="bg-dark-card border border-dark-border">
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps || 10);
            },
            className: "text-zinc-400",
          }}
          className="ant-table-dark"
          locale={{ emptyText: "ไม่พบข้อมูลประวัติประมวลผลที่ตรงเงื่อนไข" }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}
