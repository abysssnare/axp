"use client";

import { CheckCircle2, Circle, CircleDashed, PlayCircle, TerminalSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import { FieldTable, Pill, Section } from "./section-primitives";
import { CLI_COMMANDS, HOST_LEVELS, LOADING_STEPS, ROADMAP, SELF_CHECKS, TOOLCHAIN } from "./data";

/* --------------------------- 装载流水线 --------------------------- */

export function LoadingSection() {
  return (
    <Section
      id="loading"
      kicker="spec/01-format.md §8"
      title="装载流水线：九步硬约束"
      lead="宿主 MUST 按以下顺序执行，任一步失败即拒绝装载；失败 MUST 给出结构化错误（字段路径 + 规则编号），MUST NOT 部分注册组件。"
    >
      <ol className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
        {LOADING_STEPS.map((s, i) => (
          <li key={s.step} className="group flex gap-3 rounded-lg border p-4 transition-colors hover:border-emerald-500/40">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="text-sm font-semibold">{s.step}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-[13px] leading-relaxed text-muted-foreground">
        参考实现：<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11.5px]">runtime/src/loader.mjs</code>
        实现了这九步并在审计日志记录每步结果；<code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[11.5px]">runtime/test/smoke.mjs</code>
        断言「9 steps recorded」。错误码表见 <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11.5px]">axp/validator/README.md</code>。
      </div>
    </Section>
  );
}

/* --------------------------- 宿主等级 --------------------------- */

export function LevelsSection() {
  return (
    <Section
      id="levels"
      kicker="spec/01-format.md §11"
      title="宿主一致性等级"
      lead="宿主 SHOULD 在 README 声明所达等级。本站校验器演练场背后的 Node 参考运行时声明 AXP-3（最高等级）。"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HOST_LEVELS.map((l, i) => (
          <Card
            key={l.level}
            className={cn("gap-0 py-0", i === 3 && "border-emerald-500/50 bg-emerald-500/5")}
          >
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">{l.level}</span>
                {i === 3 && <Pill tone="emerald">参考运行时</Pill>}
              </div>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">{l.req}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------- 路线图 ----------------------------- */

export function RoadmapSection() {
  const statusIcon = { done: <CheckCircle2 />, partial: <CircleDashed />, todo: <Circle /> };
  const statusLabel = { done: "已跑通", partial: "部分就位", todo: "规划中" };
  return (
    <Section
      id="roadmap"
      kicker="spec/01-format.md §12"
      title="路线图 M1–M7"
      lead="实现进度不影响规范条款本身。截至 v1.0.3：M1、M2（Node 参考运行时）、M2.5、M5 已跑通；M3 规范/示例/教程就位，真机域适配器待补；M4 的 gradient 选择算法已实现、Shizuku 通道待接。"
    >
      <div className="relative space-y-2.5 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-border md:before:left-1/2">
        {ROADMAP.map((m, i) => (
          <div key={m.milestone} className={cn("relative grid gap-2.5 pl-10 md:grid-cols-2 md:pl-0", i % 2 === 1 && "md:[direction:rtl]")}>
            <div className={cn("md:[direction:ltr]", i % 2 === 1 ? "md:pl-10" : "md:pr-10 md:text-right")}>
              <div
                className={cn(
                  "rounded-lg border p-4",
                  m.status === "done" && "border-emerald-500/40 bg-emerald-500/5",
                  m.status === "partial" && "border-amber-500/40 bg-amber-500/5",
                  m.status === "todo" && "border-dashed"
                )}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[13px] font-bold">{m.milestone}</span>
                  <Pill tone={m.status === "done" ? "emerald" : m.status === "partial" ? "amber" : "zinc"}>
                    {statusLabel[m.status]}
                  </Pill>
                </div>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{m.deliver}</p>
                <p className="mt-1.5 border-t border-border/60 pt-1.5 text-[11.5px] text-muted-foreground">
                  出口标准：{m.exit}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "absolute left-2 top-5 h-4 w-4 items-center justify-center rounded-full border-2 bg-background md:left-1/2 md:-translate-x-1/2",
                m.status === "done" && "text-emerald-600 dark:text-emerald-400",
                m.status === "partial" && "text-amber-600 dark:text-amber-400",
                m.status === "todo" && "text-muted-foreground"
              )}
            >
              <span className="hidden md:flex">{statusIcon[m.status]}</span>
              <span className="flex md:hidden">{statusIcon[m.status]}</span>
            </span>
            <div className="hidden md:block" />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------- 工具链与自检 --------------------------- */

export function ToolingSection() {
  return (
    <Section
      id="tooling"
      kicker="仓库工具链"
      title="工具链与仓库自检"
      lead="规范不是纸面文档：validator 零依赖、CLI 五个命令、参考运行时可跑、双引擎交叉复核。以下是本仓库每次提交前 MUST 全绿的自检。"
    >
      <div className="mb-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {TOOLCHAIN.map((t) => (
          <div key={t.name} className="rounded-lg border p-4 transition-colors hover:border-emerald-500/40">
            <code className="mb-1.5 block font-mono text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">{t.name}</code>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <TerminalSquare className="h-4 w-4" aria-hidden />
            axp CLI（node cli/bin/axp.mjs &lt;command&gt;）
          </h3>
          <FieldTable
            headers={["命令", "说明"]}
            monoFirst={true}
            rows={CLI_COMMANDS.map((c) => [<span key="c" className="font-mono text-[11.5px]">{c.cmd}</span>, c.desc])}
          />
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <PlayCircle className="h-4 w-4" aria-hidden />
            四套自检（CI 对每次 PR 执行同一组）
          </h3>
          <div className="space-y-2">
            {SELF_CHECKS.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{s.name}</p>
                  <code className="block truncate font-mono text-[11px] text-muted-foreground">{s.cmd}</code>
                </div>
                <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {s.n}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CodeBlock
          title="一键自检"
          lang="bash"
          code={`git clone https://github.com/Ultra-Guru/axp.git && cd axp

# 四个示例清单校验（全绿）
for d in examples/*/; do node validator/src/validate.mjs "$d"; done

# 行为用例 / 独立引擎交叉复核 / 端到端冒烟
node validator/test/run-tests.mjs            # 31/31
python3 validator/test/schema-crosscheck.py  # 43/43（需 pip install jsonschema）
node runtime/test/smoke.mjs                  # 30/30`}
        />
      </div>
    </Section>
  );
}
