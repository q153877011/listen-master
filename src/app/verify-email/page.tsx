"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// 分离使用 useSearchParams 的组件
function VerifyEmailContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    const success = searchParams.get("success");
    const urlMessage = searchParams.get("message");
    
    if (success === "true") {
      setStatus("success");
      setMessage(urlMessage || "邮箱验证成功！");
      // 启动倒计时
      setCountdown(2);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            router.push("/login");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return;
    }

    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("验证令牌缺失");
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json() as { success: boolean; message: string };

        if (response.ok) {
          setStatus("success");
          setMessage(data.message);
          // 启动倒计时
          setCountdown(2);
          const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                router.push("/login");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setStatus("error");
          setMessage(data.message);
        }
      } catch (error) {
        setStatus("error");
        setMessage("验证失败，请稍后重试");
        console.error(error);
      }
    };

    verifyEmail();
  }, [token, searchParams]);

  const handleGoToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">
            邮箱验证
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === "loading" && (
            <div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">正在验证您的邮箱...</p>
            </div>
          )}

          {status === "success" && (
            <div>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">验证成功！</h3>
              <p className="text-gray-600 mb-4">{message}</p>
              {countdown > 0 && (
                <p className="text-blue-600 text-sm mb-4">
                  {countdown} 秒后自动跳转到登录页面...
                </p>
              )}
              <Button onClick={handleGoToLogin} className="w-full">
                立即前往登录
              </Button>
            </div>
          )}

          {status === "error" && (
            <div>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">验证失败</h3>
              <p className="text-red-600 mb-6">{message}</p>
              <div className="space-y-2">
                <Button onClick={handleGoToLogin} variant="outline" className="w-full">
                  返回登录
                </Button>
                <Button onClick={() => router.push("/users/register")} variant="outline" className="w-full">
                  重新注册
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 加载状态组件
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">
            邮箱验证
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </CardContent>
      </Card>
    </div>
  );
}

// 主页面组件，用 Suspense 包装
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
} 