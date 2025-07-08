import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { uploadToCOS, validateCOSConfig } from "@/lib/cos";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // 验证 COS 配置
    if (!validateCOSConfig()) {
      return Response.json({ 
        success: false, 
        message: 'COS 配置不完整，请检查环境变量' 
      }, { status: 500 });
    }

    const formData = await request.formData();
    const files = formData.getAll('folder') as File[];
    // 获取文本数据
    const text = formData.get('text') ? JSON.parse(formData.get('text') as string) : null;
    const chinese = formData.get('chinese') ? JSON.parse(formData.get('chinese') as string) : null;
    const missText = formData.get('miss_text') ? JSON.parse(formData.get('miss_text') as string) : null;

    const results = [];
    const audioFiles = files.filter(file => 
      file.type.startsWith('audio/') || 
      file.name.toLowerCase().endsWith('.flac')
    );

    for (const file of audioFiles) {
      try {
        // 从文件路径中提取信息
        const pathParts = file.name.split('/');
        const filename = pathParts[pathParts.length - 1];
        const foldername = pathParts[pathParts.length - 2] || 'unknown';
        
        // 生成唯一ID（使用文件夹名+文件名的组合）
        const uniqueId = `${foldername}_${filename}`;
        
        // 构建 COS 中的文件键名
        const cosKey = `audioFiles/${foldername}/${filename}`;
        
        // 获取文件ID（不包含扩展名）
        const fileId = filename.split('.')[0];

        // 上传文件到 COS
        const uploadResult = await uploadToCOS(file, cosKey);
        if (!uploadResult.success) {
          throw new Error(`COS 上传失败: ${uploadResult.error}`);
        }

        // 使用 COS URL 作为音频路径
        const audioPath = uploadResult.url!;

        try {
          const audioFile = await prisma.audio.upsert({
            where: { id: uniqueId },
            update: {
              text: text ? text[fileId] : null,
              audio_path: audioPath,
              file_size: file.size,
              folder_name: foldername,
              file_name: filename,
              miss_text: missText ? missText[fileId] : null,
              chinese: chinese ? chinese[fileId] : null,
              original_text: text ? text[fileId] : null
            },
            create: {
              id: uniqueId,
              text: text ? text[fileId] : null,
              audio_path: audioPath,
              file_size: file.size,
              folder_name: foldername,
              file_name: filename,
              miss_text: missText ? missText[fileId] : null,
              chinese: chinese ? chinese[fileId] : null,
              original_text: text ? text[fileId] : null
            }
          });

                      results.push({
              success: true,
              file: filename,
              id: audioFile.id,
              url: audioPath
            });
        } catch (error) {
          console.error(`Error processing file ${filename}:`, error);
          results.push({
            success: false,
            file: filename,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        results.push({
          success: false,
          file: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return Response.json({ 
      success: true, 
      results,
      message: `成功处理 ${results.filter(r => r.success).length} 个音频文件`
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 