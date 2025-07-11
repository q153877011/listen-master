import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        message: "未登录" 
      }, { status: 401 });
    }

    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
        role: true,
      }
    });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: "用户不存在" 
      }, { status: 404 });
    }

    // 获取用户活动统计
    const activities = await prisma.userActivity.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        isCorrect: true,
        timeSpent: true,
        created_at: true,
        audio: {
          select: {
            file_name: true,
            folder_name: true,
            original_text: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // 计算统计信息
    const totalActivities = activities.length;
    const correctActivities = activities.filter(a => a.isCorrect).length;
    const accuracy = totalActivities > 0 ? (correctActivities / totalActivities * 100).toFixed(1) : "0";
    
    const totalTimeSpent = activities
      .filter(a => a.timeSpent)
      .reduce((sum, a) => sum + (a.timeSpent || 0), 0);
    const averageTimeSpent = activities.filter(a => a.timeSpent).length > 0 
      ? Math.round(totalTimeSpent / activities.filter(a => a.timeSpent).length) 
      : 0;

    // 计算最近7天的活动
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivities = activities.filter(a => a.created_at >= sevenDaysAgo);

    // 按日期分组统计
    const dailyStats = activities.reduce((acc, activity) => {
      const date = activity.created_at.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { total: 0, correct: 0 };
      }
      acc[date].total++;
      if (activity.isCorrect) {
        acc[date].correct++;
      }
      return acc;
    }, {} as Record<string, { total: number; correct: number }>);

    // 获取最近10次活动
    const recentActivityList = activities.slice(0, 10).map(activity => ({
      id: activity.id,
      isCorrect: activity.isCorrect,
      timeSpent: activity.timeSpent,
      created_at: activity.created_at,
      audioName: activity.audio?.file_name || '未知音频',
      folderName: activity.audio?.folder_name || '未知文件夹',
      originalText: activity.audio?.original_text || '',
    }));

    return NextResponse.json({
      success: true,
      stats: {
        user,
        summary: {
          totalActivities,
          correctActivities,
          accuracy: parseFloat(accuracy),
          totalTimeSpent,
          averageTimeSpent,
          recentActivitiesCount: recentActivities.length,
        },
        dailyStats,
        recentActivityList,
      }
    });

  } catch (error) {
    console.error("获取用户统计信息失败:", error);
    return NextResponse.json({ 
      success: false, 
      message: "服务器内部错误" 
    }, { status: 500 });
  }
} 