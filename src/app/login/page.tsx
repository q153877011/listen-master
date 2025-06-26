"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface LoginResponse {
  success: boolean;
  message: string;
  user?: any;
  needsVerification?: boolean;
  email?: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loginMode, setLoginMode] = useState<"password" | "magic">("password");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  
  const router = useRouter();
  const { data: session } = useSession();

  // 如果已经登录，重定向到首页
  useEffect(() => {
    if (session) {
      router.push("/");
    }
    
    // 检查是否从邮箱验证页面跳转过来
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified');
    const message = urlParams.get('message');
    
    if (verified === 'true' && message) {
      setSuccess(decodeURIComponent(message));
      // 清理URL参数
      window.history.replaceState({}, '', '/login');
    }
  }, [session, router]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await response.json();

      if (data.success) {
        setSuccess("登录成功，正在跳转...");
        // 使用 NextAuth 创建会话
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: "/"
        });
        
        if (result?.ok) {
          router.push("/");
        } else {
          setError("登录成功，但创建会话失败");
        }
      } else {
        if (data.needsVerification) {
          setNeedsVerification(true);
          setUnverifiedEmail(data.email || email);
        }
        setError(data.message);
      }
    } catch (error) {
      console.error("登录错误:", error);
      setError("登录失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
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
    } catch {
      setError("发生未知错误，请稍后再试。");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail })
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

  const handleSubmit = loginMode === "password" ? handlePasswordLogin : handleMagicLinkLogin;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="mb-8">登录</CardTitle>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setLoginMode("password")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                loginMode === "password"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              密码登录
            </button>
            <button
              type="button"
              onClick={() => setLoginMode("magic")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                loginMode === "magic"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              邮箱登录
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
            
            {loginMode === "password" && (
              <div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>
            )}

            {error && <div className="text-red-600 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">{success}</div>}
            
            {needsVerification && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="text-yellow-800 text-sm">
                  <p className="font-medium">邮箱未验证</p>
                  <p className="mt-1">
                    您的邮箱 <span className="font-medium">{unverifiedEmail}</span> 尚未验证
                  </p>
                  <p className="mt-1">请先验证邮箱后再登录。</p>
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
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !email || (loginMode === "password" && !password)}
            >
              {loading ? "登录中..." : loginMode === "password" ? "登录" : "发送登录链接"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-xs text-gray-400 text-center flex-col space-y-2">
          <div>
            还没有账号？
            <a href="/users/register" className="underline ml-1 text-blue-600 hover:text-blue-800">
              立即注册
            </a>
          </div>
          <div>
            登录即表示同意 <a href="#" className="underline">服务条款</a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 