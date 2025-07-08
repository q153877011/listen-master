"use client";

import React, { useState, useEffect } from 'react';
import { AudioResult } from '@/types/audio';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AudioPage() {
  const [files, setFiles] = useState<AudioResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedMissText, setEditedMissText] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fetchAudioFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/audio');
      const data = await response.json() as { success: boolean; files: AudioResult[]; message?: string };
      if (data.success) {
        setFiles(data.files);
      } else {
        throw new Error(data.message || '获取音频文件失败');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '加载失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudioFiles();
  }, []);

  const handleMissTextChange = (id: string, value: string) => {
    setEditedMissText(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSaveMissText = async (id: string) => {
    const miss_text = editedMissText[id];
    if (miss_text === undefined) {
        setMessage({ type: 'info', text: '没有需要保存的更改' });
        return;
    }

    try {
      const response = await fetch('/api/audio/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, miss_text }),
      });
      const result = await response.json() as { success: boolean; message?: string };
      if (result.success) {
        setMessage({ type: 'success', text: '缺失文本更新成功' });
        // 更新本地数据，显示最新保存的内容
        setFiles(prev => prev.map(file => 
          file.id === id ? { ...file, miss_text: miss_text } : file
        ));
        // 清除编辑状态，这样按钮会变为禁用状态
        setEditedMissText(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      } else {
        throw new Error(result.message || '更新失败');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    }
  };

  if (loading) {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">音频文件列表</h1>
            <p>加载中...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">音频文件列表</h1>
      {message && (
        <div className={`p-4 mb-4 rounded-md ${
          message.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
          message.type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
          'bg-blue-100 border border-blue-400 text-blue-700'
        }`}>
          {message.text}
          <button 
            onClick={() => setMessage(null)}
            className="ml-4 text-sm underline"
          >
            关闭
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <div key={file.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{file.file_name}</h2>
              <span className="text-sm text-gray-500">{formatFileSize(file.file_size)}</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">文件夹: {file.folder_name}</p>
              <audio controls className="w-full">
                <source src={file.audio_path} type="audio/flac" />
                Your browser does not support the audio element.
              </audio>
              {file.text && (
                <div className="mt-2">
                  <h3 className="text-sm font-medium">原文:</h3>
                  <p className="text-sm text-gray-700">{file.text}</p>
                </div>
              )}
              {file.chinese && (
                <div className="mt-2">
                  <h3 className="text-sm font-medium">中文:</h3>
                  <p className="text-sm text-gray-700">{file.chinese}</p>
                </div>
              )}
                <div className="mt-2">
                  <h3 className="text-sm font-medium">缺失文本:</h3>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editedMissText[file.id] ?? file.miss_text ?? ''}
                  onChange={(e) => handleMissTextChange(file.id, e.target.value)}
                  placeholder="编辑缺失文本"
                />
                <button 
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={() => handleSaveMissText(file.id)}
                  disabled={editedMissText[file.id] === undefined}
                >
                  保存
                </button>
                </div>
              <p className="text-xs text-gray-400 mt-2">
                上传时间: {new Date(file.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}