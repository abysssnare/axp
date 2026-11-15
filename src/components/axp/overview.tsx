'use client'

/** 总览：协议定位、v1.1.0 亮点、架构图与变更日志 */

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionTitle } from './badges'
import { CHANGELOG, SPEC_META } from '@/lib/axp/spec'
import { EXTENSION_POINTS, PERMISSIONS } from '@/lib/axp/types'
import { useAxp } from './store'
import {
  Boxes,
  Brain,
  FileJson,
  HeartPulse,
  Network,
  ShieldCheck,
  Workflow,
} from 'lucide-react'

const HIGHLIGHTS = [
  {
    icon: Workflow,
    title: '六状态生命周期',
    desc: 'registered → resolved → active，含降级 / 熔断 / 恢复的完整闭环。',
    spec: '§4',
  },
  {
    icon: FileJson,
    title: 'axp.plugin.json 清单',
    desc: '静态校验先于注册：id / SemVer / engine / 权限 / 扩展点全部显式。',
    spec: '§3',
  },
  {
    icon: ShieldCheck,
    title: '12 项能力权限',
    desc: '声明是入场券不是通行证，运行期每次能力使用都经代理复核。',
    spec: '§6',
  },
  {
    icon: Network,
    title: '审计化事件总线',
    desc: 'axp:* 保留主题仅内核可发布，一切跨边界消息留痕可查。',
    spec: '§7',
  },
  {
    icon: Boxes,
    title: '拓扑激活（新）',
    desc: 'Kahn 算法计算依赖次序，被依赖者优先激活，循环依赖整批拒绝。',
    spec: '§8',
  },
  {
    icon: HeartPulse,
    title: '心跳健康分（新）',
    desc: '0-100 健康分，连续失联自动降级，5 分钟未恢复熔断隔离。',
    spec: '§9',
  },
]

export function OverviewTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { plugins, events, memories, loading } = useAxp()
  const activeCount = plugins.filter((p) => p.status === 'active').length

  const stats = [
    { label: '注册插件', value: loading ? '—' : String(plugins.length), hint: `${activeCount} 个活跃` },
    { label: '总线轨迹', value: loading ? '—' : String(events.length), hint: '最近 40 条审计' },
    { label: '记忆条目', value: loading ? '—' : String(memories.length), hint: 'agent.memory 契约' },
    { label: '权限目录', value: String(PERMISSIONS.length), hint: '3 项敏感级' },
  ]

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-zinc-900 px-6 py-12 text-white sm:px-10 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(16,185,129,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,.35) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-400/40 bg-emerald-500/15 font-mono text-emerald-300 hover:bg-emerald-500/15">
              v{SPEC_META.version} · {SPEC_META.status}
            </Badge>
            <span className="font-mono text-xs text-zinc-400">{SPEC_META.date}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            AXP{' '}
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              智能体扩展协议
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            {SPEC_META.fullName} —— 定义宿主与插件之间的清单格式、生命周期、消息契约、权限模型与事件总线语义。
            记忆系统、工具包、触发器、策略与界面组件，一次编写，处处运行。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('playground')}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              <Brain className="h-4 w-4" />
              进入插件演练场
            </button>
            <button
              onClick={() => onNavigate('spec')}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              阅读完整规范
            </button>
          </div>
        </div>
      </section>

      {/* 实时统计 */}
      <section>
        <SectionTitle
          eyebrow="LIVE STATE"
          title="内核实时快照"
          desc="以下数字来自本页背后真实运行的 AXP 内核（Prisma 持久化注册表 + 事件轨迹）。"
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="border-zinc-200">
                <CardContent className="p-5">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    {s.label}
                  </div>
                  <div className="mt-1.5 font-mono text-3xl font-semibold tabular-nums text-zinc-900">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">{s.hint}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 协议亮点 */}
      <section>
        <SectionTitle
          eyebrow="PROTOCOL HIGHLIGHTS"
          title="v1.1.0 核心特性"
          desc="六个支柱构成协议骨架，右侧标注对应规范章节。"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((h, i) => (
            <motion.div
              key={h.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Card className="group h-full border-zinc-200 transition hover:border-emerald-300 hover:shadow-sm">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-zinc-900 p-2 text-emerald-400 transition group-hover:bg-emerald-600 group-hover:text-white">
                      <h.icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400">{h.spec}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-zinc-900">{h.title}</h3>
                  <p className="mt-1.5 flex-1 text-xs leading-relaxed text-zinc-500">{h.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 扩展点一览 */}
      <section>
        <SectionTitle
          eyebrow="EXTENSION POINTS"
          title="五个标准扩展点"
          desc="宿主定义插槽，插件注入实现；契约独立于协议版本演进。"
        />
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(EXTENSION_POINTS).map(([k, v], idx) => (
                <tr key={v} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-emerald-700">{v}</td>
                  <td className="px-5 py-3.5 text-zinc-600">
                    {
                      {
                        memory: '记忆系统：写入 / 召回 / 遗忘 / 淘汰',
                        tool: '工具提供方：结构化可调用能力',
                        trigger: '触发器：向总线注入外部事件',
                        policy: '策略审查：运行时拦截与裁决',
                        ui: '界面面板：向宿主 UI 注入视图',
                      }[k]
                    }
                  </td>
                  <td className="hidden px-5 py-3.5 text-right font-mono text-xs text-zinc-400 sm:table-cell">
                    contract 1.1
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 变更日志 */}
      <section>
        <SectionTitle eyebrow="CHANGELOG" title="版本演进" />
        <div className="space-y-4">
          {CHANGELOG.map((c) => (
            <Card key={c.version} className="border-zinc-200">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-zinc-900">v{c.version}</span>
                  <Badge
                    variant="outline"
                    className={
                      c.tag === 'minor'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-zinc-300 bg-zinc-50 text-zinc-600'
                    }
                  >
                    {c.tag}
                  </Badge>
                  <span className="font-mono text-xs text-zinc-400">{c.date}</span>
                  {c.version === SPEC_META.version && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">当前版本</Badge>
                  )}
                </div>
                <ul className="mt-3.5 space-y-1.5">
                  {c.items.map((it) => (
                    <li key={it} className="flex gap-2 text-xs leading-relaxed text-zinc-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                      {it}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
