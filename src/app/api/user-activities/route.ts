import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateActivityRequest {
  audioId: string;
  isCorrect: boolean;
  userAnswer?: string;
  correctAnswer?: string;
  completedAt?: string;
  timeSpent?: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    console.log("用户活动 API - Session 信息:", {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : []
    });
    
    if (!session?.user?.id) {
      console.log("用户活动 API - 用户未登录");
      return NextResponse.json({ 
        success: false, 
        message: "未登录" 
      }, { status: 401 });
    }

    const body: CreateActivityRequest = await request.json();
    const { audioId, isCorrect, userAnswer, correctAnswer, completedAt, timeSpent } = body;

    // 验证必要字段
    if (!audioId) {
      return NextResponse.json({ 
        success: false, 
        message: "音频ID不能为空" 
      }, { status: 400 });
    }

    // 验证音频是否存在
    const audio = await prisma.audio.findUnique({
      where: { id: audioId }
    });

    if (!audio) {
      return NextResponse.json({ 
        success: false, 
        message: "音频不存在" 
      }, { status: 404 });
    }

    // 创建用户活动记录
    const activity = await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        audioId,
        isCorrect,
        userAnswer,
        correctAnswer,
        completedAt: completedAt ? new Date(completedAt) : null,
        timeSpent,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        audio: {
          select: {
            id: true,
            file_name: true,
            folder_name: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "活动记录创建成功",
      activity
    });

  } catch (error) {
    console.error("创建用户活动记录失败:", error);
    return NextResponse.json({ 
      success: false, 
      message: "服务器内部错误" 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        message: "未登录" 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 获取用户的练习记录
    const activities = await prisma.userActivity.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        audio: {
          select: {
            id: true,
            file_name: true,
            folder_name: true,
            miss_text: true,
            original_text: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit,
      skip: offset,
    });

    // 获取总数
    const total = await prisma.userActivity.count({
      where: {
        userId: session.user.id,
      }
    });

    return NextResponse.json({
      success: true,
      activities,
      total,
      limit,
      offset
    });

  } catch (error) {
    console.error("获取用户活动记录失败:", error);
    return NextResponse.json({ 
      success: false, 
      message: "服务器内部错误" 
    }, { status: 500 });
  }
} 