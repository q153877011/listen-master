import COS from 'cos-nodejs-sdk-v5';

// 腾讯云 COS 配置
const cosConfig = {
  SecretId: process.env.COS_SECRET_ID!,
  SecretKey: process.env.COS_SECRET_KEY!,
  Bucket: process.env.COS_BUCKET!,
  Region: process.env.COS_REGION!,
};

// 创建 COS 实例
const cos = new COS({
  SecretId: cosConfig.SecretId,
  SecretKey: cosConfig.SecretKey,
});

export interface COSUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  key?: string;
}

export interface COSDeleteResult {
  success: boolean;
  error?: string;
}

/**
 * 上传文件到腾讯云 COS
 * @param file 要上传的文件
 * @param key 文件在 COS 中的键名
 * @returns 上传结果
 */
export async function uploadToCOS(file: File, key: string): Promise<COSUploadResult> {
  try {
    // 将文件转换为 Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    return new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: cosConfig.Bucket,
        Region: cosConfig.Region,
        Key: key,
        Body: fileBuffer,
        ContentType: file.type || 'audio/flac',
      }, (err, data) => {
        if (err) {
          console.error('COS 上传失败:', err);
          resolve({
            success: false,
            error: err.message || '上传失败'
          });
        } else {
          // 构建文件的访问 URL
          const url = `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${key}`;
          console.log('COS 上传成功:', url);
          resolve({
            success: true,
            url,
            key
          });
        }
      });
    });
  } catch (error) {
    console.error('COS 上传异常:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传异常'
    };
  }
}

/**
 * 从腾讯云 COS 删除文件
 * @param key 文件在 COS 中的键名
 * @returns 删除结果
 */
export async function deleteFromCOS(key: string): Promise<COSDeleteResult> {
  try {
    return new Promise((resolve, reject) => {
      cos.deleteObject({
        Bucket: cosConfig.Bucket,
        Region: cosConfig.Region,
        Key: key,
      }, (err, data) => {
        if (err) {
          console.error('COS 删除失败:', err);
          resolve({
            success: false,
            error: err.message || '删除失败'
          });
        } else {
          console.log('COS 删除成功:', key);
          resolve({
            success: true
          });
        }
      });
    });
  } catch (error) {
    console.error('COS 删除异常:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除异常'
    };
  }
}

/**
 * 检查 COS 配置是否完整
 */
export function validateCOSConfig(): boolean {
  const requiredEnvVars = ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('缺少 COS 配置:', missingVars);
    return false;
  }
  
  return true;
}

export { cos, cosConfig }; 