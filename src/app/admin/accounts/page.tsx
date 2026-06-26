"use client";

import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Switch, Space, Card, Typography, message, Popconfirm, Tag, Collapse } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";

const { Title, Paragraph } = Typography;
const { Panel } = Collapse;

interface LineAccount {
  id: string;
  name: string;
  lineId: string;
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  forwardUrls: string[];
  isActive: boolean;
  createdAt: string;
}

export default function AccountsPage() {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<LineAccount | null>(null);
  const [form] = Form.useForm();

  const isSuperAdmin = !!session?.user?.isSuperAdmin;

  const fetchAccounts = () => {
    setLoading(true);
    fetch("/api/admin/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        message.error("ไม่สามารถดึงข้อมูลบัญชี LINE ได้");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEdit = (record: LineAccount) => {
    setEditingAccount(record);
    form.setFieldsValue({
      ...record,
      forwardUrls: record.forwardUrls && record.forwardUrls.length > 0 ? record.forwardUrls : [""],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const url = editingAccount 
        ? `/api/admin/accounts/${editingAccount.id}` 
        : "/api/admin/accounts";
      const method = editingAccount ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save account");
      }

      message.success(editingAccount ? "อัปเดตบัญชีสำเร็จ" : "เพิ่มบัญชีสำเร็จ");
      setModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      message.success("ลบบัญชีสำเร็จ");
      fetchAccounts();
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
      title: "ชื่อบัญชี",
      dataIndex: "name",
      key: "name",
      className: "text-white font-semibold",
    },
    {
      title: "Basic ID / Channel ID",
      key: "ids",
      render: (_: any, record: LineAccount) => (
        <div>
          <div className="text-white text-xs font-mono">{record.lineId}</div>
          <div className="text-gray-500 text-[10px] font-mono mt-0.5">{record.channelId}</div>
        </div>
      ),
    },
    {
      title: "Webhook Forward URLs",
      dataIndex: "forwardUrls",
      key: "forwardUrls",
      className: "text-white text-xs font-mono max-w-xs",
      render: (urls: string[] | undefined) => {
        if (!urls || urls.length === 0) {
          return <span className="text-gray-600">ไม่ได้ระบุ</span>;
        }
        return (
          <div className="space-y-1">
            {urls.map((url, idx) => (
              <div key={idx} className="truncate max-w-xs text-[11px] text-zinc-300" title={url}>
                • {url}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: "Webhook Gateway Endpoint",
      key: "gateway",
      render: (_: any, record: LineAccount) => {
        const gwUrl = `${window.location.protocol}//${window.location.host}/api/webhooks/line/${record.id}`;
        return (
          <Space>
            <span className="text-line text-xs font-mono select-all truncate max-w-xs">{gwUrl}</span>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(gwUrl)}
              className="text-gray-400 hover:text-line p-0"
            />
          </Space>
        );
      },
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
    ...(isSuperAdmin
      ? [
          {
            title: "จัดการ",
            key: "action",
            render: (_: any, record: LineAccount) => (
              <Space size="middle">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEdit(record)}
                  className="text-blue-400 hover:text-blue-300"
                />
                <Popconfirm
                  title="คุณแน่ใจหรือไม่ที่จะลบบัญชี LINE นี้?"
                  description="การลบข้อมูลจะส่งผลต่อความต่อเนื่องของ Webhook"
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
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Title level={2} className="text-white !mb-1">
            LINE Accounts
          </Title>
          <p className="text-gray-400 text-sm">
            จัดการและตั้งค่า API Credentials ของ LINE OA พร้อมตั้งเป้าหมายการส่งต่อข้อมูล Webhook
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAdd}
            className="bg-line hover:bg-line-hover border-none h-10 font-semibold"
          >
            เพิ่มบัญชี LINE OA
          </Button>
        )}
      </div>

      <Card bordered={false} className="bg-dark-card border border-dark-border">
        <Table
          dataSource={accounts}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="ant-table-dark"
          locale={{ emptyText: "ไม่พบข้อมูลบัญชี LINE" }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* คู่มือและตัวอย่างวิธีใช้งาน */}
      <Card bordered={false} className="bg-dark-card border border-dark-border mt-6">
        <div className="flex items-center gap-2 mb-4 text-line">
          <InfoCircleOutlined className="text-lg" />
          <Title level={4} className="text-white !m-0">
            คู่มือการตั้งค่า Webhook Gateway สำหรับ LINE OA
          </Title>
        </div>

        <Collapse ghost expandIconPosition="end" className="text-gray-300">
          <Panel
            header={<span className="text-gray-200 font-semibold">ขั้นตอนที่ 1: เพิ่ม/ลงทะเบียนบัญชี LINE OA ในระบบ</span>}
            key="step-1"
          >
            <div className="pl-4 text-sm text-gray-400 space-y-2">
              <Paragraph className="text-gray-400">
                คลิกปุ่ม <strong className="text-line font-bold">"เพิ่มบัญชี LINE OA"</strong> ด้านบน แล้วกรอกข้อมูลเชื่อมต่อที่ได้จาก <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer" className="text-line hover:underline font-semibold">LINE Developers Console</a>:
              </Paragraph>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>ชื่อเรียกบัญชี:</strong> สำหรับแยกแยะ เช่น <em>"หลักสูตรปริญญาตรี คณะศึกษาศาสตร์"</em></li>
                <li><strong>LINE Basic ID:</strong> ไอดีของบัญชี LINE OA (เช่น <code>@educ_su</code>)</li>
                <li><strong>Channel ID & Channel Secret:</strong> ดูได้ที่หน้า <em>Basic settings</em> ของ Channel</li>
                <li><strong>Channel Access Token:</strong> สร้างขึ้นมาใหม่จากแท็บ <em>Messaging API settings</em> (เป็นชุดตัวอักษรขนาดยาว)</li>
              </ul>
            </div>
          </Panel>

          <Panel
            header={<span className="text-gray-200 font-semibold">ขั้นตอนที่ 2: ตั้งค่า Webhook URL ใน LINE Developers Console</span>}
            key="step-2"
          >
            <div className="pl-4 text-sm text-gray-400 space-y-2">
              <p>1. ในตารางด้านบน ให้กดปุ่มคัดลอก (Copy Icon) ที่ช่อง <strong>Webhook Gateway Endpoint</strong> ของบัญชีท่าน</p>
              <p>2. ไปที่หน้า <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer" className="text-line hover:underline font-semibold">LINE Developers Console</a> เลือก Channel ของท่าน</p>
              <p>3. ไปที่แท็บ <strong>Messaging API settings</strong> ค้นหาหัวข้อ <strong>Webhook URL</strong></p>
              <p>4. คลิก <strong>Edit</strong> แล้ววาง URL ที่คัดลอกลงไป (เช่น <code>https://line-api.educ-su.work/api/webhooks/line/xxxx-xxxx</code>)</p>
              <p>5. คลิก <strong>Save</strong> จากนั้นกดปุ่ม <strong>Verify</strong> เพื่อทดสอบเชื่อมต่อ (หากตั้งค่าถูกต้องจะขึ้นว่า <span className="text-green-400 font-bold">Success</span>)</p>
              <p className="text-amber-400 font-medium">⚠️ สำคัญมาก: ต้องเปิดใช้งานตัวสวิตช์ "Use webhook" (ให้เป็นสีเขียว/เปิด) ด้วย มิฉะนั้น LINE จะไม่ส่ง Event มาที่ระบบ</p>
            </div>
          </Panel>

          <Panel
            header={<span className="text-gray-200 font-semibold">ขั้นตอนที่ 3: กำหนด Webhook Forward URL (กรณีใช้งานแชทบอทปลายทาง)</span>}
            key="step-3"
          >
            <div className="pl-4 text-sm text-gray-400 space-y-2">
              <Paragraph className="text-gray-400">
                หากภาควิชาหรือหน่วยงานของคุณมีแชทบอทหรือเซิร์ฟเวอร์ย่อยที่เขียนขึ้นมาเพื่อประมวลผลข้อความเองอยู่แล้ว (เช่น ระบบจองห้องพัก, แชทบอทตอบคำถาม):
              </Paragraph>
              <ul className="list-disc pl-6 space-y-1">
                <li>ให้นำลิงก์ Endpoint ของเซิร์ฟเวอร์ย่อยนั้นมากรอกลงในช่อง <strong>Webhook Forward URL (ปลายทาง Chatbot)</strong> ของหน้าจอนี้</li>
                <li>เมื่อมีผู้ใช้แชทเข้ามา ระบบ Gateway ส่วนกลางจะทำหน้าที่บันทึกประวัติ ป้องกันปัญหา Timeout (2 วินาที) ของ LINE และใช้ระบบ Queue ค่อยๆ ยิงส่งต่อ (Forward) Event ไปให้ระบบย่อยของคุณอย่างปลอดภัยและรวดเร็ว</li>
              </ul>
            </div>
          </Panel>
        </Collapse>
      </Card>

      <Modal
        title={
          <span className="text-white font-semibold">
            {editingAccount ? "แก้ไขข้อมูลบัญชี LINE OA" : "เพิ่มบัญชี LINE OA ใหม่"}
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
            name="name"
            label={<span className="text-gray-300">ชื่อเรียกบัญชี (แผนก/ระบบ)</span>}
            rules={[{ required: true, message: "กรุณาระบุชื่อเรียกบัญชี" }]}
          >
            <Input placeholder="ตัวอย่าง: ปริญญาตรี คณะศึกษาศาสตร์" className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 hover:border-zinc-600 focus:border-line" />
          </Form.Item>

          <Form.Item
            name="lineId"
            label={<span className="text-gray-300">LINE Basic ID</span>}
            rules={[{ required: true, message: "กรุณาระบุ LINE Basic ID" }]}
          >
            <Input placeholder="ตัวอย่าง: @educ_bachelor" className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 hover:border-zinc-600 focus:border-line" />
          </Form.Item>

          <Form.Item
            name="channelId"
            label={<span className="text-gray-300">LINE Channel ID</span>}
            rules={[{ required: true, message: "กรุณาระบุ Channel ID" }]}
          >
            <Input placeholder="ตัวอย่าง: 1657890123" className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 hover:border-zinc-600 focus:border-line" />
          </Form.Item>

          <Form.Item
            name="channelSecret"
            label={<span className="text-gray-300">LINE Channel Secret</span>}
            rules={[{ required: true, message: "กรุณาระบุ Channel Secret" }]}
          >
            <Input.Password placeholder="ระบุ Secret คีย์" className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 hover:border-zinc-600 focus:border-line" />
          </Form.Item>

          <Form.Item
            name="channelAccessToken"
            label={<span className="text-gray-300">LINE Channel Access Token</span>}
            rules={[{ required: true, message: "กรุณาระบุ Channel Access Token" }]}
          >
            <Input.TextArea placeholder="ระบุ Access Token แบบยาว" rows={3} className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 hover:border-zinc-600 focus:border-line" />
          </Form.Item>

          <Form.List name="forwardUrls">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Form.Item
                    required={false}
                    key={field.key}
                    label={index === 0 ? <span className="text-gray-300">Webhook Forward URLs (ปลายทาง Chatbots)</span> : ""}
                  >
                    <div className="flex gap-2 items-center">
                      <Form.Item
                        {...field}
                        validateTrigger={["onChange", "onBlur"]}
                        rules={[
                          {
                            required: true,
                            whitespace: true,
                            message: "กรุณาระบุ URL ปลายทาง หรือลบช่องนี้ออก",
                          },
                          {
                            type: "url",
                            message: "รูปแบบ URL ไม่ถูกต้อง",
                          }
                        ]}
                        noStyle
                      >
                        <Input placeholder="ตัวอย่าง: https://chatbot.educ.su.ac.th/api/line" className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 hover:border-zinc-600 focus:border-line flex-1" />
                      </Form.Item>
                      {fields.length > 0 && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                          className="hover:text-red-300 flex-shrink-0"
                        />
                      )}
                    </div>
                  </Form.Item>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    className="w-full bg-zinc-800/40 border-zinc-700 text-zinc-300 hover:text-line hover:border-line"
                  >
                    เพิ่ม Webhook Forward URL
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item
            name="isActive"
            label={<span className="text-gray-300">เปิดใช้งานบัญชี</span>}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
