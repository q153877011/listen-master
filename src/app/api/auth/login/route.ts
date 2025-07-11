import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDatabaseAccess } from "@/lib/db";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  needsVerification?: boolean;
  email?: string;
  user?: Omit<DatabaseUser, 'password' | 'verification_token' | 'verification_token_expires'>;
}

// Database user type - matches the actual database schema
interface DatabaseUser {
  id: string;
  name: string | null;
  email: string;
  password: string | null;
  role: string | null;
  email_verified: number; // SQLite stores booleans as integers
  verification_token: string | null;
  verification_token_expires: string | null;
  emailVerified: string | null; // NextAuth field
  image: string | null;
  created_at?: string;
  updated_at?: string;
}

// Type guard to validate database user result
function isDatabaseUser(obj: unknown): obj is DatabaseUser {
  if (!obj || typeof obj !== 'object') return false;
  
  const user = obj as Record<string, unknown>;
  
  return (
    typeof user.id === 'string' &&
    (user.name === null || typeof user.name === 'string') &&
    typeof user.email === 'string' &&
    (user.password === null || typeof user.password === 'string') &&
    (user.role === null || typeof user.role === 'string') &&
    typeof user.email_verified === 'number' &&
    (user.verification_token === null || typeof user.verification_token === 'string') &&
    (user.verification_token_expires === null || typeof user.verification_token_expires === 'string') &&
    (user.emailVerified === null || typeof user.emailVerified === 'string') &&
    (user.image === null || typeof user.image === 'string')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json<LoginResponse>(
        { success: false, message: "邮箱和密码不能为空" },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json<LoginResponse>(
        { success: false, message: "邮箱和密码必须是字符串" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json<LoginResponse>(
        { success: false, message: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    const db = await getDatabaseAccess();

    // 查找用户
    const userResult = await db.getUserByEmail(email);

    if (!userResult) {
      return NextResponse.json<LoginResponse>(
        { success: false, message: "用户不存在" },
        { status: 401 }
      );
    }

    // Validate the database result
    if (!isDatabaseUser(userResult)) {
      console.error("Invalid user data from database:", userResult);
      return NextResponse.json<LoginResponse>(
        { success: false, message: "用户数据格式错误" },
        { status: 500 }
      );
    }

    const user: DatabaseUser = userResult;

    // 检查邮箱是否已验证
    if (user.email_verified !== 1) {
      return NextResponse.json<LoginResponse>(
        { 
          success: false, 
          message: "邮箱未验证，请先验证您的邮箱地址",
          needsVerification: true,
          email: user.email
        },
        { status: 403 }
      );
    }

    // 验证密码
    if (!user.password || typeof user.password !== 'string') {
      return NextResponse.json<LoginResponse>(
        { success: false, message: "该用户未设置密码，请使用邮箱登录" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json<LoginResponse>(
        { success: false, message: "密码错误" },
        { status: 401 }
      );
    }

    // 返回用户信息（不包含密码和敏感信息）
    const userWithoutPassword: Omit<DatabaseUser, 'password' | 'verification_token' | 'verification_token_expires'> = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      email_verified: user.email_verified,
      emailVerified: user.emailVerified,
      image: user.image,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    
    return NextResponse.json<LoginResponse>({
      success: true,
      message: "登录成功",
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("登录API错误:", error);
    return NextResponse.json<LoginResponse>(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
} 