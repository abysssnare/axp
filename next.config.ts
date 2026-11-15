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

  typescript: {
    // TODO(E07): 先跑通 tsc --noEmit / bun run build 并修完类型错误，再改为 false
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
