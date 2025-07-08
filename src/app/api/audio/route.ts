import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { AudioRecord, AudioResult } from '@/types/audio';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const audioFiles = await prisma.audio.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });

    const formattedAudioFiles: AudioResult[] = audioFiles.map((result: any): AudioResult => ({
      id: String(result.id),
      text: result.text || null,
      audio_path: String(result.audio_path),
      file_size: Number(result.file_size),
      folder_name: String(result.folder_name),
      file_name: String(result.file_name),
      miss_text: result.miss_text || null,
      chinese: result.chinese || null,
      original_text: result.original_text || null,
      created_at: result.created_at.toISOString()
    }));

    return NextResponse.json({ success: true, files: formattedAudioFiles });
  } catch (error) {
    console.error("获取音频文件列表失败:", error);
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
} 