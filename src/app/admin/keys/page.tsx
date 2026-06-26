"use client";

import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Switch, Space, Card, Typography, message, Popconfirm, Tag, Select, Alert, Tabs } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, KeyOutlined, InfoCircleOutlined, CodeOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

interface LineAccountInfo {
  id: string;
  name: string;
}

interface ApiKey {
  id: string;
  projectName: string;
  keyHash: string;
  isActive: boolean;
  createdAt: string;
  accounts: LineAccountInfo[];
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [accounts, setAccounts] = useState<LineAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState<{ rawKey: string; projectName: string } | null>(null);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [form] = Form.useForm();
  const [apiHost, setApiHost] = useState("line-api.educ-su.work");

  const fetchKeys = () => {
    setLoading(true);
    fetch("/api/admin/keys")
      .then((res) => res.json())
      .then((data) => {
        setKeys(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        message.error("ไม่สามารถดึงข้อมูล API Keys ได้");
        setLoading(false);
      });
  };

  const fetchAccounts = () => {
    fetch("/api/admin/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.filter((acc: any) => acc.isActive));
      })
      .catch((err) => console.error("Error fetching accounts:", err));
  };

  useEffect(() => {
    fetchKeys();
    fetchAccounts();
    if (typeof window !== "undefined") {
      setApiHost(window.location.host);
    }
  }, []);

  const handleOpenAdd = () => {
    setEditingKey(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEdit = (record: ApiKey) => {
    setEditingKey(record);
    form.setFieldsValue({
      projectName: record.projectName,
      isActive: record.isActive,
      lineAccountIds: record.accounts.map((acc) => acc.id),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const url = editingKey 
        ? `/api/admin/keys/${editingKey.id}` 
        : "/api/admin/keys";
      const method = editingKey ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save API key");
      }

      setModalOpen(false);

      if (!editingKey && data.rawKey) {
        // If created new key, show raw key once
        setCreatedKeyData({
          rawKey: data.rawKey,
          projectName: data.projectName,
        });
      } else {
        message.success("อัปเดต API Key สำเร็จ");
      }
      
      fetchKeys();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/keys/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete API key");
      }

      message.success("ลบ API Key สำเร็จ");
      fetchKeys();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || "เกิดข้อผิดพลาดในการลบ");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success("คัดลอกไปยังคลิปบอร์ดแล้ว");
  };

  const columns = [
    {
      title: "ชื่อโปรเจกต์ / ระบบย่อย",
      dataIndex: "projectName",
      key: "projectName",
      className: "text-white font-semibold",
    },
    {
      title: "Key Hash (SHA-256)",
      dataIndex: "keyHash",
      key: "keyHash",
      className: "text-gray-400 font-mono text-xs max-w-xs truncate",
      render: (hash: string) => hash.substring(0, 16) + "...",
    },
    {
      title: "สิทธิ์การเข้าถึง LINE Accounts",
      dataIndex: "accounts",
      key: "accounts",
      render: (mappedAccounts: LineAccountInfo[]) => (
        <Space size={[0, 4]} wrap>
          {mappedAccounts.map((acc) => (
            <Tag key={acc.id} color="cyan">
              {acc.name}
            </Tag>
          ))}
          {mappedAccounts.length === 0 && (
            <span className="text-gray-600 text-xs">ไม่มีบัญชีที่ผูกไว้</span>
          )}
        </Space>
      ),
    },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      key: "isActive",
      render: (active: boolean) =>
        active ? (
          <Tag color="success">ใช้งานปกติ</Tag>
        ) : (
          <Tag color="error">ระงับการใช้งาน</Tag>
        ),
    },
    {
      title: "สร้างเมื่อ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString("th-TH"),
      className: "text-gray-400",
    },
    {
      title: "จัดการ",
      key: "action",
      render: (_: any, record: ApiKey) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
            className="text-blue-400 hover:text-blue-300"
          />
          <Popconfirm
            title="คุณแน่ใจที่จะลบ API Key นี้?"
            description="แอปย่อยที่ใช้คีย์นี้จะไม่สามารถยิงส่งข้อความได้อีกต่อไป"
            onConfirm={() => handleDelete(record.id)}
            okText="ยืนยันการลบ"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              className="hover:text-red-300"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Title level={2} className="text-white !mb-1">
            API Keys
          </Title>
          <p className="text-gray-400 text-sm">
            จัดการ API Token สำหรับแอปพลิเคชันย่อย เพื่อส่ง Push/Reply Message ไปยัง LINE OA อย่างปลอดภัย
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAdd}
          className="bg-line hover:bg-line-hover border-none h-10 font-semibold"
        >
          สร้าง API Key ใหม่
        </Button>
      </div>

      <Card bordered={false} className="bg-dark-card border border-dark-border">
        <Table
          dataSource={keys}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="ant-table-dark"
          locale={{ emptyText: "ไม่พบข้อมูล API Key" }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* คู่มือวิธีใช้และตัวอย่างการส่งข้อความ */}
      <Card bordered={false} className="bg-dark-card border border-dark-border mt-6">
        <div className="flex items-center gap-2 mb-4 text-line">
          <CodeOutlined className="text-lg" />
          <Title level={4} className="text-white !m-0">
            คู่มือการใช้งาน API Key และตัวอย่างการเชื่อมต่อ
          </Title>
        </div>

        <div className="text-gray-300 space-y-4 text-sm">
          <Paragraph className="text-gray-400">
            เมื่อท่านทำการสร้าง API Key สำเร็จแล้ว ท่านสามารถนำ API Key ดังกล่าวไปใช้ในการสั่งให้ระบบย่อยส่งข้อความ (Push/Reply Message) ไปยังผู้ใช้ผ่าน LINE OA ที่ได้รับอนุญาตได้ทันที โดยเชื่อมต่อไปยัง Gateway ส่วนกลางตามรายละเอียดดังนี้:
          </Paragraph>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800 space-y-2">
              <div className="text-gray-200 font-semibold flex items-center gap-2">
                <InfoCircleOutlined className="text-line" /> ข้อมูล Endpoint การส่งข้อความ
              </div>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li><strong>Method:</strong> <Tag color="success">POST</Tag></li>
                <li>
                  <strong>URL:</strong> <code className="text-line font-mono break-all">{`https://${apiHost}/api/internal/messages/send`}</code>
                </li>
                <li>
                  <strong>HTTP Header:</strong> <code className="text-white font-mono break-all">X-EDUC-Hub-Token: &lt;API_KEY&gt;</code>
                </li>
                <li>
                  <strong>Content-Type:</strong> <code className="text-white font-mono">application/json</code>
                </li>
              </ul>
            </div>

            <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800 space-y-2 text-xs text-gray-400">
              <div className="text-gray-200 font-semibold text-sm flex items-center gap-2 text-amber-400">
                ⚠️ ข้อควรระวังความปลอดภัย
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li>API Key จะแสดงผลเพียงแค่ครั้งเดียวตอนสร้างเสร็จ หากทำสูญหายจะไม่สามารถกู้คืนได้ (ต้องสร้างคีย์ใหม่ทดแทน)</li>
                <li>ห้ามนำ API Key ไปฝังไว้ในโค้ดฝั่ง Client-side (เช่น React/Next.js/Vue ที่รันบนเบราว์เซอร์ของยูสเซอร์) ให้ใช้เรียกผ่านฝั่ง Server-side (Backend) เท่านั้น เพื่อป้องกันการดักขโมยคีย์</li>
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-gray-200 font-semibold mb-2">ตัวอย่างซอร์สโค้ดการยิง API (Code Examples):</div>
            <Tabs
              defaultActiveKey="curl"
              className="ant-tabs-dark"
              items={[
                {
                  key: "curl",
                  label: "cURL (Bash/Terminal)",
                  children: (
                    <pre className="bg-zinc-900 p-4 rounded text-gray-300 font-mono text-xs overflow-x-auto select-all leading-relaxed whitespace-pre-wrap">
{`curl -X POST https://${apiHost}/api/internal/messages/send \\
  -H "Content-Type: application/json" \\
  -H "X-EDUC-Hub-Token: YOUR_API_KEY" \\
  -d '{
    "lineAccountId": "System UUID ของ LINE Account (ไม่ใช่ Basic/Channel ID คัดลอกได้จากใต้ชื่อบัญชีในหน้า LINE Accounts)",
    "to": "LINE_USER_ID_ผู้รับ (ขึ้นต้นด้วย Uxxxxxxxx)",
    "messages": [
      {
        "type": "text",
        "text": "ข้อความทดสอบแจ้งเตือนจากระบบย่อย"
      }
    ]
  }'`}
                    </pre>
                  ),
                },
                {
                  key: "nodejs",
                  label: "Node.js (Fetch)",
                  children: (
                    <pre className="bg-zinc-900 p-4 rounded text-gray-300 font-mono text-xs overflow-x-auto select-all leading-relaxed whitespace-pre-wrap">
{`// ตัวอย่างการใช้ใน Node.js 18+ หรือเบราว์เซอร์ผ่าน Backend
const sendNotification = async () => {
  try {
    const response = await fetch("https://${apiHost}/api/internal/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-EDUC-Hub-Token": "YOUR_API_KEY" // ระบุ API Key ที่ได้จากระบบ
      },
      body: JSON.stringify({
        lineAccountId: "System UUID ของ LINE Account (ไม่ใช่ Basic/Channel ID คัดลอกได้จากใต้ชื่อบัญชีในหน้า LINE Accounts)",
        to: "LINE_USER_ID_ผู้รับ (เช่น U1234567890abcdef...)",
        messages: [
          {
            "type": "text",
            "text": "ข้อความแจ้งเตือนจากระบบ"
          }
        ]
      })
    });

    const data = await response.json();
    console.log("Response:", data);
  } catch (error) {
    console.error("Error sending message:", error);
  }
};`}
                    </pre>
                  ),
                },
                {
                  key: "python",
                  label: "Python (Requests)",
                  children: (
                    <pre className="bg-zinc-900 p-4 rounded text-gray-300 font-mono text-xs overflow-x-auto select-all leading-relaxed whitespace-pre-wrap">
{`import requests

url = "https://${apiHost}/api/internal/messages/send"
headers = {
    "Content-Type": "application/json",
    "X-EDUC-Hub-Token": "YOUR_API_KEY"
}
payload = {
    "lineAccountId": "System UUID ของ LINE Account (ไม่ใช่ Basic/Channel ID คัดลอกได้จากใต้ชื่อบัญชีในหน้า LINE Accounts)",
    "to": "LINE_USER_ID_ผู้รับ (เช่น U1234567890abcdef...)",
    "messages": [
        {
            "type": "text",
            "text": "ข้อความแจ้งเตือนจากระบบย่อย"
        }
    ]
}

try:
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    print("Success:", response.json())
except requests.exceptions.RequestException as e:
    print("Error:", e)`}
                    </pre>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Modal for CRUD */}
      <Modal
        title={
          <span className="text-white font-semibold">
            {editingKey ? "แก้ไขข้อมูล API Key" : "สร้าง API Key ใหม่"}
          </span>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="บันทึก"
        cancelText="ยกเลิก"
        destroyOnClose
        okButtonProps={{ className: "bg-line hover:bg-line-hover border-none" }}
      >
        <Form
          form={form}
          layout="vertical"
          className="pt-4"
          initialValues={{ isActive: true }}
        >
          <Form.Item
            name="projectName"
            label={<span className="text-gray-300">ชื่อโปรเจกต์ / ระบบย่อยปลายทาง</span>}
            rules={[{ required: true, message: "กรุณาระบุชื่อโปรเจกต์" }]}
          >
            <Input placeholder="ตัวอย่าง: ระบบ CCTV คณะศึกษาศาสตร์" className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 hover:border-zinc-600 focus:border-line" />
          </Form.Item>

          <Form.Item
            name="lineAccountIds"
            label={<span className="text-gray-300">บัญชี LINE Accounts ที่อนุญาตให้ใช้คีย์นี้</span>}
            rules={[{ required: true, message: "กรุณาเลือกอย่างน้อยหนึ่งบัญชี" }]}
          >
            <Select
              mode="multiple"
              placeholder="เลือกบัญชี LINE OA..."
              className="bg-zinc-800 border-zinc-700 text-white hover:border-zinc-600"
              dropdownStyle={{ background: "#1f1f1f" }}
              options={accounts.map((acc) => ({
                label: acc.name,
                value: acc.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label={<span className="text-gray-300">เปิดใช้งานคีย์</span>}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal to display newly created raw API Key */}
      <Modal
        title={
          <span className="text-line font-bold flex items-center gap-2">
            <KeyOutlined />
            สร้าง API Key สำเร็จ
          </span>
        }
        open={!!createdKeyData}
        onOk={() => setCreatedKeyData(null)}
        onCancel={() => setCreatedKeyData(null)}
        cancelButtonProps={{ style: { display: "none" } }}
        okText="ปิดหน้าจอและบันทึกคีย์เรียบร้อย"
        okButtonProps={{ className: "bg-line hover:bg-line-hover border-none" }}
        destroyOnClose
        closable={false}
        maskClosable={false}
      >
        <div className="space-y-4 pt-2">
          <Alert
            message="กรุณาคัดลอกและบันทึกคีย์นี้เก็บไว้ทันที!"
            description="ระบบจะแสดงคีย์ดิบนี้เพียงแค่ 'ครั้งเดียว' เท่านั้น และจะไม่สามารถเรียกกลับมาดูได้อีกด้วยเหตุผลด้านความปลอดภัย"
            type="warning"
            showIcon
          />
          <div>
            <Text className="text-gray-400 block text-xs">คีย์สำหรับโปรเจกต์: {createdKeyData?.projectName}</Text>
            <div className="flex items-center gap-2 mt-2 p-3 bg-zinc-800 rounded border border-zinc-700">
              <span className="text-white font-mono text-sm select-all break-all flex-1">
                {createdKeyData?.rawKey}
              </span>
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => createdKeyData && copyToClipboard(createdKeyData.rawKey)}
                className="text-gray-400 hover:text-line"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
