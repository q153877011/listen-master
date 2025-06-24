import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('folder') as File[];
    // 获取文本数据
    const text = formData.get('text') ? JSON.parse(formData.get('text') as string) : null;
    const chinese = formData.get('chinese') ? JSON.parse(formData.get('chinese') as string) : null;
    const missText = formData.get('miss_text') ? JSON.parse(formData.get('miss_text') as string) : null;

    const db = (await getCloudflareContext({ async: true })).env.DB;

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
        
        // 构建音频文件的存储路径
        const audioPath = `/audioFiles/${foldername}/${filename}`;
        
        // 获取文件ID（不包含扩展名）
        const fileId = filename.split('.')[0];

        try {
          // 使用 D1 的预处理语句
          const stmt = await db.prepare(
            `INSERT OR REPLACE INTO audio (
              id, text, audio_path, file_size, folder_name, file_name,
              miss_text, chinese, original_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            uniqueId,                    // id: TEXT
            text ? text[fileId] : null,  // text: TEXT
            audioPath,                   // audio_path: TEXT
            file.size,                   // file_size: INTEGER
            foldername,                  // folder_name: TEXT
            filename,                    // file_name: TEXT
            missText ? missText[fileId] : null,  // miss_text: TEXT
            chinese ? chinese[fileId] : null,    // chinese: TEXT
            text ? text[fileId] : null          // original_text: TEXT
          );

          const result = await stmt.run();

          if (!result.success) {
            throw new Error(`Failed to insert audio file: ${filename}`);
          }

          results.push({
            id: uniqueId,
            filename: filename,
            folder: foldername,
            size: file.size,
            path: audioPath,
            hasText: !!text?.[fileId],
            hasChinese: !!chinese?.[fileId],
            hasMissText: !!missText?.[fileId]
          });

          console.log(`Successfully processed file: ${filename} from folder: ${foldername}`);
        } catch (dbError) {
          console.error(`Database error for file ${file.name}:`, dbError);
          throw dbError;
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        // 继续处理下一个文件，而不是完全中断
        continue;
      }
    }

    if (results.length === 0) {
      return Response.json({ 
        success: false, 
        message: '没有找到可处理的音频文件'
      }, { status: 400 });
    }

    return Response.json({ 
      success: true, 
      message: `成功处理 ${results.length} 个音频文件`,
      results 
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 