'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface AudioTest {
  id: string;
  audio_path: string;
  miss_text: string;
  original_text: string;
  chinese: string;
}

export default function TestComponent() {
  const [currentTest, setCurrentTest] = useState<AudioTest | null>(null);
  const [userInputs, setUserInputs] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showChinese, setShowChinese] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean[]>([]);
  const [isStarted, setIsStarted] = useState(false);
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
      setShowChinese(false);
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
      }
    } catch (error) {
      console.error('Error fetching test:', error);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...userInputs];
    newInputs[index] = value;
    setUserInputs(newInputs);
  };

  const startTest = () => {
    setIsStarted(true);
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Audio playback failed:', error);
      });
    }
  };

  const checkAnswers = () => {
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
  };

  const handleNextTest = () => {
    fetchRandomTest();
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Audio playback failed:', error);
      });
    }
  };

  const renderTest = () => {
    if (!currentTest) return null;

    const words = currentTest.miss_text.split(' ');
    let inputIndex = 0;

    return (
      <div className="space-y-6">
        <audio 
          ref={audioRef} 
          controls 
          className="w-full mb-4"
          onEnded={() => {
            // 当音频播放结束时，自动聚焦到第一个输入框
            const firstInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
            }
          }}
        >
          <source src={currentTest.audio_path} type="audio/flac" />
          Your browser does not support the audio element.
        </audio>

        <div className="space-y-4">
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
                    className={`w-24 inline-block ${
                      showResults
                        ? isCorrect[currentInputIndex]
                          ? 'border-green-500'
                          : 'border-red-500'
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
            <div className="mt-4">
              <h3 className="font-semibold mb-2">正确答案：</h3>
              <p>{currentTest.original_text}</p>
            </div>
          )}

          <div className="mt-4">
            <Button
              onClick={() => setShowChinese(!showChinese)}
              variant="outline"
              className="mb-2"
            >
              {showChinese ? '隐藏中文' : '显示中文'}
            </Button>
            {showChinese && (
              <Card className="p-4 bg-gray-50">
                <p>{currentTest.chinese}</p>
              </Card>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={checkAnswers} disabled={showResults}>
            提交答案
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
          <Button onClick={startTest} size="lg">
            开始测试
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">听力测试</h1>
      {renderTest()}
    </div>
  );
} 