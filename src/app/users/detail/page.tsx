'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

interface UserStats {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    created_at: string;
    role: string | null;
  };
  summary: {
    totalActivities: number;
    correctActivities: number;
    accuracy: number;
    totalTimeSpent: number;
    averageTimeSpent: number;
    recentActivitiesCount: number;
  };
  dailyStats: Record<string, { total: number; correct: number }>;
  recentActivityList: Array<{
    id: string;
    isCorrect: boolean;
    timeSpent: number | null;
    created_at: string;
    audioName: string;
    folderName: string;
    originalText: string;
  }>;
}

interface StatsResponse {
  success: boolean;
  message: string;
  stats?: UserStats;
}

export default function UserDetailPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      setError('请先登录');
      setLoading(false);
      return;
    }

    fetchUserStats();
  }, [status]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/stats');
      const data: StatsResponse = await response.json();
      
      if (data.success && data.stats) {
        setStats(data.stats);
      } else {
        setError(data.message || '获取数据失败');
      }
    } catch (error) {
      console.error('获取用户统计信息失败:', error);
      setError('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">用户详情</h1>
          <p className="text-gray-600 mb-4">{error || '请先登录'}</p>
          <Link href="/users/login">
            <Button>去登录</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center">
          <p className="text-gray-600">暂无数据</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 用户基本信息 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">用户名</p>
              <p className="font-medium">{stats.user.name || '未设置'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">邮箱</p>
              <p className="font-medium">{stats.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">注册时间</p>
              <p className="font-medium">{formatDate(stats.user.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">用户角色</p>
              <p className="font-medium">{stats.user.role === 'admin' ? '管理员' : '普通用户'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总练习次数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.summary.totalActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">正确率</p>
                <p className="text-2xl font-bold text-gray-900">{stats.summary.accuracy}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均用时</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.summary.averageTimeSpent > 0 ? formatTime(stats.summary.averageTimeSpent) : '0秒'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">最近7天</p>
                <p className="text-2xl font-bold text-gray-900">{stats.summary.recentActivitiesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近活动 */}
      <Card>
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivityList.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无活动记录</p>
          ) : (
            <div className="space-y-4">
              {stats.recentActivityList.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${activity.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-medium">
                        {activity.originalText ? (
                          <span className="text-gray-700">{activity.originalText}</span>
                        ) : (
                          activity.audioName
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{activity.folderName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {activity.timeSpent ? formatTime(activity.timeSpent) : '未记录'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
