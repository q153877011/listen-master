"use client";

import { useState, useEffect } from "react";
import { User } from "@/types/user";
import { Table, Input, Button, MessagePlugin, Popconfirm } from "tdesign-react";
import type { TableProps, PrimaryTableCol } from "tdesign-react";

// TDesign的Table组件是泛型的，我们可以直接指定行数据的类型
const TypedTable = Table as React.FC<TableProps<User>>;

// 骨架屏占位符
function TableSkeleton() {
  return (
    <div className="space-y-2 mt-4">
      <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
      <div className="h-10 bg-gray-300 rounded w-full animate-pulse"></div>
      <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
      <div className="h-10 bg-gray-300 rounded w-full animate-pulse"></div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedUsers, setEditedUsers] = useState<Record<string, Partial<User>>>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchUsers();
  }, []);

  // 获取用户数据
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('获取用户数据失败');
      }
      const data = await response.json() as { success: boolean, users: User[] };
      setUsers(data.users);
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理输入框变化
  const handleInputChange = (value: string, { row, col }: { row: User, col: { colKey: string } }) => {
    const { id } = row;
    const { colKey } = col;
    setEditedUsers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [colKey]: value
      }
    }));
  };

  // 保存单个用户
  const handleSave = async (row: User) => {
    const updatedData = editedUsers[row.id];
    if (!updatedData) {
      MessagePlugin.info('没有需要保存的更改');
      return;
    }

    try {
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, ...updatedData }),
      });

      const result = await response.json() as { success: boolean, message?: string };
      if (result.success) {
        MessagePlugin.success('用户更新成功');
        setEditedUsers(prev => {
            const newEdited = { ...prev };
            delete newEdited[row.id];
            return newEdited;
        });
        fetchUsers();
      } else {
        throw new Error(result.message || '更新失败');
      }
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '更新时发生错误');
    }
  };

  const columns: PrimaryTableCol<User>[] = [
    { colKey: 'id', title: 'ID', width: 150 },
    {
      colKey: 'name',
      title: '姓名',
      cell: ({ row }) => (
        <Input
          value={editedUsers[row.id]?.name ?? row.name ?? ''}
          onChange={(value) => handleInputChange(String(value), { row, col: { colKey: 'name' } })}
          placeholder="请输入姓名"
        />
      ),
    },
    {
      colKey: 'email',
      title: '邮箱',
      cell: ({ row }) => (
        <Input
          value={editedUsers[row.id]?.email ?? row.email ?? ''}
          onChange={(value) => handleInputChange(String(value), { row, col: { colKey: 'email' } })}
          placeholder="请输入邮箱"
        />
      ),
    },
    { colKey: 'image', title: '头像', cell: ({ row }) => row.image ? <img src={row.image} alt="avatar" className="w-8 h-8 rounded-full" /> : null, width: 80 },
    {
      colKey: 'role',
      title: '角色',
      cell: ({ row }) => (
        <Input
          value={editedUsers[row.id]?.role ?? row.role ?? ''}
          onChange={(value) => handleInputChange(String(value), { row, col: { colKey: 'role' } })}
          placeholder="请输入角色"
        />
      ),
    },
    {
      colKey: 'operation',
      title: '操作',
      cell: ({ row }) => (
        <Popconfirm
          content="确认保存当前用户的修改吗？"
          onConfirm={() => handleSave(row)}
        >
          <Button theme="primary" disabled={!editedUsers[row.id]}>保存</Button>
        </Popconfirm>
      ),
      width: 120,
    },
  ];

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">用户列表管理</h1>
      {!isClient ? (
        <TableSkeleton />
      ) : (
        <TypedTable
          rowKey="id"
          data={users}
          columns={columns}
          loading={loading}
          bordered
          stripe
          lazyLoad
        />
      )}
    </main>
  );
} 