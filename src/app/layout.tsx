import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AXP v1.1.0 — 智能体扩展协议 · 完整规范与基础设施",
  description:
    "AXP (Agent eXtension Protocol) v1.1.0：面向智能体系统的开放插件协议。完整规范、参考内核实现与交互式插件演练场——生命周期、权限模型、事件总线与记忆系统。",
  keywords: [
    "AXP",
    "Agent eXtension Protocol",
    "智能体扩展协议",
    "插件协议",
    "AI Agent",
    "记忆系统",
    "插件架构",
  ],
  authors: [{ name: "AXP Working Group" }],
  icons: {
    icon: "/axp-icon.svg",
  },
  openGraph: {
    title: "AXP v1.1.0 — 智能体扩展协议",
    description: "完整规范与基础设施参考实现",
    siteName: "AXP",
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
