"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, RefreshCw, ShieldCheck, ShieldAlert, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import { FieldTable, Pill, Section } from "./section-primitives";
import {
  ALLOW_DYNAMIC_CODE,
  BIND_EXPRS,
  DOMAINS,
  GRADIENT_ALGO,
  GRADIENT_CODE,
  HOTRELOAD_FIELDS,
  HOTRELOAD_STATE_MACHINE,
  LADDER,
  REQUEST_GROUPS,
  RUNTIME_SERVICES,
  UI_CONTAINERS,
  UI_CONTENTS,
  UI_FORMS,
  UI_LIFECYCLE,
  URI_SYNTAX,
} from "./data";

/* ---------------------------- 权限阶梯 ---------------------------- */

export function CapabilitiesSection() {
  return (
    <Section
      id="capabilities"
      kicker="spec/04-capabilities.md"
      title="权限阶梯 L0–L5 与梯度降级"
      lead="capabilities.privilege 是插件声明的最高权限层，宿主 MUST NOT 提供高于该层的通道。L2 及以上必须单独向用户确认；dangerous[] 必须是 requests[] 的子集。"
    >
      <div className="mb-8 grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
        {LADDER.map((l, i) => (
          <Card
            key={l.level}
            className={cn(
              "relative gap-0 overflow-hidden py-0",
              i >= 2 && "border-amber-500/30",
              i >= 4 && "border-rose-500/40"
            )}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <span
                className={cn(
                  "inline-flex h-9 w-14 shrink-0 items-center justify-center rounded-md font-mono text-sm font-bold",
                  i < 2 && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  i === 2 && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  i === 3 && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                  i >= 4 && "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {l.level}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold">{l.channel}</span>
                  {l.confirm === "必须单独确认" ? (
                    <Badge variant="outline" className="gap-1 border-amber-500/40 px-1.5 text-[10px] text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" aria-hidden /> 单独确认
                    </Badge>
                  ) : l.confirm === "仅预装" ? (
                    <Badge variant="outline" className="border-rose-500/40 px-1.5 text-[10px] text-rose-700 dark:text-rose-400">
                      仅预装
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{l.caps}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <GradientDemo />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">capabilities.requests 词汇表（分组）</h3>
          <div className="space-y-3 rounded-lg border p-4">
            {REQUEST_GROUPS.map((g) => (
              <div key={g.group}>
                <p className="mb-1.5 text-xs font-semibold">{g.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((it) => (
                    <code key={it} className="rounded-md border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {it}
                    </code>
                  ))}
                </div>
              </div>
            ))}
            <p className="border-t pt-2 text-xs text-muted-foreground">
              声明超出词汇表 → <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10.5px]">CAP_UNKNOWN_REQUEST</code>；
              <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[10.5px]">network.egress:&lt;host&gt;</code>禁止通配符
              <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[10.5px]">*</code>。
            </p>
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">反向通道 runtimeServices</h3>
          <FieldTable headers={["值", "含义", "宿主义务"]} rows={RUNTIME_SERVICES.map((r) => [r.value, r.meaning, r.duty])} />
        </div>
      </div>
    </Section>
  );
}

/* --------------------- gradient 交互演示 --------------------- */

function GradientDemo() {
  const [privilege, setPrivilege] = useState(3); // capabilities.privilege: 0..3
  const [grantedL2, setGrantedL2] = useState(true);
  const [grantedL3, setGrantedL3] = useState(true);
  const [binAvailable, setBinAvailable] = useState(false);

  const result = (() => {
    // 工具 screen.tap：gradient { L2: js, L3: bin + js 降级 }
    const ceiling = privilege;
    const available: number[] = [0];
    if (grantedL2 && 2 <= ceiling) available.push(2);
    if (grantedL3 && 3 <= ceiling) available.push(3);
    const layers = [...available].sort((a, b) => b - a);
    for (const L of layers) {
      if (L === 3) {
        if (binAvailable) return { layer: "L3", impl: "bin: tools/tap-shell", note: "gradient 命中 L3，bin 可用，直接走 shell 通道" };
        return { layer: "L3", impl: "js: tools/tap-shell-fallback.js", note: "gradient 命中 L3，bin 不可用 → 分支内降级 js（spec/03 §2）" };
      }
      if (L === 2) return { layer: "L2", impl: "js: tools/tap-a11y.js", note: "L3 未授权/超上限 → 降级到 L2 无障碍方案" };
    }
    return { layer: null, impl: "unavailable", note: "gradient 无命中且无顶层 impl → 工具标记 unavailable，而非报错崩溃" };
  })();

  const privilegeNames = ["L0 沙箱", "L1 标准权限", "L2 无障碍", "L3 Shizuku"];

  return (
    <div className="rounded-xl border bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h3 className="text-[15px] font-semibold">交互演示：gradient 权限梯度选择</h3>
        <Pill tone="emerald">spec/04 §3</Pill>
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
        同一工具在不同权限层声明不同实现体，宿主选择「当前可用且 ≤ capabilities.privilege」的最高层路径，不可用时逐级回退。
        这把「无障碍方案 / shell 方案 / root 方案」从插件代码里的 if-else 变成格式声明。
      </p>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-xs font-semibold text-muted-foreground">capabilities.privilege（权限上限）</Label>
            <div className="flex flex-wrap gap-1.5">
              {privilegeNames.map((name, i) => (
                <button
                  key={name}
                  onClick={() => setPrivilege(i)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-mono text-xs font-medium transition-colors",
                    privilege === i
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-lg border p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="g-l2" className="text-[13px]">宿主已授权 L2（无障碍）</Label>
                <p className="text-xs text-muted-foreground">用户已开启 AccessibilityService</p>
              </div>
              <Switch id="g-l2" checked={grantedL2} onCheckedChange={setGrantedL2} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="g-l3" className="text-[13px]">宿主已授权 L3（Shizuku）</Label>
                <p className="text-xs text-muted-foreground">用户已完成 Shizuku 授权</p>
              </div>
              <Switch id="g-l3" checked={grantedL3} onCheckedChange={setGrantedL3} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="g-bin" className="text-[13px]">bin 实现体可用</Label>
                <p className="text-xs text-muted-foreground">tools/tap-shell 架构匹配且可执行</p>
              </div>
              <Switch id="g-bin" checked={binAvailable} onCheckedChange={setBinAvailable} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <CodeBlock code={GRADIENT_CODE} lang="jsonc" title="tools[screen.tap].gradient" maxHeight={180} />
          <div
            className={cn(
              "flex-1 rounded-lg border p-4",
              result.layer ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"
            )}
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">宿主选择结果</p>
            <p className="font-mono text-sm font-bold">
              {result.layer ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {result.layer} → {result.impl}
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">unavailable</span>
              )}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{result.note}</p>
          </div>
        </div>
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">查看选择算法</summary>
        <pre className="axp-scroll mt-2 overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
          {GRADIENT_ALGO}
        </pre>
      </details>
    </div>
  );
}

/* ------------------------------ 标准域 ------------------------------ */

export function DomainsSection() {
  return (
    <Section
      id="domains"
      kicker="spec/05-domains.md"
      title="13 个 axp:// 标准域"
      lead="Surface 由 axp:// URI 寻址。宿主 MUST 内置下列 13 个标准域；插件可注册自定义域（前缀 axp://x/<自身 id>/，防止抢占他人命名空间）。"
    >
      <div className="mb-6">
        <FieldTable
          headers={["域", "URI 模式", "anchor", "watchable", "最低权限", "用途"]}
          rows={DOMAINS.map((d) => [
            <span key="d" className="font-mono text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">{d.domain}</span>,
            <code key="u" className="font-mono text-[11px] text-muted-foreground">{d.uri}</code>,
            d.anchor,
            d.watchable ? <Pill key="w" tone="emerald">✓ 订阅</Pill> : <span key="w" className="text-[11px] text-muted-foreground">—</span>,
            <span key="a" className="font-mono text-[11px]">{d.auth}</span>,
            d.use,
          ])}
        />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <CodeBlock code={URI_SYNTAX} lang="text" title="URI 语法" />
        <div className="min-w-0 rounded-lg border p-4 text-[13px] leading-relaxed text-muted-foreground">
          <p className="mb-3 font-semibold text-foreground">watchable 流的三种消费方式</p>
          <ul className="space-y-2.5">
            <li className="flex gap-2">
              <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">surfaces[]</code>
              声明「有什么数据」← 本文件定义寻址
            </li>
            <li className="flex gap-2">
              <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">events[].on</code>
              订阅「数据变了要做啥」← 附加 filter
            </li>
            <li className="flex gap-2">
              <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">ui.bind[].from</code>
              把数据接到界面节点 ← 实现自动刷新
            </li>
          </ul>
          <p className="mt-3 border-t pt-3">
            增量契约：首次全量，之后 diff；宿主可声明最大推送频率（背压），插件 SHOULD 遵守。
          </p>
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------- UI -------------------------------- */

export function UiSection() {
  return (
    <Section
      id="ui"
      kicker="spec/01-format.md §5.6 + spec/06-ui-vocab.md"
      title="UI：Android 一等组件"
      lead="ui{} 让插件自带界面。五种形态可共存；bind 把 Surface 流接到界面节点；actions 把 UI 事件回填到本包已声明的 tool；宿主 MUST 在装载 UI 前校验引用完整性。"
    >
      <div className="mb-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {UI_FORMS.map((f) => (
          <div key={f.key} className="rounded-lg border p-3.5 transition-colors hover:border-emerald-500/40">
            <div className="mb-1 flex items-center justify-between">
              <code className="font-mono text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">ui.{f.key}</code>
              <Pill tone={f.kind === "dsl" ? "emerald" : "zinc"}>{f.kind}</Pill>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">DSL 节点词汇表（panel.json / widget.json）</h3>
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">容器</p>
                <FieldTable headers={["type", "props"]} rows={UI_CONTAINERS.map((c) => [c.type, c.props])} />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">内容</p>
                <FieldTable headers={["type", "props"]} rows={UI_CONTENTS.map((c) => [c.type, c.props])} />
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">绑定表达式</h3>
            <div className="space-y-2 rounded-lg border p-4">
              {BIND_EXPRS.map((b) => (
                <div key={b.expr} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-emerald-700 dark:text-emerald-400">{b.expr}</code>
                  <span className="text-xs text-muted-foreground">{b.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">生命周期契约</h3>
            <FieldTable headers={["回调", "时机", "输入"]} rows={UI_LIFECYCLE.map((l) => [l.cb, l.when, <code key="i" className="font-mono text-[11px]">{l.input}</code>])} />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              启用 hotReload 且 targets 含 ui.* 时，lifecycle MUST 至少包含 onReload 与 onUnload；
              样式 token 由 theme: &quot;host&quot; 提供，插件 MUST NOT 硬编码绝对像素密度。
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------ 热加载 ------------------------------ */

export function HotReloadSection() {
  return (
    <Section
      id="hotreload"
      kicker="spec/08-hot-reload.md"
      title="热加载 hotReload{}"
      lead="「Android 上不重启宿主替换插件实现体」在 AXP 里是格式字段而非宿主私有能力：插件作者声明哪些组件可以被换、怎么保状态、怎么验签、怎么回滚，宿主按声明执行。"
    >
      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">字段全表</h3>
          <FieldTable
            headers={["字段", "类型", "默认", "说明"]}
            rows={HOTRELOAD_FIELDS.map((f) => [
              <span key="f" className="font-mono text-[11.5px] font-semibold">{f.field}</span>,
              <span key="t" className="font-mono text-[11px] text-muted-foreground">{f.type}</span>,
              <code key="d" className="font-mono text-[11px] text-muted-foreground">{f.def}</code>,
              f.desc,
            ])}
          />
        </div>
        <div className="min-w-0 space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">状态机</h3>
            <CodeBlock code={HOTRELOAD_STATE_MACHINE} lang="text" title="ACTIVE → VERIFYING → STAGING → MIGRATE → SWAPPED" maxHeight={330} />
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
              与 allowDynamicCode 的边界（重要）
            </h3>
            <div className="space-y-1.5 rounded-lg border p-3.5">
              {ALLOW_DYNAMIC_CODE.map((a) => (
                <div key={a.scene} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
                  {a.allowed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
                  )}
                  <span className={a.allowed ? "text-foreground" : "text-muted-foreground"}>{a.scene}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              该字段禁止的是「网络未签名代码」，允许「可信源已签名替换」。校验器 MUST NOT 因
              <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[10.5px]">allowDynamicCode: false</code>
              拒绝合法热加载，但 MUST 拒绝 sources 含 network-unsigned 或 signature != on-every-load 的配置。
              热加载 MUST NOT 用来提权——新包 id / privilege 不得扩大。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: <RefreshCw className="h-4 w-4" />, t: "隔离类加载器", d: "dex / wasm 用 InMemoryDexClassLoader，每代新实例，旧代 GC 可回收；MUST NOT 注入宿主 PathClassLoader" },
          { icon: <Eye className="h-4 w-4" />, t: "每次加载验签", d: "APK Signature Scheme v3 + 发布者指纹比对 + 权限不扩大 + targets ⊆ 旧声明" },
          { icon: <ShieldCheck className="h-4 w-4" />, t: "回滚", d: "保留最近 rollback.keep 代快照；onReload 抛错 / 初始化失败 / 用户回退时触发，回滚同样验签（防降级攻击）" },
        ].map((x) => (
          <TooltipProvider key={x.t}>
            <div className="rounded-lg border p-4">
              <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {x.icon}
                {x.t}
              </div>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">{x.d}</p>
            </div>
          </TooltipProvider>
        ))}
      </div>
    </Section>
  );
}
