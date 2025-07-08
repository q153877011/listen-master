import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { AudioRecord } from '@/types/audio';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 获取所有满足条件的音频ID
    const allIds = await prisma.audio.findMany({
      where: {
        miss_text: { not: null },
        original_text: { not: null },
        chinese: { not: null },
      },
      select: { id: true },
    });
    if (!allIds.length) {
      return NextResponse.json({
        success: false,
        message: "No tests available"
      }, { status: 404 });
    }
    // 随机选一个ID
    const randomIdx = Math.floor(Math.random() * allIds.length);
    const randomId = allIds[randomIdx].id;
    // 查询该音频详细信息
    const result = await prisma.audio.findUnique({ where: { id: randomId } });
    if (!result) {
      return NextResponse.json({
        success: false,
        message: "Invalid test data"
      }, { status: 500 });
    }
    const test: AudioRecord = {
      id: String(result.id),
      audio_path: String(result.audio_path),
      miss_text: result.miss_text as string,
      original_text: result.original_text as string,
      chinese: result.chinese as string,
      text: result.text,
      file_size: Number(result.file_size),
      folder_name: result.folder_name,
      file_name: result.file_name,
      created_at: result.created_at.toISOString(),
    };
    return NextResponse.json({
      success: true,
      test
    });
  } catch (error) {
    console.error('Error fetching random test:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 