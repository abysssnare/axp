"use client";

import {
  Bot,
  Boxes,
  Braces,
  Eye,
  LayoutDashboard,
  Package,
  Wrench,
  Zap,
  BookOpen,
  XCircle,
  CheckCircle2,
  FileJson,
  GitBranch,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CodeBlock } from "./code-block";
import { FieldTable, Pill, Section } from "./section-primitives";
import {
  COMPONENT_DEFS,
  IMPL_EXAMPLE,
  IMPL_FORMS,
  IMPL_SELECTION,
  MANIFEST_FIELDS,
  MANIFEST_SKELETON,
  NOT_WHAT,
  PACKAGE_RULES,
  PACKAGE_TREE,
  PRINCIPLES,
  WHY_ROWS,
} from "./data";

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
  tools: <Wrench className="h-4 w-4" />,
  surfaces: <Eye className="h-4 w-4" />,
  knowledge: <BookOpen className="h-4 w-4" />,
  agents: <Bot className="h-4 w-4" />,
  events: <Zap className="h-4 w-4" />,
  ui: <LayoutDashboard className="h-4 w-4" />,
};

/* ------------------------------- 概览 ------------------------------- */

export function OverviewSection({ stats }: { stats: { specFiles: number; domains: number; componentTypes: number; implForms: number; examples: number; privilegeLevels: number } }) {
  return (
    <Section
      id="overview"
      kicker="spec/01-format.md §0"
      title="规范地位：同级独立格式"
      lead={
        <>
          AXP（Agent eXtension Package，<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">.axp</code>）是一种独立的插件描述格式。
          它与 MCP、LSP、Agent Skills 等插件 / 能力描述规范处于<strong className="text-foreground">同一规范层级</strong>：各自定义自己的清单结构、组件模型与装载语义，互不依附、互不内嵌、互不桥接。
          「规范地位平级」与「表达能力覆盖」是两件事——逐字段证明放在 <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">spec/07-expression-map.md</code>（对外验收材料）。
        </>
      }
    >
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NOT_WHAT.map((n) => (
          <div key={n.not} className="rounded-lg border border-dashed p-4">
            <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
              <XCircle className="h-4 w-4 shrink-0" aria-hidden />
              不是{n.not}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{n.reason}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { n: stats.specFiles, label: "规范文件", icon: <FileJson className="h-4 w-4" /> },
          { n: stats.componentTypes, label: "组件类型", icon: <Boxes className="h-4 w-4" /> },
          { n: stats.implForms, label: "impl 实现形态", icon: <GitBranch className="h-4 w-4" /> },
          { n: stats.privilegeLevels, label: "权限阶梯 L0–L5", icon: <Layers className="h-4 w-4" /> },
          { n: stats.domains, label: "axp:// 标准域", icon: <Eye className="h-4 w-4" /> },
          { n: stats.examples, label: "官方示例插件", icon: <Package className="h-4 w-4" /> },
        ].map((s) => (
          <Card key={s.label} className="py-0">
            <CardContent className="flex flex-col gap-1 p-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.icon}
                {s.label}
              </span>
              <span className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">{s.n}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------ 为什么 ------------------------------ */

export function WhySection() {
  return (
    <Section
      id="why"
      kicker="设计动机"
      title="为什么需要它"
      lead="现有插件格式在 Android 智能体场景里缺的东西，AXP 用格式字段原生补齐，而不是靠宿主私有能力或外部工具硬凑。"
    >
      <FieldTable headers={["现有格式缺的东西", "AXP 的做法"]} rows={WHY_ROWS.map((r) => [r.lack, r.axp])} />

      <h3 className="mb-4 mt-10 text-lg font-semibold">五条设计原则</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {PRINCIPLES.map((p, i) => (
          <Card key={p.name} className="gap-2 py-0 transition-colors hover:border-emerald-500/40">
            <CardHeader className="pb-0 pt-4">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {i + 1}
                </span>
                {p.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[13px] leading-relaxed text-muted-foreground">{p.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------ 包结构 ------------------------------ */

export function PackageSection() {
  return (
    <Section
      id="package"
      kicker="spec/01-format.md §2"
      title="包结构"
      lead="一个插件 = 一个包。目录形态用于开发，同名 .axp zip 用于分发；axp.json 是唯一入口。"
    >
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
        <CodeBlock code={PACKAGE_TREE} lang="text" title="com.example.demo.axp/" />
        <div className="space-y-3">
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-semibold">硬性规则（RFC 2119）</p>
            <ul className="space-y-2.5">
              {PACKAGE_RULES.map((r) => (
                <li key={r} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-[13px] leading-relaxed text-amber-800 dark:text-amber-300">
              <strong>安全铁律：</strong>未在清单中声明的文件一律不执行。校验器会扫描包内全部可执行文件（.js / .dex / .so / .wasm / .html），发现未被 axp.json 引用的即报
              <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[11px]">UNDECLARED_EXECUTABLE</code>
              错误。
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------- 清单 ------------------------------- */

export function ManifestSection() {
  return (
    <Section
      id="manifest"
      kicker="spec/01-format.md §3"
      title="清单 axp.json"
      lead={
        <>
          一切组件必须在此声明——这是「声明层统一」的落点。机器可读形式为
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">spec/02-manifest.schema.json</code>
          （JSON Schema draft 2020-12）。
        </>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Pill tone="emerald">axp: &quot;1.0&quot;</Pill>
        <Pill tone="emerald">minAndroid ≥ 26</Pill>
        <Pill>abis 声明预编译架构</Pill>
        <Pill tone="amber">entry 可省略：纯声明型插件合法</Pill>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1fr_1.15fr]">
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">顶层字段（§3.1）</h3>
          <FieldTable
            headers={["字段", "类型", "必填", "说明"]}
            rows={MANIFEST_FIELDS.map((f) => [
              f.field,
              <span key="t" className="font-mono text-[11px]">{f.type}</span>,
              f.required ? <Badge key="r" variant="default" className="px-1.5 text-[10px]">必填</Badge> : <span key="r" className="text-[11px]">—</span>,
              f.desc,
            ])}
          />
        </div>
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">完整形态（示例）</h3>
          <CodeBlock code={MANIFEST_SKELETON} lang="jsonc" title="axp.json" maxHeight={520} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-4 text-[13px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">唯一性约束：</strong>
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">tools[].id</code>、
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">surfaces[].uri</code>、
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">knowledge[].id</code>、
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">agents[].id</code>
        各自命名空间内唯一；<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">events[].on + filter</code> 组合不得重复。
      </div>
    </Section>
  );
}

/* ----------------------------- 实现引用 ----------------------------- */

export function ImplSection() {
  return (
    <Section
      id="impl"
      kicker="spec/03-impl-reference.md"
      title="统一实现引用 impl"
      lead="「实现层开放」的语法核心：清单统一，实现随意。所有组件的实现体字段共用同一引用类型，一个 impl 可同时给多种实现，宿主按设备能力选择。"
    >
      <div className="mb-6">
        <FieldTable
          headers={["代号", "键", "形态", "打包要求", "可热替换"]}
          rows={IMPL_FORMS.map((f) => [
            <span key="c" className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{f.code}</span>,
            <span key="k" className="font-mono text-[12px] font-semibold">{f.key}</span>,
            f.form,
            f.pack,
            <span key="h" className="text-[12px]">{f.hot}</span>,
          ])}
        />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <CodeBlock code={IMPL_EXAMPLE} lang="jsonc" title="多实现路径 + 外部进程" />
        <div className="min-w-0">
          <CodeBlock code={IMPL_SELECTION} lang="text" title="宿主选择算法（MUST 稳定可预测）" />
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-[13px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">T7 proc 的意义：</strong>格式只声明「有一个进程、怎么拉起」，不假定任何协议、方法表或消息格式。
            任何以外部进程形式提供能力的实现，在 AXP 中都只是一条普通声明——这是「同级独立格式」定位在字段层面的落点。
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ----------------------------- 六类组件 ----------------------------- */

export function ComponentsSection() {
  return (
    <Section
      id="components"
      kicker="spec/01-format.md §5"
      title="六类组件"
      lead="每个组件 = 声明格式 + 实现体引用 + Android 语义。所有数组均可为空——只有声明、没有自有胶水代码的纯声明型插件合法。"
    >
      <Accordion type="multiple" defaultValue={["tools", "ui"]} className="grid gap-3 md:grid-cols-2">
        {COMPONENT_DEFS.map((c) => (
          <AccordionItem key={c.key} value={c.key} className="scroll-mt-28 rounded-lg border px-4 md:col-span-1 data-[state=open]:md:col-span-2">
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="flex flex-1 items-start gap-3 text-left">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {COMPONENT_ICONS[c.key]}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{c.name}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{c.en}</code>
                    <Pill tone="emerald">{c.tagline}</Pill>
                  </div>
                  <p className="mt-1 text-[13px] font-normal leading-relaxed text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
                <CodeBlock code={c.json} lang="jsonc" title={`${c.en} 声明示例`} maxHeight={380} />
                <ul className="space-y-2">
                  {c.points.map((p) => (
                    <li key={p} className="flex gap-2 rounded-md border bg-muted/30 px-3 py-2 text-[12.5px] leading-relaxed text-muted-foreground">
                      <Braces className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
