"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  Github,
  Menu,
  Moon,
  Package2,
  ShieldCheck,
  Sun,
  Terminal,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { SiteData } from "@/lib/axp-server";
import { NAV_SECTIONS } from "./data";
import { CodeBlock } from "./code-block";
import {
  ComponentsSection,
  ImplSection,
  ManifestSection,
  OverviewSection,
  PackageSection,
  WhySection,
} from "./sections-format";
import { CapabilitiesSection, DomainsSection, HotReloadSection, UiSection } from "./sections-android";
import { LevelsSection, LoadingSection, RoadmapSection, ToolingSection } from "./sections-host";
import { ExamplesSection } from "./examples-section";
import { PlaygroundSection } from "./playground-section";
import { LibrarySection } from "./library-section";

const ALL_SECTION_IDS = NAV_SECTIONS.flatMap((g) => g.items.map((i) => i.id));

const HEADER_NAV = [
  { id: "overview", label: "规范" },
  { id: "capabilities", label: "权限" },
  { id: "examples", label: "示例" },
  { id: "playground", label: "演练场" },
  { id: "library", label: "文档库" },
  { id: "tooling", label: "工具链" },
];

const REPO_URL = "https://github.com/Ultra-Guru/axp";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ------------------------------- 主题切换 ------------------------------- */

function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="切换主题"
      className="h-9 w-9"
      onClick={() => {
        const isDark = document.documentElement.classList.contains("dark");
        setTheme(isDark ? "light" : "dark");
      }}
    >
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden />
      <Moon className="h-4 w-4 dark:hidden" aria-hidden />
    </Button>
  );
}

/* --------------------------------- 头部 --------------------------------- */

function Header({ active, onOpenMobileNav }: { active: string; onOpenMobileNav: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-4 md:px-6">
        <button onClick={() => scrollToId("overview")} className="flex items-center gap-2.5" aria-label="回到顶部">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-mono text-[13px] font-bold text-white dark:bg-emerald-500 dark:text-emerald-950">
            axp
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-[15px] font-bold tracking-tight">Agent eXtension Package</span>
            <span className="font-mono text-[10.5px] text-muted-foreground">Android 专属插件描述格式 · v1.0</span>
          </span>
        </button>

        <nav aria-label="主导航" className="ml-auto hidden items-center gap-1 md:flex">
          {HEADER_NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => scrollToId(n.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                active === n.id ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 md:ml-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3" onClick={() => window.open(REPO_URL, "_blank")}>
            <Github className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">GitHub</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="打开目录"
            className="h-9 w-9 md:hidden"
            onClick={onOpenMobileNav}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/* --------------------------------- 侧栏 --------------------------------- */

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] w-56 shrink-0 self-start lg:block" aria-label="章节目录">
      <nav className="axp-scroll max-h-full overflow-y-auto pb-8">
        {NAV_SECTIONS.map((g) => (
          <div key={g.group} className="mb-5">
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</p>
            <ul className="space-y-0.5 border-l">
              {g.items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => scrollToId(item.id)}
                    aria-current={active === item.id}
                    className={cn(
                      "-ml-px block w-full border-l-2 py-1.5 pl-3 text-left text-[13px] transition-colors",
                      active === item.id
                        ? "border-emerald-500 font-medium text-emerald-700 dark:text-emerald-400"
                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/* --------------------------------- Hero --------------------------------- */

function Hero() {
  return (
    <section id="overview-hero" className="relative overflow-hidden border-b py-14 md:py-20">
      <div className="axp-grid-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5 border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
            <span className="axp-pulse inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            spec v1.1.1 · 格式版本 1.0.0
          </Badge>
          <Badge variant="outline" className="px-2.5 py-1 font-mono text-[11px] text-muted-foreground">Android API 26+</Badge>
          <Badge variant="outline" className="px-2.5 py-1 font-mono text-[11px] text-muted-foreground">MIT License</Badge>
          <Badge variant="outline" className="px-2.5 py-1 font-mono text-[11px] text-muted-foreground">CI · 31+43+30 checks</Badge>
        </div>

        <h1 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
          <span className="font-mono text-emerald-600 dark:text-emerald-400">.axp</span>
          ：Android 智能体的
          <br className="hidden md:block" />
          插件描述格式
        </h1>

        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-base">
          AXP 定义「一个插件长什么样」：一个 <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">.axp</code> 包、一份
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">axp.json</code> 清单、六类组件、一套 Android 原生权限模型，外加
          <strong className="text-foreground"> UI</strong> 与<strong className="text-foreground"> 热加载</strong> 两个一等能力。
          它与 MCP / LSP / Agent Skills 等规范<strong className="text-foreground">地位平级、互不依附</strong>。
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button
            size="lg"
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            onClick={() => scrollToId("playground")}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            打开校验器演练场
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={() => scrollToId("library")}>
            <Boxes className="h-4 w-4" aria-hidden />
            阅读完整规范
          </Button>
          <Button size="lg" variant="ghost" className="gap-2" onClick={() => window.open(REPO_URL, "_blank")}>
            <Github className="h-4 w-4" aria-hidden />
            GitHub 仓库
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>

        <div className="mt-10 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Terminal className="h-3.5 w-3.5" aria-hidden />
              快速开始（本仓库已含全部工具链，零依赖 Node 20+）
            </p>
            <CodeBlock
              lang="bash"
              title="terminal"
              code={`git clone ${REPO_URL}.git && cd axp

# 校验示例插件（四个全绿）
node cli/bin/axp.mjs validate examples/01-hello

# 打包成 .axp（zip 分发态，发布前需 apksigner --v3 签名）
node cli/bin/axp.mjs pack examples/01-hello -o hello.axp`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 self-start sm:grid-cols-4 lg:grid-cols-2">
            {[
              { icon: <Package2 className="h-4 w-4" />, k: "声明层统一", v: "axp.json 唯一事实源", d: "未声明的文件一律不执行" },
              { icon: <Boxes className="h-4 w-4" />, k: "实现层开放", v: "7 种 impl 形态", d: "js / dex / so / wasm / bin / url / proc" },
              { icon: <ShieldCheck className="h-4 w-4" />, k: "Android 原生", v: "L0–L5 权限阶梯", d: "gradient 自动降级" },
              { icon: <Terminal className="h-4 w-4" />, k: "可验证", v: "31+43+30 自检", d: "双引擎交叉复核" },
            ].map((c) => (
              <div key={c.k} className="rounded-lg border bg-card/60 p-3.5 backdrop-blur">
                <span className="text-emerald-600 dark:text-emerald-400">{c.icon}</span>
                <p className="mt-1.5 text-[13px] font-semibold">{c.k}</p>
                <p className="text-[12.5px] text-muted-foreground">{c.v}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/70">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- 移动端目录 ------------------------------- */

function MobileNav({ open, onOpenChange, active }: { open: boolean; onOpenChange: (v: boolean) => void; active: string }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 overflow-y-auto p-0">
        <SheetTitle className="sr-only">章节目录</SheetTitle>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-bold">章节目录</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)} aria-label="关闭目录">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="p-3" aria-label="移动端章节目录">
          {NAV_SECTIONS.map((g) => (
            <div key={g.group} className="mb-4">
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        setTimeout(() => scrollToId(item.id), 150);
                      }}
                      className={cn(
                        "w-full rounded-md px-2.5 py-2 text-left text-[14px]",
                        active === item.id ? "bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/* --------------------------------- 主组件 --------------------------------- */

export function AxpSite({ data }: { data: SiteData }) {
  const [active, setActive] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [playgroundManifest, setPlaygroundManifest] = useState<string>(
    () => data.examples.find((e) => e.dirName === "03-hot-reload")?.manifest ?? data.examples[0]?.manifest ?? "{}"
  );

  /* 滚动监听 */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -75% 0px" }
    );
    for (const id of ALL_SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const openInPlayground = useCallback((manifest: string) => {
    setPlaygroundManifest(manifest);
    setTimeout(() => scrollToId("playground"), 60);
  }, []);

  const baseManifest = useMemo(
    () => data.examples.find((e) => e.dirName === "03-hot-reload")?.manifest ?? "{}",
    [data.examples]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header active={active} onOpenMobileNav={() => setMobileNavOpen(true)} />
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} active={active} />

      <div className="mx-auto flex w-full max-w-[1440px] flex-1 items-start gap-8 px-4 py-0 md:px-6">
        <Sidebar active={active} />
        <main className="min-w-0 flex-1">
          <Hero />
          <OverviewSection
            stats={{
              specFiles: data.stats.specFiles,
              domains: data.stats.domains,
              componentTypes: data.stats.componentTypes,
              implForms: data.stats.implForms,
              examples: data.stats.examples,
              privilegeLevels: data.stats.privilegeLevels,
            }}
          />
          <WhySection />
          <PackageSection />
          <ManifestSection />
          <ImplSection />
          <ComponentsSection />
          <CapabilitiesSection />
          <DomainsSection />
          <UiSection />
          <HotReloadSection />
          <LoadingSection />
          <LevelsSection />
          <RoadmapSection />
          <ExamplesSection examples={data.examples} onOpenPlayground={openInPlayground} />
          <PlaygroundSection
            manifest={playgroundManifest}
            onManifestChange={setPlaygroundManifest}
            baseManifest={baseManifest}
          />
          <LibrarySection docs={data.docs} />
          <ToolingSection />
        </main>
      </div>

      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 font-mono text-[11px] font-bold text-white dark:bg-emerald-500 dark:text-emerald-950">
              axp
            </span>
            <p className="text-[13px] text-muted-foreground">
              AXP · Agent eXtension Package — 规范版本 1.0.0（文档 v1.1.1）· MIT
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
            <button onClick={() => scrollToId("library")} className="hover:text-foreground">规范正文</button>
            <button onClick={() => scrollToId("examples")} className="hover:text-foreground">示例</button>
            <button onClick={() => scrollToId("playground")} className="hover:text-foreground">演练场</button>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
              GitHub <ArrowUpRight className="h-3 w-3" aria-hidden />
            </a>
          </div>
        </div>
        <p className="mx-auto w-full max-w-[1440px] px-4 pb-6 text-[11.5px] leading-relaxed text-muted-foreground/70 md:px-6">
          本站由 Next.js 渲染仓库内真实规范文档与示例；校验器演练场在服务端调用 axp/validator 真实 CLI。
          仓库内容由 AI 辅助生成，作为规范草案与工程起点；落地实现前请按 axp/docs/host-checklist.md 逐项验证。
        </p>
      </footer>
    </div>
  );
}
