import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getOriginFromRequest } from "@/lib/url-utils";

const prisma = new PrismaClient();

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
}

// Validation functions
function isValidName(name: string): boolean {
  return name.trim().length > 0;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

function isValidRegisterRequest(data: unknown): data is RegisterRequest {
  if (!data || typeof data !== 'object') return false;
  
  const { name, email, password } = data as Record<string, unknown>;
  
  return (
    typeof name === 'string' &&
    typeof email === 'string' &&
    typeof password === 'string'
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

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
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
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "user",
        verification_token: verificationToken,
        verification_expires: verificationExpires,
      },
    });

    if (!user) {
      return NextResponse.json<RegisterResponse>(
        { success: false, message: "创建用户失败，请稍后重试" },
        { status: 500 }
      );
    }

    // 发送验证邮件
    const origin = getOriginFromRequest(request);
    const verificationUrl = `${origin}/api/auth/verify-email?token=${verificationToken}`;
    
    let emailSent = false;
    try {
      // 动态引入 Resend，避免 dev 环境报错
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.AUTH_RESEND_KEY);
      
      console.log('正在发送验证邮件到:', email);
      console.log('使用的发件人:', process.env.AUTH_EMAIL_FROM);
      
      await resend.emails.send({
        from: process.env.AUTH_EMAIL_FROM!,
        to: email,
        subject: '验证您的邮箱地址',
        html: `
          <div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif;">
            <h2 style="color:#333;text-align:center;">验证您的邮箱地址</h2>
            <p>您好 ${name}，</p>
            <p>感谢您注册我们的服务！请点击下面的链接来验证您的邮箱地址：</p>
            <div style="text-align:center;margin:30px 0;">
              <a href="${verificationUrl}" style="background-color:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">验证邮箱</a>
            </div>
            <p>或者您可以复制以下链接到浏览器中打开：</p>
            <p style="word-break:break-all;background-color:#f5f5f5;padding:10px;border-radius:4px;">${verificationUrl}</p>
            <p style="color:#666;font-size:14px;">此链接将在24小时后过期。如果您没有注册我们的服务，请忽略此邮件。</p>
          </div>
        `
      });
      
      emailSent = true;
      console.log('验证邮件发送成功');
    } catch (emailError) {
      console.error('发送验证邮件失败:', emailError);
      // 邮件发送失败，返回错误信息
      return NextResponse.json<RegisterResponse>(
        { 
          success: false, 
          message: "注册成功，但验证邮件发送失败，请检查邮箱配置或稍后重试" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json<RegisterResponse>(
      { success: true, message: "注册成功，请查收验证邮件" },
      { status: 201 }
    );

  } catch (error) {
    console.error("注册用户时出错:", error);
    return NextResponse.json<RegisterResponse>(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
} 