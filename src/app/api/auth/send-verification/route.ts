import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import crypto from 'crypto';
import { getOriginFromRequest } from "@/lib/url-utils";

interface VerificationRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const { email }: VerificationRequest = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "邮箱地址不能为空" },
        { status: 400 }
      );
    }

    // 查找用户
    const { results } = await env.DB
      .prepare("SELECT id, name, email, email_verified FROM users WHERE email = ?")
      .bind(email)
      .all();

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    const user = results[0] as any;

    if (user.email_verified === 1) {
      return NextResponse.json(
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
          <p>您好 ${user.name}，</p>
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
      throw new Error('Failed to send email');
    }

    return NextResponse.json({
      success: true,
      message: "验证邮件已发送，请查收您的邮箱"
    });

  } catch (error) {
    console.error("发送验证邮件错误:", error);
    return NextResponse.json(
      { success: false, message: "发送验证邮件失败，请稍后重试" },
      { status: 500 }
    );
  }
} 