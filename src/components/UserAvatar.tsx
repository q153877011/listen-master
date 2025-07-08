'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface UserAvatarProps {
  user?: User;
}

export default function UserAvatar({ user }: UserAvatarProps) {
  // 所有 hooks 必须在组件顶部调用，不能在条件语句中
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAvatarClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleUserInfo = () => {
    setIsDropdownOpen(false);
    // 跳转到用户信息页面
    window.location.href = '/';
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    try {
      // 使用 NextAuth 的 signOut 函数
      await signOut({
        redirect: true,
        callbackUrl: '/users/login' // 注销后跳转到登录页
      });
    } catch (error) {
      console.error('注销失败:', error);
      // 如果 NextAuth 注销失败，尝试手动清理
      try {
        // 清除可能存在的本地存储
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
          
          // 手动跳转到登录页
          window.location.href = '/users/login';
        }
      } catch (fallbackError) {
        console.error('手动注销也失败:', fallbackError);
      }
    }
  };

  // 生成用户名首字母作为头像
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  // 所有 hooks 调用完毕后，再进行条件渲染
  // 如果用户未登录，显示登录按钮
  if (status === 'loading') {
    return (
      <div className="flex items-center">
        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center space-x-2">
        <a
          href="/users/login"
          className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
        >
          登录
        </a>
      </div>
    );
  }

  // 使用会话数据或传入的用户数据
  const currentUser = user || {
    id: session?.user?.id || '1',
    name: session?.user?.name || '用户',
    email: session?.user?.email || 'user@example.com',
    avatar: session?.user?.image || ''
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 用户头像和名称 */}
      <div 
        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
        onClick={handleAvatarClick}
      >
        {/* 头像 */}
        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
          {currentUser.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(currentUser.name)
          )}
        </div>
        
        {/* 用户名 */}
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {currentUser.name}
        </span>
        
        {/* 下拉箭头 */}
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* 下拉菜单 */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* 用户信息部分 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium">
                {currentUser.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(currentUser.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentUser.name}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>
          </div>

          {/* 菜单选项 */}
          <div className="py-1">
            <button
              onClick={handleUserInfo}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>用户信息</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>注销</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 