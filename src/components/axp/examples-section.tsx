"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, FolderTree, Loader2, Package, PlayCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ExampleData } from "@/lib/axp-server";
import { buildTree } from "@/lib/tree";
import { CodeBlock } from "./code-block";
import { Pill, Section } from "./section-primitives";

interface ValidateIssue {
  code: string;
  msg: string;
  path?: string;
}

export interface ValidateResponse {
  ok: boolean;
  errors: ValidateIssue[];
  warnings: ValidateIssue[];
  info: string[];
  summary: {
    id: string;
    version: string;
    axp: string;
    tools: number;
    surfaces: number;
    knowledge: number;
    agents: number;
    events: number;
    ui: boolean;
    hotReload: boolean;
    privilege: string;
    refs: number;
    files: number;
  } | null;
}

export function ValidateResultPanel({ result, busy }: { result: ValidateResponse | null; busy: boolean }) {
  if (busy) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        正在调用真实校验器（node validator/src/validate.mjs --json）…
      </div>
    );
  }
  if (!result) return null;

  return (
    <div className={cn("rounded-lg border", result.ok ? "border-emerald-500/40" : "border-rose-500/40")}>
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold",
          result.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
        )}
      >
        {result.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
        {result.ok ? "ALL CHECKS PASSED — 校验全绿" : `FAILED — ${result.errors.length} 个错误`}
      </div>

      {result.summary && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-b px-4 py-3 font-mono text-[11.5px] text-muted-foreground sm:grid-cols-4">
          <span>id: <span className="text-foreground">{result.summary.id}</span></span>
          <span>version: <span className="text-foreground">{result.summary.version}</span></span>
          <span>privilege: <span className="text-foreground">{result.summary.privilege}</span></span>
          <span>refs/files: <span className="text-foreground">{result.summary.refs}/{result.summary.files}</span></span>
          <span>tools: <span className="text-foreground">{result.summary.tools}</span></span>
          <span>surfaces: <span className="text-foreground">{result.summary.surfaces}</span></span>
          <span>knowledge: <span className="text-foreground">{result.summary.knowledge}</span></span>
          <span>agents/events: <span className="text-foreground">{result.summary.agents}/{result.summary.events}</span></span>
          <span>ui: <span className="text-foreground">{result.summary.ui ? "yes" : "no"}</span></span>
          <span>hotReload: <span className="text-foreground">{result.summary.hotReload ? "enabled" : "disabled"}</span></span>
        </div>
      )}

      {(result.errors.length > 0 || result.warnings.length > 0 || result.info.length > 0) && (
        <div className="axp-scroll max-h-72 space-y-1.5 overflow-y-auto p-3">
          {result.errors.map((e, i) => (
            <div key={`e${i}`} className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-rose-500/25 bg-rose-500/5 px-2.5 py-1.5 font-mono text-[11.5px]">
              <span className="font-bold text-rose-600 dark:text-rose-400">✖ {e.code}</span>
              <span className="text-foreground">{e.msg}</span>
              {e.path && <span className="text-muted-foreground">@ {e.path}</span>}
            </div>
          ))}
          {result.warnings.map((w, i) => (
            <div key={`w${i}`} className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-amber-500/25 bg-amber-500/5 px-2.5 py-1.5 font-mono text-[11.5px]">
              <span className="font-bold text-amber-600 dark:text-amber-400">WARN {w.code}</span>
              <span className="text-foreground">{w.msg}</span>
            </div>
          ))}
          {result.info.map((s, i) => (
            <div key={`i${i}`} className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1.5 font-mono text-[11.5px] text-muted-foreground">
              info: {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- 示例区 ----------------------------- */

export function ExamplesSection({
  examples,
  onOpenPlayground,
}: {
  examples: ExampleData[];
  onOpenPlayground: (manifest: string) => void;
}) {
  const [selected, setSelected] = useState(examples[examples.length - 1]?.id ?? "");
  const [result, setResult] = useState<Record<string, ValidateResponse | null>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const current = examples.find((e) => e.id === selected) ?? examples[0];

  const validateExample = async (id: string) => {
    setBusy(id);
    setResult((r) => ({ ...r, [id]: null }));
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "example", example: id }),
      });
      const data = (await res.json()) as ValidateResponse;
      setResult((r) => ({ ...r, [id]: data }));
    } catch {
      setResult((r) => ({ ...r, [id]: { ok: false, errors: [{ code: "NETWORK", msg: "请求失败，请重试" }], warnings: [], info: [], summary: null } }));
    } finally {
      setBusy(null);
    }
  };

  if (!current) return null;

  return (
    <Section
      id="examples"
      kicker="examples/"
      title="示例插件"
      lead="四个官方示例覆盖从最小插件到六类组件 + 热加载 + 13 个标准域的全谱系。下方清单是仓库里的真实 axp.json，「验证」按钮会在服务端调用真实校验器 CLI。"
    >
      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {examples.map((e) => (
          <button
            key={e.id}
            onClick={() => setSelected(e.id)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5",
              selected === e.id ? "border-emerald-500/60 bg-emerald-500/5 shadow-sm" : "hover:border-emerald-500/30"
            )}
            aria-pressed={selected === e.id}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <code className="font-mono text-[13px] font-bold">{e.id}</code>
              <Badge variant="outline" className="px-1.5 font-mono text-[10px]">{e.hostLevel}</Badge>
            </div>
            <p className="text-sm font-semibold">{e.name}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{e.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Pill tone="emerald">{e.privilege}</Pill>
              <Pill>v{e.version}</Pill>
              {e.counts.hotReload && <Pill tone="amber">hotReload</Pill>}
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <code className="font-mono text-sm font-semibold">{current.nameEn}</code>
            <span className="text-sm text-muted-foreground">·</span>
            <code className="font-mono text-xs text-muted-foreground">{current.dirName}/</code>
            <div className="flex flex-wrap gap-1">
              {current.tags.map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenPlayground(current.manifest)}
              className="h-8"
            >
              <PlayCircle className="mr-1 h-3.5 w-3.5" aria-hidden />
              在演练场打开
            </Button>
            <Button
              size="sm"
              onClick={() => validateExample(current.id)}
              disabled={busy === current.id}
              className="h-8 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              {busy === current.id ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />
              )}
              验证
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-0 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 border-b p-4 lg:border-b-0 lg:border-r">
            <p className="mb-2 text-xs font-medium text-muted-foreground">axp.json（{current.counts.tools} tools · {current.counts.surfaces} surfaces · {current.counts.knowledge} knowledge · {current.counts.agents} agents · {current.counts.events} events{current.counts.ui ? " · ui" : ""}{current.counts.hotReload ? " · hotReload" : ""}）</p>
            <CodeBlock code={current.manifest} lang="json" title={`${current.dirName}/axp.json`} maxHeight={420} showHeader={false} />
          </div>
          <div className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FolderTree className="h-3.5 w-3.5" aria-hidden />
              包内文件（{current.tree.length}）
            </p>
            <pre className="axp-scroll max-h-[420px] overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {buildTree(current.tree, `${current.dirName}.axp/`)}
            </pre>
          </div>
        </div>

        {result[current.id] !== undefined || busy === current.id ? (
          <div className="border-t p-4">
            <ValidateResultPanel result={result[current.id] ?? null} busy={busy === current.id} />
          </div>
        ) : null}
      </div>

      <Collapsible className="mt-4">
        <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
          示例矩阵说明（README）
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="axp-scroll mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 font-semibold">示例</th>
                  <th className="px-3 py-2.5 font-semibold">覆盖</th>
                  <th className="px-3 py-2.5 font-semibold">宿主等级</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["01-hello", "最小插件：tools[] + entry + L0", "AXP-0"],
                  ["02-ui-panel", "ui{} + bind / actions / lifecycle + Surface 订阅", "AXP-2"],
                  ["03-hot-reload", "六类组件 + UI + hotReload{} + gradient", "AXP-3"],
                  ["04-domains", "M3：13 个 axp:// 标准域、URI 模板、anchor、watchable、事件与多域绑定", "AXP-2"],
                ].map((r) => (
                  <tr key={r[0]} className="border-b last:border-0">
                    <td className="px-3 py-2.5 font-mono text-[12px] font-medium">{r[0]}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r[1]}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Section>
  );
}
