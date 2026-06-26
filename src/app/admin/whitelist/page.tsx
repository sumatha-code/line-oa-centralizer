"use client";

import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Space, Card, Typography, message, Popconfirm, Tag, Select, Result } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";

const { Title } = Typography;

interface LineAccountInfo {
  id: string;
  name: string;
}

interface WhitelistAdmin {
  id: string;
  email: string;
  createdBy: string;
  createdAt: string;
  accounts: LineAccountInfo[];
}

export default function WhitelistPage() {
  const { data: session } = useSession();
  const [admins, setAdmins] = useState<WhitelistAdmin[]>([]);
  const [accounts, setAccounts] = useState<LineAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<WhitelistAdmin | null>(null);
  const [form] = Form.useForm();

  const isSuperAdmin = !!session?.user?.isSuperAdmin;

  const fetchAdmins = () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    fetch("/api/admin/whitelist")
      .then((res) => res.json())
      .then((data) => {
        setAdmins(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        message.error("ไม่สามารถดึงข้อมูล Whitelist ได้");
        setLoading(false);
      });
  };

  const fetchAccounts = () => {
    if (!isSuperAdmin) return;
    fetch("/api/admin/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.filter((acc: any) => acc.isActive));
      })
      .catch((err) => console.error("Error fetching accounts:", err));
  };

  useEffect(() => {
    fetchAdmins();
    fetchAccounts();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <Result
        status="403"
        title={<span className="text-white font-bold">403 Forbidden</span>}
        subTitle={<span className="text-gray-400">ขออภัย คุณไม่มีสิทธิ์เข้าถึงหน้าจอนี้ เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้น</span>}
      />
    );
  }

  const handleOpenAdd = () => {
    setEditingAdmin(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEdit = (record: WhitelistAdmin) => {
    setEditingAdmin(record);
    form.setFieldsValue({
      email: record.email,
      lineAccountIds: record.accounts.map((acc) => acc.id),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const url = editingAdmin
        ? `/api/admin/whitelist/${editingAdmin.id}`
        : "/api/admin/whitelist";
      const method = editingAdmin ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save whitelisted admin");
      }

      message.success(editingAdmin ? "อัปเดตสิทธิ์ผู้ดูแลระบบสำเร็จ" : "เพิ่มผู้ดูแลระบบเข้า Whitelist สำเร็จ");
      setModalOpen(false);
      fetchAdmins();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/whitelist/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove from whitelist");
      }

      message.success("ลบผู้ดูแลระบบออกจาก Whitelist สำเร็จ");
      fetchAdmins();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || "เกิดข้อผิดพลาดในการลบ");
    }
  };

  const columns = [
    {
      title: "อีเมลผู้ดูแลระบบ (Google OAuth)",
      dataIndex: "email",
      key: "email",
      className: "text-white font-semibold",
    },
    {
      title: "ขอบเขตบัญชี LINE Accounts ที่สามารถบริหารจัดการได้",
      dataIndex: "accounts",
      key: "accounts",
      render: (mappedAccounts: LineAccountInfo[]) => (
        <Space size={[0, 4]} wrap>
          {mappedAccounts.map((acc) => (
            <Tag key={acc.id} color="blue">
              {acc.name}
            </Tag>
          ))}
          {mappedAccounts.length === 0 && (
            <span className="text-gray-600 text-xs">เข้าใช้งานไม่ได้ (กรุณาเลือกบัญชีที่อนุญาต)</span>
          )}
        </Space>
      ),
    },
    {
      title: "ผู้เพิ่มรายการ",
      dataIndex: "createdBy",
      key: "createdBy",
      className: "text-gray-400",
    },
    {
      title: "วันที่ลงทะเบียน",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString("th-TH"),
      className: "text-gray-400",
    },
    {
      title: "จัดการ",
      key: "action",
      render: (_: any, record: WhitelistAdmin) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
            className="text-blue-400 hover:text-blue-300"
          />
          <Popconfirm
            title="คุณแน่ใจที่จะลบผู้ดูแลระบบคนนี้?"
            description="ผู้ใช้คนนี้จะไม่สามารถล็อกอินเข้าสู่ระบบ Admin Panel นี้ได้อีกต่อไป"
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
            Admin Whitelist
          </Title>
          <p className="text-gray-400 text-sm">
            จัดการรายชื่อผู้ที่มีสิทธิ์ล็อกอินเข้าสู่ระบบ (Whitelist) และกำหนดขอบเขตบัญชี LINE Accounts ที่ได้รับอนุญาต
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAdd}
          className="bg-line hover:bg-line-hover border-none h-10 font-semibold"
        >
          เพิ่มผู้ใช้เข้า Whitelist
        </Button>
      </div>

      <Card bordered={false} className="bg-dark-card border border-dark-border">
        <Table
          dataSource={admins}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="ant-table-dark"
          locale={{ emptyText: "ไม่พบข้อมูลใน Whitelist" }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Modal to Add Admin */}
      <Modal
        title={
          <span className="text-white font-semibold flex items-center gap-2">
            <SafetyOutlined className="text-line" />
            {editingAdmin ? "แก้ไขผู้ดูแลระบบใน Whitelist" : "เพิ่มผู้ดูแลระบบใน Whitelist"}
          </span>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="ยืนยันการเพิ่ม"
        cancelText="ยกเลิก"
        destroyOnClose
        okButtonProps={{ className: "bg-line hover:bg-line-hover border-none" }}
      >
        <Form
          form={form}
          layout="vertical"
          className="pt-4"
        >
          <Form.Item
            name="email"
            label={<span className="text-gray-300">อีเมล Gmail หรืออีเมลองค์กร Google (@su.ac.th)</span>}
            rules={[
              { required: true, message: "กรุณาระบุอีเมล" },
              { type: "email", message: "กรุณาระบุรูปแบบอีเมลที่ถูกต้อง" }
            ]}
          >
            <Input placeholder="ตัวอย่าง: somchai_s@su.ac.th" className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 hover:border-zinc-600 focus:border-line" />
          </Form.Item>

          <Form.Item
            name="lineAccountIds"
            label={<span className="text-gray-300">ขอบเขต LINE Accounts ที่อนุญาตให้จัดการ</span>}
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
        </Form>
      </Modal>
    </div>
  );
}
