import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import crypto from 'crypto';
import { getOriginFromRequest } from "@/lib/url-utils";

interface VerificationRequest {
  email: string;
}

interface VerificationResponse {
  success: boolean;
  message: string;
}

// Database user type for verification - only the fields we need
interface DatabaseUserForVerification {
  id: string;
  name: string | null;
  email: string;
  email_verified: number; // SQLite stores booleans as integers
}

// Type guard to validate database user result
function isDatabaseUserForVerification(obj: unknown): obj is DatabaseUserForVerification {
  if (!obj || typeof obj !== 'object') return false;
  
  const user = obj as Record<string, unknown>;
  
  return (
    typeof user.id === 'string' &&
    (user.name === null || typeof user.name === 'string') &&
    typeof user.email === 'string' &&
    typeof user.email_verified === 'number'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json<VerificationResponse>(
        { success: false, message: "请求数据格式错误" },
        { status: 400 }
      );
    }

    const { email } = body as { email?: unknown };

    // Validate email field
    if (!email) {
      return NextResponse.json<VerificationResponse>(
        { success: false, message: "邮箱地址不能为空" },
        { status: 400 }
      );
    }

    if (typeof email !== 'string') {
      return NextResponse.json<VerificationResponse>(
        { success: false, message: "邮箱地址必须是字符串" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json<VerificationResponse>(
        { success: false, message: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext({ async: true });

    // 查找用户
    const { results } = await env.DB
      .prepare("SELECT id, name, email, email_verified FROM users WHERE email = ?")
      .bind(email)
      .all();

    if (results.length === 0) {
      return NextResponse.json<VerificationResponse>(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    // Validate the database result
    const userResult = results[0];
    if (!isDatabaseUserForVerification(userResult)) {
      console.error("Invalid user data from database:", userResult);
      return NextResponse.json<VerificationResponse>(
        { success: false, message: "用户数据格式错误" },
        { status: 500 }
      );
    }

    const user: DatabaseUserForVerification = userResult;

    if (user.email_verified === 1) {
      return NextResponse.json<VerificationResponse>(
        { success: false, message: "邮箱已经验证过了" },
        { status: 400 }
      );
    }

    // 生成验证令牌
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    // 更新用户验证令牌
    await env.DB
      .prepare(`
        UPDATE users 
        SET verification_token = ?, verification_token_expires = ? 
        WHERE id = ?
      `)
      .bind(verificationToken, expiresAt.toISOString(), user.id)
      .run();

    // 发送验证邮件
    const origin = getOriginFromRequest(request);
    const verificationUrl = `${origin}/api/auth/verify-email?token=${verificationToken}`;
    console.log('Verification URL:', verificationUrl);

    const emailPayload = {
      from: env.AUTH_EMAIL_FROM,
      to: email,
      subject: '验证您的邮箱地址',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">验证您的邮箱地址</h2>
          <p>您好 ${user.name || '用户'}，</p>
          <p>感谢您注册 listen-master 的服务！请点击下面的链接来验证您的邮箱地址：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              验证邮箱
            </a>
          </div>
          <p>或者您可以复制以下链接到浏览器中打开：</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
            ${verificationUrl}
          </p>
          <p style="color: #666; font-size: 14px;">
            此链接将在24小时后过期。如果您没有注册我们的服务，请忽略此邮件。
          </p>
        </div>
      `
    };

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.AUTH_RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Failed to send verification email:', errorText);
      throw new Error('Failed to send email');
    }

    return NextResponse.json<VerificationResponse>({
      success: true,
      message: "验证邮件已发送，请查收您的邮箱"
    });

  } catch (error) {
    console.error("发送验证邮件错误:", error);
    return NextResponse.json<VerificationResponse>(
      { success: false, message: "发送验证邮件失败，请稍后重试" },
      { status: 500 }
    );
  }
} 