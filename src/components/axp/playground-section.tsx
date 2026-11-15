"use client";

import { useCallback, useEffect, useState } from "react";
import { Bug, Check, Copy, FlaskConical, Loader2, RotateCcw, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import { Section } from "./section-primitives";
import {
  copyTextToClipboard,
  useTransientFeedback,
  ValidateResultPanel,
  type ValidateResponse,
} from "./examples-section";

/* --------------- 破坏性预设：对合法清单做定点突变，演示错误码 --------------- */

type Mutator = (m: Record<string, unknown>) => void;

const BREAK_PRESETS: { label: string; code: string; desc: string; mutate: Mutator }[] = [
  {
    label: "gradient 超权",
    code: "GRADIENT_EXCEEDS_PRIVILEGE",
    desc: "capabilities.privilege 降到 L2，但 screen.tap 仍保留 L3 分支",
    mutate: (m) => {
      (m.capabilities as Record<string, unknown>).privilege = "L2";
    },
  },
  {
    label: "未知权限请求",
    code: "CAP_UNKNOWN_REQUEST",
    desc: "requests 里塞一个词汇表外的 camera.magic",
    mutate: (m) => {
      const caps = m.capabilities as Record<string, unknown>;
      caps.requests = [...(caps.requests as string[]), "camera.magic"];
    },
  },
  {
    label: "热加载签名策略",
    code: "HOT_SIGNATURE_POLICY",
    desc: "hotReload.signature 改成 on-install（热加载必须 on-every-load）",
    mutate: (m) => {
      ((m.hotReload as Record<string, unknown>) ?? {}).signature = "on-install";
    },
  },
  {
    label: "dangerous 未声明",
    code: "DANGEROUS_NOT_REQUESTED",
    desc: "dangerous 加入 root.su，但它不在 requests 里",
    mutate: (m) => {
      const caps = m.capabilities as Record<string, unknown>;
      caps.dangerous = [...((caps.dangerous as string[]) ?? []), "root.su"];
    },
  },
  {
    label: "破坏性工具缺确认",
    code: "TOOL_CONFIRM_REQUIRED",
    desc: "ledger.ocr 改成 destructive 但不开 confirm",
    mutate: (m) => {
      const ocr = (m.tools as Record<string, unknown>[]).find((t) => t.id === "ledger.ocr");
      if (!ocr) return;
      ocr.sideEffects = "destructive";
      ocr.confirm = false;
    },
  },
  {
    label: "UI 动作指向幽灵工具",
    code: "UI_ACTION_TOOL_MISSING",
    desc: "ui.actions[0].tool 改成本包不存在的 tool id",
    mutate: (m) => {
      const actions = ((m.ui as Record<string, unknown>).actions as Record<string, unknown>[]) ?? [];
      if (actions[0]) actions[0].tool = "ghost.tool";
      else (m.ui as Record<string, unknown>).actions = [{ id: "ui.panel.x", tool: "ghost.tool" }];
    },
  },
  {
    label: "未签名网络源",
    code: "HOT_UNSIGNED_SOURCE",
    desc: "hotReload.sources 加入 network-unsigned",
    mutate: (m) => {
      const hr = (m.hotReload as Record<string, unknown>) ?? {};
      hr.sources = [...((hr.sources as string[]) ?? ["package"]), "network-unsigned"];
    },
  },
  {
    label: "id 非反向域名",
    code: "ID_INVALID",
    desc: "id 改成 Not-A-Valid-Id",
    mutate: (m) => {
      m.id = "Not-A-Valid-Id";
    },
  },
];

function applyPreset(baseManifest: string, preset: Mutator): string {
  const m = JSON.parse(baseManifest) as Record<string, unknown>;
  preset(m);
  return JSON.stringify(m, null, 2);
}

export function PlaygroundSection({
  manifest,
  onManifestChange,
  baseManifest,
}: {
  manifest: string;
  onManifestChange: (m: string) => void;
  baseManifest: string;
}) {
  const [stub, setStub] = useState(true);
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [manifestCopied, showManifestCopied] = useTransientFeedback<boolean>();

  useEffect(() => {
    try {
      JSON.parse(manifest);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  }, [manifest]);

  const setManifest = onManifestChange;

  const validate = useCallback(async () => {
    if (jsonError) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "custom", manifest, stub }),
      });
      setResult((await res.json()) as ValidateResponse);
    } catch {
      setResult({ ok: false, errors: [{ code: "NETWORK", msg: "请求失败，请重试" }], warnings: [], info: [], summary: null });
    } finally {
      setBusy(false);
    }
  }, [manifest, stub, jsonError]);

  const copyManifest = useCallback(async () => {
    showManifestCopied(await copyTextToClipboard(manifest));
  }, [manifest, showManifestCopied]);

  const stats = (() => {
    try {
      const m = JSON.parse(manifest) as Record<string, unknown>;
      return `${(m.tools as unknown[])?.length ?? 0} tools · ${(m.surfaces as unknown[])?.length ?? 0} surfaces · privilege ${(m.capabilities as Record<string, unknown>)?.privilege ?? "?"}`;
    } catch {
      return "JSON 解析失败";
    }
  })();

  return (
    <Section
      id="playground"
      kicker="validator/src/validate.mjs"
      title="校验器演练场"
      lead="粘贴任意 axp.json，服务端会把它写入临时包目录，再调用仓库里真实的零依赖校验器 CLI（schema → 引用完整性 → 权限词汇表 → UI 引用 → 热加载策略）。点击预设按钮可定点破坏合法清单，观察对应错误码。"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          破坏性预设：
        </span>
        {BREAK_PRESETS.map((p) => (
          <TooltipProvider key={p.code}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setManifest(applyPreset(baseManifest, p.mutate))}
                  className="rounded-full border border-rose-500/30 bg-rose-500/5 px-2.5 py-1 text-[11.5px] font-medium text-rose-700 transition-colors hover:bg-rose-500/15 dark:text-rose-400"
                >
                  {p.label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64 text-xs">
                <p className="font-mono font-semibold">{p.code}</p>
                <p className="mt-0.5 text-muted-foreground">{p.desc}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2.5 text-[11.5px]"
          onClick={() => setManifest(baseManifest)}
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          重置为合法清单
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="axp-manifest-editor" className="font-mono text-[13px] font-semibold">axp.json</Label>
              <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">{stats}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="stub-switch" checked={stub} onCheckedChange={setStub} />
              <Label htmlFor="stub-switch" className="cursor-pointer text-xs text-muted-foreground">
                补齐引用文件占位
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 cursor-help underline decoration-dotted">?</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64 text-xs">
                      为清单引用的所有路径创建空占位文件（.md / .json），让引用完整性检查通过，聚焦 schema 与业务规则。关闭后可看到真实的
                      IMPL_FILE_MISSING / UNDECLARED_EXECUTABLE 行为。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>
          </div>
          <div className="relative">
            <textarea
              id="axp-manifest-editor"
              value={manifest}
              onChange={(e) => setManifest(e.target.value)}
              spellCheck={false}
              aria-label="axp.json 编辑器"
              className={cn(
                "axp-scroll h-[480px] w-full resize-y rounded-lg border bg-muted/20 p-3.5 font-mono text-[12px] leading-relaxed outline-none transition-colors focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30",
                jsonError && "border-rose-500/60"
              )}
            />
            {jsonError && (
              <p className="absolute bottom-2 left-2 right-2 rounded-md border border-rose-500/40 bg-background/95 px-2.5 py-1.5 font-mono text-[11px] text-rose-600 dark:text-rose-400">
                JSON 语法错误：{jsonError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={validate}
              disabled={busy || !!jsonError}
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden />}
              运行校验
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2.5 text-[11.5px]"
              onClick={() => void copyManifest()}
            >
              {manifestCopied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
              {manifestCopied ? "已复制" : "复制当前清单"}
            </Button>
            <span className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
              等价于 <code className="break-all rounded bg-muted px-1 py-0.5 font-mono text-[10.5px]">node validator/src/validate.mjs &lt;你的包&gt; --json</code>
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Bug className="h-3.5 w-3.5" aria-hidden />
            校验结果（真实 CLI 输出）
          </div>
          {result || busy ? (
            <ValidateResultPanel result={result} busy={busy} />
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground">
              <Sparkles className="h-5 w-5 text-emerald-500/60" aria-hidden />
              点击「运行校验」或任一破坏性预设，观察校验器行为
            </div>
          )}

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-xs font-semibold">校验器检查链（与 CLI 一致）</p>
            <ol className="space-y-1 text-[12px] leading-relaxed text-muted-foreground">
              {[
                "JSON 解析 → schema（02-manifest.schema.json）",
                "身份：id 反向域名 / semver / publisher 指纹",
                "引用完整性：相对路径存在、无 ..、无绝对路径",
                "未声明可执行文件不得执行（安全铁律）",
                "abis 与 .so / .dex 产物一致",
                "组件 id 唯一性",
                "requests 词汇表 + dangerous ⊆ requests",
                "gradient / agents 权限上限",
                "impl.url 的 host 必须有 network.egress 声明",
                "ui.actions[].tool / ui.bind[].to 引用可解析",
                "热加载策略：on-every-load / 无未签名源 / isolated",
              ].map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{String(i + 1).padStart(2, "0")}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CodeBlock
          title="本地等价命令"
          lang="bash"
          code={`# 校验一个插件目录
node axp/validator/src/validate.mjs axp/examples/03-hot-reload

# 机器可读输出（本演练场即解析该输出）
node axp/validator/src/validate.mjs axp/examples/03-hot-reload --json

# 把警告也视为失败
node axp/validator/src/validate.mjs axp/examples/03-hot-reload --strict`}
        />
      </div>
    </Section>
  );
}
