import { getCloudflareContext } from "@opennextjs/cloudflare";
import React from "react";
import { User } from "@/types/user";

// 将页面标记为动态渲染
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getAllUsers(): Promise<User[]> {
  const db = (await getCloudflareContext({ async: true })).env.DB;
  const { results } = await db.prepare("SELECT * FROM users").all<User>();
  return results;
}

export default async function UsersPage() {
  const users = await getAllUsers();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">用户列表</h1>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-4 py-2">ID</th>
            <th className="border px-4 py-2">姓名</th>
            <th className="border px-4 py-2">邮箱</th>
            <th className="border px-4 py-2">头像</th>
            <th className="border px-4 py-2">角色</th>
            <th className="border px-4 py-2">密码（加盐后）</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="border px-4 py-2">{user.id}</td>
              <td className="border px-4 py-2">{user.name}</td>
              <td className="border px-4 py-2">{user.email}</td>
              <td className="border px-4 py-2">
                {user.image && (
                  <img src={user.image} alt="avatar" className="w-8 h-8 rounded-full" />
                )}
              </td>
              <td className="border px-4 py-2">{user.role || '-'}</td>
              <td className="border px-4 py-2">{user.password ? <span className="break-all">{user.password}</span> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
} 