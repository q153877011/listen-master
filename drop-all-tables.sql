-- 删除所有表格的SQL脚本
-- 注意：此操作将删除所有数据，请谨慎使用

-- 删除 NextAuth 相关表
DROP TABLE IF EXISTS verification_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS accounts;

-- 删除应用相关表
DROP TABLE IF EXISTS audio;
DROP TABLE IF EXISTS audio_records;
DROP TABLE IF EXISTS users;

-- 确认所有表已删除
-- 以下查询可以检查剩余的表（仅供参考，不会在脚本中执行）
-- SELECT name FROM sqlite_master WHERE type='table'; 