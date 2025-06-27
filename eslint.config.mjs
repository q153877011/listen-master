import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
   // 添加自定义规则配置
   {
    rules: {
      // 将错误降级为警告或完全禁用
      'no-unused-vars': 'warn', // 或使用 'off' 完全禁用
      'no-undef': 'off',
      
      // 可以添加更多规则
      '@typescript-eslint/no-explicit-any': 'off',
      'react/no-unescaped-entities': 'off',
      
      // 对所有规则设置为警告级别
      // '@typescript-eslint/': 'warn', // 所有 typescript 规则
    },
    // 可选：忽略某些文件
    ignores: ['dist/**', 'build/**', 'node_modules/**', 'public/**']
  }
];

export default eslintConfig;
