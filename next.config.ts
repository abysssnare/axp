import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  /**
   * 站点在运行时通过 path.join(process.cwd(), "axp") 读取规范项目，
   * Next.js 的 output file tracing 无法静态追踪这条拼接出来的路径。
   * 把 axp/ 全量纳入追踪，保证 standalone 部署根自带数据；
   * package.json 的 build 脚本另有 cp -r axp .next/standalone/ 作为双保险。
   * 验证：bun run build && node scripts/site-check.mjs
   */
  outputFileTracingIncludes: {
    "/**": ["./axp/**/*"],
  },

  // E07：tsc --noEmit 已全绿（见 scripts/ 目录自检），构建不再忽略类型错误
  typescript: {
    ignoreBuildErrors: false,
  },
  // E09：并发模式下的副作用与 hydration 问题在开发期暴露
  reactStrictMode: true,
};

export default nextConfig;
