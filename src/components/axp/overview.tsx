'use client'

/** 总览：协议定位、实时状态、核心特性与交付内容 */

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionTitle } from './badges'
import { CHANGELOG, SPEC_META } from '@/lib/axp/spec'
import { EXTENSION_POINTS, PERMISSIONS } from '@/lib/axp/types'
import { useAxp } from './store'
import {
  ArrowDownToLine,
  ArrowRight,
  Boxes,
  FileJson,
  HeartPulse,
  Network,
  Package,
  ShieldCheck,
  Workflow,
} from 'lucide-react'

const HIGHLIGHTS = [
  { icon: Workflow, title: '六状态生命周期', desc: 'registered → resolved → active，含降级、熔断与恢复的完整闭环。', spec: '§4' },
  { icon: FileJson, title: '插件清单', desc: '注册前静态校验标识、版本、权限与扩展点，让插件边界清晰可见。', spec: '§3' },
  { icon: ShieldCheck, title: '能力权限', desc: '声明是入场券，运行期每次能力使用都经权限代理复核。', spec: '§6' },
  { icon: Network, title: '审计化事件总线', desc: '保留主题受到保护，跨边界消息通过统一封皮传递并留下轨迹。', spec: '§7' },
  { icon: Boxes, title: '拓扑激活', desc: '按依赖次序激活插件；检测到循环依赖时，整批拒绝。', spec: '§8' },
  { icon: HeartPulse, title: '心跳健康协议', desc: '以健康分观察插件状态，定义失联、降级与恢复路径。', spec: '§9' },
]

const POINT_DESCRIPTIONS: Record<string, string> = {
  memory: '记忆系统：写入 / 召回 / 遗忘 / 淘汰',
  tool: '工具提供方：结构化可调用能力',
  trigger: '触发器：向总线注入外部事件',
  policy: '策略审查：运行时拦截与裁决',
  ui: '界面面板：向宿主 UI 注入视图',
}

function ProtocolDiagram() {
  return (
    <div className="relative hidden min-h-[290px] w-full max-w-[380px] lg:block" aria-label="协议架构：宿主通过 AXP 内核连接插件扩展点">
      <div className="absolute inset-x-7 top-0 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.2em] text-emerald-300">HOST ENVIRONMENT</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <div className="mt-2 text-sm font-medium text-white">智能体宿主</div>
        <div className="mt-1 text-xs text-zinc-400">Agent runtime</div>
      </div>
      <div className="absolute left-1/2 top-[84px] h-8 w-px bg-gradient-to-b from-emerald-400/70 to-emerald-400/20" />
      <div className="absolute inset-x-0 top-[112px] rounded-xl border border-emerald-400/35 bg-[#143d34] px-5 py-4 shadow-[0_0_50px_rgba(16,185,129,0.12)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-emerald-300">THE PROTOCOL LAYER</div>
            <div className="mt-2 text-sm font-semibold text-white">AXP 参考内核</div>
          </div>
          <span className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] text-emerald-200">v{SPEC_META.version}</span>
        </div>
        <div className="mt-3 flex gap-1.5 font-mono text-[10px] text-emerald-100/70">
          <span className="rounded bg-black/20 px-2 py-1">registry</span>
          <span className="rounded bg-black/20 px-2 py-1">permissions</span>
          <span className="rounded bg-black/20 px-2 py-1">event bus</span>
        </div>
      </div>
      <div className="absolute left-1/2 top-[224px] h-7 w-px bg-gradient-to-b from-emerald-400/70 to-emerald-400/20" />
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5">
        {['memory', 'tool', 'trigger', 'policy', 'ui'].map((point) => (
          <span key={point} className="rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-2 font-mono text-[10px] text-zinc-300">{point}</span>
        ))}
      </div>
    </div>
  )
}

export function OverviewTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { plugins, events, memories, loading } = useAxp()
  const activeCount = plugins.filter((p) => p.status === 'active').length
  const stats = [
    { label: '注册插件', value: loading ? '—' : String(plugins.length), hint: loading ? '正在读取' : `${activeCount} 个活跃` },
    { label: '总线轨迹', value: loading ? '—' : String(events.length), hint: '最近 40 条审计' },
    { label: '记忆条目', value: loading ? '—' : String(memories.length), hint: 'agent.memory 契约' },
    { label: '权限目录', value: String(PERMISSIONS.length), hint: '3 项敏感级' },
  ]

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="relative isolate overflow-hidden rounded-2xl bg-[#102923] text-white sm:rounded-3xl">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(110,231,183,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,183,.12) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'linear-gradient(to left, black, transparent 85%)' }} />
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative grid items-center gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1fr_380px] lg:gap-12 lg:px-14 lg:py-16">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Open protocol</span>
              <span className="text-emerald-600">/</span>
              <span>v{SPEC_META.version} · {SPEC_META.status}</span>
            </div>
            <h1 className="mt-7 text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl xl:text-[3.5rem]">
              为智能体构建<br /><span className="text-emerald-300">可扩展的未来。</span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-emerald-50/70 sm:text-base sm:leading-8">
              AXP 智能体扩展协议，定义宿主与插件之间的共同语言。从清单、生命周期到权限与事件总线，让能力自由组合。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => onNavigate('spec')} className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-300 px-5 text-sm font-semibold text-[#102923] transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                阅读协议规范 <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => onNavigate('playground')} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                探索演练场
              </button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] tracking-wide text-emerald-100/50">
              <span>AGENT EXTENSION PROTOCOL</span><span className="hidden h-3 w-px bg-white/20 sm:block" /><span>APACHE-2.0</span><span className="hidden h-3 w-px bg-white/20 sm:block" /><span>{SPEC_META.date}</span>
            </div>
          </div>
          <ProtocolDiagram />
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <SectionTitle eyebrow="LIVE STATE / 01" title="内核实时快照" desc="来自参考内核的注册表、事件轨迹与记忆数据。" />
          <button onClick={() => onNavigate('playground')} className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 transition hover:text-emerald-900">打开演练场 <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#dce6df] bg-white lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="border-[#e7eee9] p-5 [&:nth-child(-n+2)]:border-b [&:nth-child(odd)]:border-r lg:border-b-0 lg:[&:not(:last-child)]:border-r sm:p-6">
              <div className="text-xs font-medium text-zinc-500">{s.label}</div>
              <div className="mt-3 font-mono text-3xl font-semibold tabular-nums tracking-tight text-[#173b30]">{s.value}</div>
              <div className="mt-2 text-xs text-zinc-400">{s.hint}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="PROTOCOL HIGHLIGHTS / 02" title="面向协作的协议基础" desc="从插件注册到运行时治理，六个支柱构成 AXP 的协议骨架。" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((h, i) => (
            <motion.div key={h.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
              <Card className="group h-full border-[#dce6df] bg-white shadow-none transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-950/5">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-[#eaf5ee] p-2.5 text-emerald-700"><h.icon className="h-5 w-5" /></div>
                    <span className="font-mono text-xs text-zinc-400">{h.spec}</span>
                  </div>
                  <h3 className="mt-6 text-sm font-semibold text-zinc-900">{h.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-zinc-500">{h.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#cce4d5] bg-[#eaf5ee]">
        <div className="flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-emerald-700"><Package className="h-4 w-4" /> BUILD WITH AXP / 03</div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-[#173b30] sm:text-2xl">从规范到代码，立即开始构建</h2>
            <p className="mt-3 text-sm leading-7 text-[#4d6b5b]">下载完整 SDK，获取 11 章协议规范、参考内核、官方记忆插件与插件开发模板。</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['SPEC.md', 'kernel/', 'plugins/', 'template/'].map((f) => <span key={f} className="rounded-md border border-[#d5e8da] bg-white/70 px-2.5 py-1 font-mono text-[10px] text-[#4d6b5b]">{f}</span>)}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <a href="/api/package" download className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#173b30] px-5 text-sm font-semibold text-white transition hover:bg-[#245343] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"><ArrowDownToLine className="h-4 w-4" /> 下载 SDK</a>
            <span className="font-mono text-[10px] text-[#718c7a]">v{SPEC_META.version} · ZIP · APACHE-2.0</span>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="EXTENSION POINTS / 04" title="五个标准扩展点" desc="宿主定义插槽，插件注入实现；契约独立于协议版本演进。" />
        <div className="overflow-x-auto rounded-2xl border border-[#dce6df] bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <tbody>
              {Object.entries(EXTENSION_POINTS).map(([k, v]) => (
                <tr key={v} className="border-b border-[#edf1ee] last:border-0">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-emerald-700 sm:px-6">{v}</td>
                  <td className="px-5 py-4 text-xs text-zinc-600">{POINT_DESCRIPTIONS[k]}</td>
                  <td className="px-5 py-4 text-right font-mono text-[10px] text-zinc-400">contract 1.1</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="CHANGELOG / 05" title="版本演进" />
        <div className="grid gap-3 lg:grid-cols-2">
          {CHANGELOG.map((c) => (
            <Card key={c.version} className="border-[#dce6df] shadow-none">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-zinc-900">v{c.version}</span>
                  <Badge variant="outline" className={c.tag === 'minor' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-zinc-300 bg-zinc-50 text-zinc-600'}>{c.tag}</Badge>
                  <span className="font-mono text-xs text-zinc-400">{c.date}</span>
                  {c.version === SPEC_META.version && <Badge className="bg-emerald-700 hover:bg-emerald-700">当前版本</Badge>}
                </div>
                <ul className="mt-4 space-y-2">{c.items.map((it) => <li key={it} className="flex gap-2 text-xs leading-5 text-zinc-600"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />{it}</li>)}</ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
