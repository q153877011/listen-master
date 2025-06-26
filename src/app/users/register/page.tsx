"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

interface RegisterResponse {
  success: boolean;
  message: string;
  needsVerification?: boolean;
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data: RegisterResponse = await res.json();
      if (!res.ok) {
        setError(data.message || "注册失败");
      } else {
        setSuccess(data.message || "注册成功，请登录邮箱验证或直接登录。");
        
        if (data.needsVerification) {
          setNeedsVerification(true);
          setRegisteredEmail(email);
        }
        
        setName("");
        setEmail("");
        setPassword("");
      }
    } catch {
      setError("发生未知错误，请稍后再试。");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!registeredEmail) return;
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail })
      });
      
      const data = await res.json() as { success: boolean; message: string };
      if (res.ok) {
        setSuccess(data.message);
      } else {
        setError(data.message);
      }
    } catch {
      setError("重发验证邮件失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>注册</CardTitle>
        </CardHeader>
        <CardContent>
          {!needsVerification ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="请输入用户名用户名"
                  required
                  disabled={loading}
                />
              </div>
              <div>
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
              <div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  disabled={loading}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading || !name || !email || !password}>
                {loading ? "注册中..." : "注册"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center text-gray-600">
                <h3 className="text-lg font-medium mb-2">注册成功！</h3>
                <p>请查收您的邮箱并完成验证</p>
              </div>
            </div>
          )}
          
          {error && <div className="text-red-600 text-sm mt-4">{error}</div>}
          {success && !needsVerification && <div className="text-green-600 text-sm mt-4">{success}</div>}
          
          {needsVerification && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-4">
              <div className="text-yellow-800 text-sm">
                <p className="font-medium">邮箱验证未完成</p>
                <p className="mt-1">
                  验证邮件已发送到 <span className="font-medium">{registeredEmail}</span>
                </p>
                <p className="mt-1">请查收邮件并点击验证链接完成注册。</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="mt-2"
                  onClick={handleResendVerification}
                  disabled={loading}
                >
                  {loading ? "发送中..." : "重新发送验证邮件"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-gray-400 text-center">
          {!needsVerification ? (
            <>已有账号？<a href="/login" className="underline ml-1">去登录</a></>
          ) : (
            <a href="/login" className="underline">前往登录页面</a>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 