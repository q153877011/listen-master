import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface UpdateAudioRequest {
  id: string;
  miss_text?: string;
  chinese?: string;
  original_text?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { id, miss_text, chinese, original_text } = await request.json() as UpdateAudioRequest;

    if (!id) {
      return NextResponse.json({ success: false, message: "音频 ID 不能为空" }, { status: 400 });
    }

    const updateData: any = {};
    if (miss_text !== undefined) updateData.miss_text = miss_text;
    if (chinese !== undefined) updateData.chinese = chinese;
    if (original_text !== undefined) updateData.original_text = original_text;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: "没有提供要更新的字段" }, { status: 400 });
    }

    const updatedAudio = await prisma.audio.update({
      where: { id },
      data: updateData,
    });

    if (!updatedAudio) {
      return NextResponse.json({ success: false, message: "音频文件不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "音频文件更新成功" });

  } catch (error) {
    console.error("更新音频文件时出错:", error);
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
} 