import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getOriginFromRequest } from "@/lib/url-utils";

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  needsVerification?: boolean;
}

// Validation helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password: string): boolean {
  // At least 6 characters
  return password.length >= 6;
}

function isValidName(name: string): boolean {
  // At least 1 character, not just whitespace
  return name.trim().length >= 1;
}

// Type guard for request body validation
function isValidRegisterRequest(obj: unknown): obj is RegisterRequest {
  if (!obj || typeof obj !== 'object') return false;
  
  const body = obj as Record<string, unknown>;
  
  return (
    typeof body.name === 'string' &&
    typeof body.email === 'string' &&
    typeof body.password === 'string' &&
    isValidName(body.name) &&
    isValidEmail(body.email) &&
    isValidPassword(body.password)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body structure and content
    if (!isValidRegisterRequest(body)) {
      let errorMessage = "请求数据格式错误";
      
      if (!body || typeof body !== 'object') {
        errorMessage = "请求数据格式错误";
      } else {
        const { name, email, password } = body as Record<string, unknown>;
        
        if (!name || typeof name !== 'string') {
          errorMessage = "用户名不能为空且必须是字符串";
        } else if (!isValidName(name)) {
          errorMessage = "用户名不能为空白字符";
        } else if (!email || typeof email !== 'string') {
          errorMessage = "邮箱不能为空且必须是字符串";
        } else if (!isValidEmail(email)) {
          errorMessage = "邮箱格式不正确";
        } else if (!password || typeof password !== 'string') {
          errorMessage = "密码不能为空且必须是字符串";
        } else if (!isValidPassword(password)) {
          errorMessage = "密码长度至少为6位";
        }
      }
      
      return NextResponse.json<RegisterResponse>(
        { success: false, message: errorMessage },
        { status: 400 }
      );
    }

    const { name, email, password }: RegisterRequest = body;

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    // 检查用户是否已存在
    const { results } = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).all();

    if (results.length > 0) {
      return NextResponse.json<RegisterResponse>(
        { success: false, message: "该邮箱已被注册" },
        { status: 409 }
      );
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 生成验证令牌和过期时间
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    console.log('Generated verification token:', verificationToken);
    console.log('Token expires at:', expiresAt.toISOString());

    // 生成用户ID
    const id = crypto.randomUUID();

    // 创建用户
    const stmt = await db.prepare(
      `INSERT INTO users (id, name, email, password, role, email_verified, verification_token, verification_token_expires)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, name, email, hashedPassword, "user", 0, verificationToken, expiresAt.toISOString());

    const insertResult = await stmt.run();
    
    if (!insertResult.success) {
      console.error('Failed to insert user:', insertResult);
      return NextResponse.json<RegisterResponse>(
        { success: false, message: "创建用户失败，请稍后重试" },
        { status: 500 }
      );
    }

    // 发送验证邮件
    const origin = getOriginFromRequest(request);
    const verificationUrl = `${origin}/api/auth/verify-email?token=${verificationToken}`;

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
        body: JSON.stringify(emailPayload),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Failed to send verification email:', errorText);
        // 注意：即使邮件发送失败，用户也已经创建成功
        return NextResponse.json<RegisterResponse>({
          success: true,
          message: "注册成功，但验证邮件发送失败，请稍后重新发送验证邮件",
          needsVerification: true
        });
      }

      console.log('Verification email sent successfully');
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // 注意：即使邮件发送失败，用户也已经创建成功
      return NextResponse.json<RegisterResponse>({
        success: true,
        message: "注册成功，但验证邮件发送失败，请稍后重新发送验证邮件",
        needsVerification: true
      });
    }

    return NextResponse.json<RegisterResponse>({
      success: true,
      message: "注册成功，请查收验证邮件",
      needsVerification: true
    });

  } catch (error) {
    console.error("注册错误:", error);
    return NextResponse.json<RegisterResponse>(
      { success: false, message: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
} 