import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['tdesign-react'],
  optimizeFonts: false, // 禁用字体优化
  experimental: {
    optimizePackageImports: ['@vercel/turbopack-next'],
  },
};

export default nextConfig;

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
