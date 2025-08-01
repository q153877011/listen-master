'use client';

import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from 'tdesign-react/lib/'; // 按需引入无样式组件代码

interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  folder: string;
  file?: File;
}

interface UploadResponse {
  success: boolean;
  message: string;
  results: Array<{
    success: boolean;
    file: string;
    id?: string;
    url?: string;
    error?: string;
  }>;
}

export default function UploadPage() {
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [textList, setTextList] = useState<{id: string, content: string}[]>([]);
  const [chineseList, setChineseList] = useState<{id: string, content: string}[]>([]);
  const [missTextList, setMissTextList] = useState<{id: string, content: string}[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number}>({current: 0, total: 0});
  const [uploadResults, setUploadResults] = useState<Array<{
    success: boolean;
    file: string;
    id?: string;
    url?: string;
    error?: string;
  }>>([]);

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function parseTextData(textInput: string) {
    const parsedData = [];
    // 移除整体文本的开头和结尾的空白符，然后按行分割
    const lines = textInput.trim().split('\n');

    for (const line of lines) {
        // 跳过空行或只包含空白符的行
        if (!line.trim()) {
            continue;
        }

        // 使用 match() 方法和正则表达式来匹配ID和内容
        // ^(\S+) 匹配行首的一个或多个非空白字符 (作为ID)
        // \s+ 匹配一个或多个空白字符 (ID和内容之间的分隔符)
        // (.*)$ 匹配剩余的所有字符直到行尾 (作为内容)
        const match = line.match(/^(\S+)\s+(.*)$/);

        if (match && match.length === 3) {
            const itemId = match[1]; // 第一个捕获组是ID
            const content = match[2]; // 第二个捕获组是内容
            parsedData.push({
                id: itemId,
                content: content
            });
        } else {
            // 如果某行不符合预期格式，可以打印警告或进行其他处理
            console.warn(`警告: 发现格式不正确的行，已跳过: '${line}'`);
        }
    }
    return parsedData;
}
  
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList) return;

    Array.from(fileList)
    .filter(file => file.name.toLowerCase().endsWith('.txt'))
    .map(file => {
      console.log(file.name);
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsedData = parseTextData(text);
        
        // 根据文件名确定文本类型
        const fileName = file.name.toLowerCase();
        if (fileName.includes('original.txt')) {
          setTextList(parsedData);
        } else if (fileName.includes('chinese.txt')) {
          setChineseList(parsedData);
        } else if (fileName.includes('misstext.txt')) {
          setMissTextList(parsedData);
        }
      };
      reader.onerror = (e) => {
        console.error('Error reading file:', e);
      };
    });
    
    const fileInfos: FileInfo[] = Array.from(fileList)
      .filter(file => file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.flac'))
      .map(file => {
        const pathParts = file.name.split('/');
        console.log(pathParts[pathParts.length - 1]);
        return {
          name: pathParts[pathParts.length - 1].split('.')[0],
          text: textList.filter(item => pathParts[pathParts.length - 1].includes(item.id))?.[0]?.content || '',
          chinese: chineseList.filter(item => pathParts[pathParts.length - 1].includes(item.id))?.[0]?.content || '',
          miss_text: missTextList.filter(item => pathParts[pathParts.length - 1].includes(item.id))?.[0]?.content || '',
          path: file.name,
          size: file.size,
          type: file.type || 'audio/flac',
          folder: pathParts[pathParts.length - 2] || 'unknown',
          file: file
        };
      });

    setFiles(fileInfos);
    setStatus('');
    setError('');
  }

  const handleUpload = async () => {
    if (!files.length) return;

    try {
      setUploading(true);
      setUploadProgress({current: 0, total: files.length});
      setUploadResults([]);
      const formData = new FormData();

      // 添加音频文件
      files.forEach((file) => {
        if (file.file) {
          formData.append('folder', file.file);
        }
      });

      // 添加文本数据
      if (textList.length > 0) {
        const textData = textList.reduce((acc, item) => {
          acc[item.id] = item.content;
          return acc;
        }, {} as Record<string, string>);
        formData.append('text', JSON.stringify(textData));
      }

      if (chineseList.length > 0) {
        const chineseData = chineseList.reduce((acc, item) => {
          acc[item.id] = item.content;
          return acc;
        }, {} as Record<string, string>);
        formData.append('chinese', JSON.stringify(chineseData));
      }

      if (missTextList.length > 0) {
        const missTextData = missTextList.reduce((acc, item) => {
          acc[item.id] = item.content;
          return acc;
        }, {} as Record<string, string>);
        formData.append('miss_text', JSON.stringify(missTextData));
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json() as UploadResponse;

      if (!result.success) {
        throw new Error(result.message || '上传失败');
      }

      // 更新上传结果
      setUploadResults(result.results);
      setUploadProgress({current: result.results.length, total: files.length});

      const successCount = result.results.filter(r => r.success).length;
      toast.success(`成功上传 ${successCount} 个文件到 COS`);
      console.log('上传结果:', result);
      
      // 清空文件列表
      setFiles([]);
      setTextList([]);
      setChineseList([]);
      setMissTextList([]);
          } catch (error) {
        console.error('Upload error:', error);
        toast.error(error instanceof Error ? error.message : '上传失败');
        setUploadProgress({current: 0, total: 0});
      } finally {
        setUploading(false);
      }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (files.length === 0) {
      setError('请选择音频文件');
      return;
    }

    setUploading(true);
    setStatus('上传中...');
    setError('');

    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json() as UploadResponse;
      
      if (result.success) {
        setStatus(`成功处理 ${result.results.length} 个音频文件`);
        // 清空文件列表和表单
        setFiles([]);
        formRef.current?.reset();
      } else {
        setError(result.message || '上传失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传出错');
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">上传音频文件</h1>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="folder" className="block text-sm font-medium mb-2">
            选择文件夹
          </label>
          <input
            type="file"
            id="folder"
            name="folder"
            onChange={handleFileChange}
            {...{
              webkitdirectory: "",
              directory: ""
            }}
            multiple
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">待上传文件 ({files.length})</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        文件名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        文件夹
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        类型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        大小
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {files.map((file, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {file.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.folder}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {file.type.split('/')[1].toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(file.size)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-4">
          <Button
            type="submit"
            theme="primary"
            disabled={uploading || files.length === 0}
            loading={uploading}
          >
            {uploading ? '上传中...' : '上传'}
          </Button>

          <Button
            theme="primary"
            variant="outline"
            disabled={uploading || files.length === 0}
            onClick={handleUpload}
          >
            解析文本
          </Button>
        </div>

        {/* 上传进度显示 */}
        {uploading && uploadProgress.total > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-700">
                上传进度: {uploadProgress.current}/{uploadProgress.total}
              </span>
              <span className="text-sm text-blue-600">
                {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 上传结果显示 */}
        {uploadResults.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">上传结果 ({uploadResults.length})</h2>
              <Button
                theme="primary"
                variant="outline"
                onClick={() => setUploadResults([])}
              >
                清除结果
              </Button>
            </div>
            <div className="space-y-3">
              {uploadResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        result.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {result.file}
                      </h3>
                      {result.success && result.url && (
                        <div className="mt-2">
                          <p className="text-sm text-green-600 mb-1">COS URL:</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={result.url}
                              readOnly
                              className="flex-1 text-xs p-2 bg-white border border-green-300 rounded"
                            />
                            <Button
                              theme="primary"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(result.url!);
                                toast.success('URL 已复制到剪贴板');
                              }}
                            >
                              复制
                            </Button>
                          </div>
                        </div>
                      )}
                      {!result.success && result.error && (
                        <p className="text-sm text-red-600 mt-1">
                          错误: {result.error}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      {result.success ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          成功
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          失败
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
      
      {status && (
        <div className="mt-4 p-4 bg-green-50 text-green-700 rounded">
          {status}
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}
    </main>
  );
} 