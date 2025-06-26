import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import bcrypt from "bcryptjs";

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "邮箱和密码不能为空" },
        { status: 400 }
      );
    }

    const db = (await getCloudflareContext({ async: true })).env.DB;

    // 查找用户
    const { results } = await db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .all();

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 401 }
      );
    }

    const user = results[0] as any;

    // 检查邮箱是否已验证
    if (user.email_verified !== 1) {
      return NextResponse.json(
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
    if (!user.password) {
      return NextResponse.json(
        { success: false, message: "该用户未设置密码，请使用邮箱登录" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "密码错误" },
        { status: 401 }
      );
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      success: true,
      message: "登录成功",
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("登录API错误:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
} 