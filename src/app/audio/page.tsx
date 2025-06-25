import React from 'react';
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { AudioRecord, AudioResult } from '@/types/audio';

async function getAudioFiles(): Promise<AudioResult[]> {
  const db = (await getCloudflareContext({ async: true })).env.DB;
  const { results } = await db.prepare(`
    SELECT 
      id, text, audio_path, file_size, folder_name, file_name,
      miss_text, chinese, original_text, created_at
    FROM audio
    ORDER BY created_at DESC
  `).all<AudioRecord>();

  return results.map((result: AudioRecord): AudioResult => ({
    id: String(result.id),
    text: result.text,
    audio_path: String(result.audio_path),
    file_size: Number(result.file_size),
    folder_name: String(result.folder_name),
    file_name: String(result.file_name),
    miss_text: result.miss_text,
    chinese: result.chinese,
    original_text: result.original_text,
    created_at: String(result.created_at)
  }));
}

export default async function AudioPage() {
  const files = await getAudioFiles();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">音频文件列表</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file: AudioResult) => (
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
              {file.miss_text && (
                <div className="mt-2">
                  <h3 className="text-sm font-medium">缺失文本:</h3>
                  <p className="text-sm text-gray-700">{file.miss_text}</p>
                </div>
              )}
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}