import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getOriginFromRequest } from "@/lib/url-utils";

interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

// Database user type for email verification - only the fields we need
interface DatabaseUserForEmailVerification {
  id: string;
  email: string;
  verification_token: string | null;
  verification_token_expires: string | null;
  email_verified: number; // SQLite stores booleans as integers
}

// Type guard to validate database user result
function isDatabaseUserForEmailVerification(obj: unknown): obj is DatabaseUserForEmailVerification {
  if (!obj || typeof obj !== 'object') return false;
  
  const user = obj as Record<string, unknown>;
  
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    (user.verification_token === null || typeof user.verification_token === 'string') &&
    (user.verification_token_expires === null || typeof user.verification_token_expires === 'string') &&
    typeof user.email_verified === 'number'
  );
}

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Validate token parameter
    if (!token) {
      return NextResponse.json<VerifyEmailResponse>(
        { success: false, message: "验证令牌缺失" },
        { status: 400 }
      );
    }

    if (typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json<VerifyEmailResponse>(
        { success: false, message: "验证令牌格式无效" },
        { status: 400 }
      );
    }

    console.log('Verifying token:', token);

    // 查找用户
    const { results } = await env.DB
      .prepare(`
        SELECT id, email, verification_token, verification_token_expires, email_verified
        FROM users 
        WHERE verification_token = ?
      `)
      .bind(token)
      .all();

    console.log('Query results:', results);

    if (results.length === 0) {
      return NextResponse.json<VerifyEmailResponse>(
        { success: false, message: "验证令牌无效" },
        { status: 400 }
      );
    }

    // Validate the database result
    const userResult = results[0];
    if (!isDatabaseUserForEmailVerification(userResult)) {
      console.error("Invalid user data from database:", userResult);
      return NextResponse.json<VerifyEmailResponse>(
        { success: false, message: "用户数据格式错误" },
        { status: 500 }
      );
    }

    const user: DatabaseUserForEmailVerification = userResult;
    console.log('Found user:', { 
      id: user.id, 
      email: user.email, 
      email_verified: user.email_verified,
      token_expires: user.verification_token_expires
    });

    // 检查令牌是否过期
    if (user.verification_token_expires) {
      const expiresDate = new Date(user.verification_token_expires);
      const now = new Date();
      
      if (isNaN(expiresDate.getTime())) {
        console.error("Invalid expiration date format:", user.verification_token_expires);
        return NextResponse.json<VerifyEmailResponse>(
          { success: false, message: "验证令牌数据格式错误" },
          { status: 500 }
        );
      }
      
      if (expiresDate < now) {
        return NextResponse.json<VerifyEmailResponse>(
          { success: false, message: "验证令牌已过期，请重新申请验证邮件" },
          { status: 400 }
        );
      }
    }

    // 检查是否已经验证过
    if (user.email_verified === 1) {
      return NextResponse.json<VerifyEmailResponse>(
        { success: false, message: "邮箱已经验证过了" },
        { status: 400 }
      );
    }

    // 更新用户验证状态
    await env.DB
      .prepare(`
        UPDATE users 
        SET email_verified = 1, 
            emailVerified = datetime('now'),
            verification_token = NULL, 
            verification_token_expires = NULL 
        WHERE id = ?
      `)
      .bind(user.id)
      .run();

    // 返回带有延迟跳转的HTML页面
    const origin = getOriginFromRequest(request);
    
    const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>邮箱验证成功</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                margin: 0;
                padding: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #f9fafb;
            }
            .container {
                text-align: center;
                background: white;
                padding: 3rem 2rem;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                max-width: 400px;
                width: 90%;
            }
            .success-icon {
                width: 64px;
                height: 64px;
                margin: 0 auto 1.5rem;
                background-color: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .checkmark {
                width: 32px;
                height: 32px;
                stroke: white;
                stroke-width: 3;
                fill: none;
            }
            .title {
                color: #065f46;
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
            }
            .message {
                color: #6b7280;
                margin-bottom: 1.5rem;
                line-height: 1.5;
            }
            .countdown {
                color: #374151;
                font-weight: 500;
            }
            .loading {
                margin-top: 1rem;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 0.5rem;
            }
            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #10b981;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">
                <svg class="checkmark" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4"/>
                </svg>
            </div>
            <h1 class="title">邮箱验证成功！</h1>
            <p class="message">您的邮箱已成功验证，现在可以登录了。</p>
            <div class="countdown">
                <span id="countdown">2</span> 秒后自动跳转到登录页面...
            </div>
            <div class="loading">
                <div class="spinner"></div>
                <span>正在跳转...</span>
            </div>
        </div>
        
        <script>
            let countdown = 2;
            const countdownElement = document.getElementById('countdown');
            
            const timer = setInterval(() => {
                countdown--;
                countdownElement.textContent = countdown;
                
                if (countdown <= 0) {
                    clearInterval(timer);
                    window.location.href = '${origin}/login?verified=true&message=${encodeURIComponent("邮箱验证成功！您现在可以登录了。")}';
                }
            }, 1000);
        </script>
    </body>
    </html>
    `;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error("邮箱验证错误:", error);
    return NextResponse.json<VerifyEmailResponse>(
      { success: false, message: "验证失败，请稍后重试" },
      { status: 500 }
    );
  }
} 