import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AXP — Agent eXtension Package · Android 专属插件描述格式",
  description:
    "AXP 定义「一个插件长什么样」：一个 .axp 包、一份 axp.json 清单、六类组件、L0–L5 权限阶梯、13 个 axp:// 标准域，外加 UI 与热加载两个一等能力。本站在线渲染完整规范、示例与真实校验器演练场。",
  keywords: [
    "AXP",
    "Agent eXtension Package",
    "Android",
    "插件格式",
    "plugin format",
    "axp.json",
    "hot reload",
    "权限阶梯",
    "Agent",
    "LLM",
  ],
  openGraph: {
    title: "AXP — Agent eXtension Package",
    description:
      "Android 专属的独立插件描述格式：声明层统一 / 实现层开放 / Android 一等公民 / 实现体可替换。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
