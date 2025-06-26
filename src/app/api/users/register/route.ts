import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getOriginFromRequest } from "@/lib/url-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;
    const name = body?.name;
    const email = body?.email;
    const password = body?.password;
    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: "缺少必要信息" }, { status: 400 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    // 检查邮箱是否已注册
    const { results } = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).all();
    if (results.length > 0) {
      return NextResponse.json({ success: false, message: "该邮箱已注册" }, { status: 409 });
    }

    // 密码加盐哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 生成验证令牌
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期
    
    console.log('Generated verification token:', verificationToken);
    console.log('Token expires at:', expiresAt.toISOString());

    // 生成唯一ID
    const id = crypto.randomUUID();

    // 插入用户（未验证状态）
    const stmt = await db.prepare(
      `INSERT INTO users (id, name, email, password, role, email_verified, verification_token, verification_token_expires) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, name, email, hashedPassword, "user", 0, verificationToken, expiresAt.toISOString());
    await stmt.run();

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
          <p>您好 ${name}，</p>
          <p>感谢您注册我们的服务！请点击下面的链接来验证您的邮箱地址：</p>
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

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.AUTH_RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      });

      if (!emailResponse.ok) {
        console.error('Failed to send verification email');
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    return NextResponse.json({ 
      success: true, 
      message: "注册成功！验证邮件已发送到您的邮箱，请查收并点击验证链接完成注册。",
      needsVerification: true
    });
  } catch (error) {
    console.error("注册接口错误:", error);
    return NextResponse.json({ success: false, message: "服务器错误" }, { status: 500 });
  }
} 