"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function AdminNavLinks() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  if (!isAdmin) return null;
  return (
    <>
      <span> | </span>
      <Link href="/admin/database-user" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
        用户
      </Link>
      <Link href="/admin/database-audio" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
        音频文件
      </Link>
      <Link href="/admin/upload" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
        上传
      </Link>
    </>
  );
} 