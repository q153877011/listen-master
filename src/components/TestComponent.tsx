'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ActivityResponse } from '@/types/user-activity';

interface AudioTest {
  id: string;
  audio_path: string;
  miss_text: string;
  original_text: string;
  chinese: string;
}

export default function TestComponent() {
  const { data: session, status } = useSession();
  const [currentTest, setCurrentTest] = useState<AudioTest | null>(null);
  const [userInputs, setUserInputs] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string>('');
  const [isChineseRevealed, setIsChineseRevealed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Only fetch the first test when user hasn't started
    if (!isStarted) {
      fetchRandomTest();
    }
  }, [isStarted]);

  useEffect(() => {
    if (currentTest) {
      // Reset states when a new test is loaded
      const missingWordsCount = (currentTest.miss_text.match(/\*\*\*/g) || []).length;
      setUserInputs(new Array(missingWordsCount).fill(''));
      setShowResults(false);
      setIsChineseRevealed(false);
      setIsCorrect([]);
    }
  }, [currentTest]);

  const fetchRandomTest = async () => {
    try {
      const response = await fetch('/api/test/random');
      const data = await response.json() as {
        success: boolean;
        test?: AudioTest;
        message?: string;
      };
      if (data.success && data.test) {
        setCurrentTest(data.test);
        console.log('获取到测试数据:', data.test);
        console.log('音频文件路径:', data.test.audio_path);
        return data.test; // 返回测试数据
      } else {
        console.error('获取测试数据失败:', data.message);
        return null;
      }
    } catch (error) {
      console.error('Error fetching test:', error);
      return null;
    }
  };

  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...userInputs];
    newInputs[index] = value;
    setUserInputs(newInputs);
  };

  const startTest = () => {
    setIsStarted(true);
    setTestStartTime(new Date());
    setAudioLoading(false);
    setAudioError('');
    
    // 延迟播放，确保音频已加载
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(error => {
          console.error('Audio playback failed:', error);
          setAudioError('音频播放失败: ' + error.message);
        });
      }
    }, 500);
  };

  const checkAnswers = async () => {
    if (!currentTest) return;

    const originalWords = currentTest.original_text.split(' ');
    const missWords = currentTest.miss_text.split(' ');
    const results: boolean[] = [];
    let inputIndex = 0;

    missWords.forEach((word, index) => {
      if (word === '***') {
        const correctWord = originalWords[index].toLowerCase();
        const userWord = userInputs[inputIndex].toLowerCase();
        results.push(correctWord === userWord);
        inputIndex++;
      }
    });

    setIsCorrect(results);
    setShowResults(true);

    // 记录用户活动
    console.log("准备记录用户活动:", {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      isRecording,
      audioId: currentTest.id
    });
    
    if (session?.user?.id && !isRecording) {
      setIsRecording(true);
      try {
        const timeSpent = testStartTime ? Math.floor((Date.now() - testStartTime.getTime()) / 1000) : null;
        const allCorrect = results.every(result => result);
        
        const requestBody = {
          audioId: currentTest.id,
          isCorrect: allCorrect,
          userAnswer: userInputs.join(' '),
          correctAnswer: currentTest.original_text,
          completedAt: new Date().toISOString(),
          timeSpent: timeSpent,
        };
        
        console.log("发送用户活动数据:", requestBody);
        
        const response = await fetch('/api/user-activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json() as ActivityResponse;
        console.log("用户活动 API 响应:", data);
        
        if (!data.success) {
          console.error('记录用户活动失败:', data.message);
        } else {
          console.log('用户活动记录成功');
        }
      } catch (error) {
        console.error('记录用户活动时出错:', error);
      } finally {
        setIsRecording(false);
      }
    } else {
      console.log("跳过用户活动记录:", {
        reason: !session?.user?.id ? "用户未登录" : "正在记录中"
      });
    }
  };

  const handleNextTest = async () => {
    // 重置音频状态
    setAudioLoading(false);
    setAudioError('');
    setShowResults(false);
    setIsChineseRevealed(false);
    setIsCorrect([]);
    setUserInputs([]);
    
    // 等待新数据加载完成
    const newTest = await fetchRandomTest();
    
    // 只有在成功获取新数据后才播放音频
    if (newTest && audioRef.current) {
      console.log('开始加载新音频:', newTest.audio_path);
      audioRef.current.load();
      
      // 等待音频加载完成后播放
      audioRef.current.addEventListener('canplay', () => {
        console.log('新音频加载完成，开始播放');
        audioRef.current?.play().catch(error => {
          console.error('Audio playback failed:', error);
          setAudioError('音频播放失败: ' + error.message);
        });
      }, { once: true });
    }
  };

  const renderTest = () => {
    if (!currentTest) return null;

    const words = currentTest.miss_text.split(' ');
    let inputIndex = 0;

    return (
      <div className="space-y-8">
        <audio 
          ref={audioRef} 
          controls 
          className="w-full"
          onLoadStart={() => setAudioLoading(true)}
          onCanPlay={() => {
            setAudioLoading(false);
            setAudioError('');
          }}
          onError={(e) => {
            setAudioLoading(false);
            setAudioError('音频加载失败，请检查网络连接或文件格式');
            console.error('Audio error:', e);
          }}
          onEnded={() => {
            // 当音频播放结束时，自动聚焦到第一个输入框
            const firstInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
            }
          }}
        >
          <source src={currentTest.audio_path} type="audio/flac" />
          <source src={currentTest.audio_path} type="audio/mpeg" />
          <source src={currentTest.audio_path} type="audio/wav" />
          Your browser does not support the audio element.
        </audio>

        {/* 音频状态显示 */}
        {audioLoading && (
          <div className="text-center py-4 text-blue-600 my-4">
            正在加载音频文件...
          </div>
        )}
        
        {audioError && (
          <div className="text-center py-4 text-red-600 bg-red-50 rounded p-3 my-4">
            {audioError}
            <div className="text-xs text-gray-500 mt-2">
              URL: {currentTest.audio_path}
            </div>
          </div>
        )}

        <div className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-2 items-center">
            {words.map((word, index) => {
              if (word === '***') {
                const currentInputIndex = inputIndex++;
                return (
                  <Input
                    key={index}
                    type="text"
                    value={userInputs[currentInputIndex] || ''}
                    onChange={(e) => handleInputChange(currentInputIndex, e.target.value)}
                    className={`w-24 inline-block transition-all duration-300 ${
                      showResults
                        ? isCorrect[currentInputIndex]
                          ? 'border-green-500 bg-green-50 text-green-800 font-semibold shadow-md animate-correct-pulse'
                          : 'border-red-500 bg-red-50 text-red-800 font-semibold shadow-md animate-incorrect-shake'
                        : ''
                    }`}
                    onKeyDown={(e) => {
                      // 按回车键时移动到下一个输入框或提交答案
                      if (e.key === 'Enter') {
                        const inputs = document.querySelectorAll('input[type="text"]');
                        const currentIndex = Array.from(inputs).indexOf(e.target as HTMLInputElement);
                        if (currentIndex < inputs.length - 1) {
                          (inputs[currentIndex + 1] as HTMLInputElement).focus();
                        } else {
                          checkAnswers();
                        }
                      }
                    }}
                  />
                );
              }
              return <span key={index}>{word}</span>;
            })}
          </div>

          {showResults && (
            <div className="pt-8 animate-fade-in">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold mb-2 text-blue-800">答题结果</h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                    <span className="text-sm">正确: {isCorrect.filter(c => c).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-red-500 rounded-full"></span>
                    <span className="text-sm">错误: {isCorrect.filter(c => !c).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                    <span className="text-sm">总计: {isCorrect.length}</span>
                  </div>
                </div>
                <div className="text-center">
                  {isCorrect.every(c => c) ? (
                    <div className="text-green-600 font-bold text-lg animate-bounce">
                      🎉 全部正确！太棒了！
                    </div>
                  ) : isCorrect.filter(c => c).length > isCorrect.length / 2 ? (
                    <div className="text-blue-600 font-bold text-lg">
                      👍 不错！继续加油！
                    </div>
                  ) : (
                    <div className="text-orange-600 font-bold text-lg">
                      💪 需要多练习，加油！
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-gray-800">正确答案：</h3>
                <p className="text-gray-700">{currentTest.original_text}</p>
              </div>
            </div>
          )}

          <div className="mt-6">
            <Card className="p-4 bg-gray-50">
              <span
                className={`
                  inline-block cursor-pointer transition-all duration-300 
                  ${isChineseRevealed ? '' : 'blur-sm'} 
                `}
                style={{
                  filter: isChineseRevealed ? 'none' : 'blur(4px)',
                }}
                onClick={() => setIsChineseRevealed(!isChineseRevealed)}
                title={isChineseRevealed ? "点击隐藏内容" : "点击查看内容"}
              >
                <p className="text-gray-700">{currentTest.chinese}</p>
              </span>
            </Card>
          </div>

        </div>

        <div className="flex gap-4 pt-8">
          <Button 
            onClick={checkAnswers} 
            disabled={showResults || isRecording}
            className={`transition-all duration-300 ${
              showResults 
                ? isCorrect.every(c => c)
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-600 hover:bg-orange-700'
                : ''
            }`}
          >
            {isRecording ? '记录中...' : showResults ? '已提交' : '提交答案'}
          </Button>
          <Button onClick={handleNextTest} variant="outline">
            下一题
          </Button>
        </div>
      </div>
    );
  };

  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-3xl font-bold mb-6">听力测试</h1>
        <Card className="p-6">
          <p className="mb-4">准备好开始听力测试了吗？</p>
          <p className="text-sm text-gray-600 mb-6">
            点击开始后，将会播放音频。请仔细听并填写缺失的单词。
            你可以：
          </p>
          <ul className="text-sm text-gray-600 text-left list-disc list-inside mb-6">
            <li>重复播放音频</li>
            <li>使用回车键快速切换输入框</li>
            <li>查看中文翻译辅助理解</li>
            <li>提交答案后查看正确结果</li>
          </ul>
          {status === 'unauthenticated' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                注意：未登录用户无法记录练习数据，建议先登录以获得完整的练习体验。
              </p>
            </div>
          )}
          <Button onClick={startTest} size="lg">
            开始测试
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderTest()}
    </div>
  );
} 