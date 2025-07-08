# 腾讯云 COS 配置说明

## 1. 安装依赖

首先安装腾讯云 COS SDK：

```bash
npm install cos-nodejs-sdk-v5
```

## 2. 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# 腾讯云 COS 配置
COS_SECRET_ID="your-cos-secret-id"
COS_SECRET_KEY="your-cos-secret-key"
COS_BUCKET="your-cos-bucket-name"
COS_REGION="ap-beijing"
```

## 3. 获取配置信息

### 3.1 获取 SecretId 和 SecretKey

1. 登录腾讯云控制台
2. 进入 [访问管理](https://console.cloud.tencent.com/cam)
3. 选择 [API 密钥管理](https://console.cloud.tencent.com/cam/capi)
4. 创建或查看现有的 API 密钥
5. 复制 SecretId 和 SecretKey

### 3.2 创建存储桶

1. 进入 [对象存储 COS](https://console.cloud.tencent.com/cos)
2. 点击 [创建存储桶](https://console.cloud.tencent.com/cos/bucket)
3. 选择合适的地域（Region）
4. 设置存储桶名称（Bucket）
5. 选择访问权限（建议选择"公有读私有写"）

### 3.3 配置 CORS（跨域访问）

如果需要在浏览器中直接访问音频文件，需要配置 CORS：

1. 在存储桶详情页面，选择 [安全管理] -> [跨域访问 CORS 设置]
2. 添加规则：
   - 来源 Origin: `*` 或你的域名
   - 操作 Methods: `GET, HEAD`
   - 允许 Headers: `*`
   - 超时 MaxAgeSeconds: `3600`

## 4. 测试配置

配置完成后，可以访问上传页面测试文件上传功能。上传的音频文件将存储在 COS 中，并通过 CDN URL 访问。

## 5. 注意事项

- 确保存储桶的访问权限设置正确
- 如果使用 CDN 加速，需要额外配置 CDN 域名
- 建议定期检查 COS 的存储使用量和费用
- 可以根据需要设置文件的生命周期管理 