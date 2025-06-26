"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Message() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await signIn("resend", {
        email,
        redirect: false,
        callbackUrl: "/"
      });
      if (res?.error) {
        setError("登录失败，请检查邮箱或稍后再试。");
      } else {
        setSuccess("登录链接已发送到您的邮箱，请查收。");
      }
    } catch (err) {
      setError("发生未知错误，请稍后再试。");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>登录</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mb-6">
              <Label htmlFor="email" className="block mb-4">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">{success}</div>}
            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? "发送中..." : "发送登录链接"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-xs text-gray-400 text-center">
          登录即表示同意 <a href="#" className="underline">服务条款</a>
        </CardFooter>
      </Card>
    </div>
  );
} 