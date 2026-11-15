'use client'

/** 演练场：插件注册表（真实内核驱动）+ 事件总线轨迹 + 插件市场 */

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CategoryBadge,
  HealthBar,
  PermissionChip,
  SectionTitle,
  StatusBadge,
  TopicChip,
} from './badges'
import { useAxp } from './store'
import type { LifecycleState, PluginRecord } from '@/lib/axp/types'
import { cn } from '@/lib/utils'
import {
  Activity,
  Ban,
  CheckCircle2,
  Download,
  HeartPulse,
  Package,
  RefreshCw,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

/** 每个状态下可用的规范动作（含心跳与故障注入） */
function actionsFor(status: LifecycleState): { action: string; label: string; variant?: 'default' | 'outline' | 'ghost' | 'destructive'; icon: React.ComponentType<{ className?: string }> }[] {
  switch (status) {
    case 'registered':
      return [
        { action: 'resolve', label: 'resolve', icon: CheckCircle2 },
        { action: 'quarantine', label: '隔离', variant: 'outline', icon: Ban },
        { action: 'uninstall', label: '注销', variant: 'ghost', icon: Trash2 },
      ]
    case 'resolved':
      return [
        { action: 'activate', label: 'activate', icon: Zap },
        { action: 'quarantine', label: '隔离', variant: 'outline', icon: Ban },
        { action: 'uninstall', label: '注销', variant: 'ghost', icon: Trash2 },
      ]
    case 'active':
      return [
        { action: 'heartbeat', label: '心跳', variant: 'outline', icon: HeartPulse },
        { action: 'inject-fault', label: '注入故障', variant: 'outline', icon: Activity },
        { action: 'deactivate', label: 'deactivate', variant: 'outline', icon: Ban },
        { action: 'uninstall', label: '注销', variant: 'ghost', icon: Trash2 },
      ]
    case 'degraded':
      return [
        { action: 'recover', label: 'recover', icon: RefreshCw },
        { action: 'deactivate', label: 'deactivate', variant: 'outline', icon: Ban },
        { action: 'quarantine', label: '隔离', variant: 'outline', icon: Ban },
      ]
    case 'error':
      return [
        { action: 'resolve', label: '重新 resolve', icon: RefreshCw },
        { action: 'quarantine', label: '隔离', variant: 'outline', icon: Ban },
      ]
    case 'disabled':
      return [{ action: 'reenable', label: '重新启用', icon: RefreshCw }]
    default:
      return []
  }
}

function PluginCard({ plugin }: { plugin: PluginRecord }) {
  const { lifecycle, uninstall, busy, plugins } = useAxp()
  const [expanded, setExpanded] = useState(false)
  const dependents = plugins.filter(
    (p) => p.pluginId !== plugin.pluginId && p.dependsOn.includes(plugin.pluginId),
  )
  const actions = actionsFor(plugin.status)
  const isBusy = (a: string) => busy === `${plugin.pluginId}:${a}` || busy === `uninstall:${plugin.pluginId}`

  const run = (a: string) => {
    if (a === 'uninstall') {
      if (dependents.length > 0 && plugin.status === 'active') {
        toast({
          title: 'unregister 将被 EBUSY 拒绝',
          description: `存在依赖方：${dependents.map((d) => d.pluginId).join('、')}（规范 §4.1）`,
          variant: 'destructive',
        })
      }
      void uninstall(plugin.pluginId)
    } else {
      void lifecycle(plugin.pluginId, a)
    }
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className={cn(
          'border transition',
          plugin.status === 'active' ? 'border-emerald-200 shadow-sm' : 'border-zinc-200',
          plugin.status === 'error' && 'border-red-200',
          plugin.status === 'degraded' && 'border-orange-200',
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-zinc-900">{plugin.name}</h3>
                <span className="font-mono text-[10px] text-zinc-400">v{plugin.version}</span>
              </div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-emerald-700">
                {plugin.pluginId}
              </div>
            </div>
            <StatusBadge status={plugin.status} />
          </div>

          <p className="mt-2.5 line-clamp-2 text-xs leading-5 text-zinc-500">{plugin.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CategoryBadge category={plugin.category} />
            {plugin.dependsOn.length > 0 && (
              <span className="font-mono text-[10px] text-zinc-400">
                ⇠ depends: {plugin.dependsOn.map((d) => d.split('.').pop()).join(', ')}
              </span>
            )}
            {plugin.manifest.heartbeatMs ? (
              <span className="font-mono text-[10px] text-zinc-400">♥ {plugin.manifest.heartbeatMs / 1000}s</span>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <HealthBar health={plugin.health} />
            <span className="font-mono text-[10px] text-zinc-400">
              拓扑序 #{plugin.loadOrder} · 激活 {plugin.activations} 次
            </span>
          </div>

          {/* 动作按钮 */}
          <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3.5">
            {actions.map((a) => (
              <Button
                key={a.action}
                size="sm"
                variant={a.variant ?? 'default'}
                disabled={busy !== null}
                onClick={() => run(a.action)}
                className={cn(
                  'h-7 px-2.5 text-[11px] font-mono',
                  a.action === 'activate' && 'bg-emerald-600 hover:bg-emerald-500',
                  a.action === 'recover' && 'bg-emerald-600 hover:bg-emerald-500',
                  a.action === 'resolve' && 'bg-zinc-900 hover:bg-zinc-800',
                )}
                aria-label={`${plugin.pluginId} ${a.label}`}
              >
                <a.icon className="mr-1 h-3 w-3" />
                {a.label}
                {isBusy(a.action) && <span className="ml-1 animate-pulse">…</span>}
              </Button>
            ))}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-auto text-[11px] font-medium text-zinc-400 transition hover:text-emerald-700"
            >
              {expanded ? '收起清单' : '查看清单'}
            </button>
          </div>

          {/* 展开的清单详情 */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3.5 space-y-3 rounded-lg bg-zinc-50 p-3.5">
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      permissions（{plugin.permissions.length}）
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {plugin.permissions.map((p) => (
                        <PermissionChip key={p} perm={p} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      provides
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {plugin.provides.map((p) => (
                        <span
                          key={p.point}
                          className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 ring-1 ring-zinc-200"
                        >
                          {p.point}@{p.contract}
                        </span>
                      ))}
                    </div>
                  </div>
                  {dependents.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        被依赖（unregister 需 EBUSY 检查）
                      </div>
                      <div className="font-mono text-[10px] text-zinc-600">
                        {dependents.map((d) => d.pluginId).join(' · ')}
                      </div>
                    </div>
                  )}
                  <pre className="overflow-x-auto rounded bg-zinc-900 p-2.5 text-[10px] leading-relaxed text-zinc-300">
                    <code className="font-mono">
                      {JSON.stringify(plugin.manifest, null, 2)}
                    </code>
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function EventBusPanel() {
  const { events, refreshRegistry } = useAxp()
  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden border-zinc-800 bg-zinc-900 text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-mono text-xs font-semibold">axp:event-bus</span>
          <span className="font-mono text-[10px] text-zinc-500">审计轨迹 · 最近 40 条</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void refreshRegistry()}
          className="h-7 px-2 text-[11px] text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800"
          aria-label="刷新事件轨迹"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="max-h-96 flex-1">
        <div className="divide-y divide-zinc-800/70">
          <AnimatePresence initial={false}>
            {events.length === 0 && (
              <div className="px-4 py-10 text-center font-mono text-xs text-zinc-500">
                总线安静中 —— 对左侧插件执行生命周期动作，观察轨迹
              </div>
            )}
            {events.map((e) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-4 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <TopicChip topic={e.topic} level={e.level} />
                  <span className="shrink-0 font-mono text-[10px] text-zinc-500">
                    {new Date(e.createdAt).toLocaleTimeString('zh-CN', { hour12: false })}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 overflow-hidden font-mono text-[10px] text-zinc-400">
                  <span className="shrink-0 text-emerald-500/90">{e.source}</span>
                  {e.target && <span className="shrink-0">→ {e.target}</span>}
                  <span className="min-w-0 flex-1 truncate text-zinc-600">
                    {JSON.stringify(e.payload)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </Card>
  )
}

function MarketPanel() {
  const { market, plugins, installFromMarket, busy } = useAxp()
  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden border-zinc-200">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
        <Package className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-xs font-semibold text-zinc-900">插件市场</span>
        <span className="font-mono text-[10px] text-zinc-400">注册即进入 registered</span>
      </div>
      <div className="flex-1 space-y-3 p-4">
        {market.map((m) => {
          const installed = plugins.some((p) => p.pluginId === m.id)
          return (
            <div
              key={m.id}
              className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
                    <span className="truncate text-xs font-semibold text-zinc-800">{m.name}</span>
                    <span className="font-mono text-[10px] text-zinc-400">v{m.version}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-zinc-500">{m.id}</div>
                </div>
                <Button
                  size="sm"
                  variant={installed ? 'outline' : 'default'}
                  disabled={installed || busy !== null}
                  onClick={() => void installFromMarket(m.id)}
                  className={cn(
                    'h-7 shrink-0 px-2.5 text-[11px]',
                    !installed && 'bg-zinc-900 hover:bg-zinc-800',
                  )}
                >
                  <Download className="mr-1 h-3 w-3" />
                  {installed ? '已注册' : 'install'}
                </Button>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-zinc-500">{m.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {m.permissions.map((p) => (
                  <PermissionChip key={p} perm={p} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t border-zinc-100 px-4 py-2.5 text-[10px] leading-4 text-zinc-400">
        提示：Web Toolpack 声明了 net:fetch / secret:read 敏感权限——安装后观察策略链三态裁决（§6.1）。
      </div>
    </Card>
  )
}

export function PlaygroundTab() {
  const { plugins, loading } = useAxp()
  const [filter, setFilter] = useState<string>('all')

  const filtered = useMemo(
    () => (filter === 'all' ? plugins : plugins.filter((p) => p.status === filter)),
    [plugins, filter],
  )
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: plugins.length }
    for (const p of plugins) counts[p.status] = (counts[p.status] ?? 0) + 1
    return counts
  }, [plugins])

  const FILTERS = ['all', 'active', 'resolved', 'registered', 'degraded', 'error', 'disabled']

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle
          eyebrow="PLUGIN REGISTRY"
          title="插件注册表"
          desc="由真实 AXP 内核驱动：每个按钮都是一次规范动作，非法迁移将被 EBADTRANSITION 拒绝并弹出提示。"
        />

        {/* 状态过滤 */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const count = statusCounts[f] ?? 0
            if (f !== 'all' && count === 0) return null
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-full border px-3 py-1 font-mono text-[11px] transition',
                  filter === f
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400',
                )}
              >
                {f === 'all' ? '全部' : f} · {count}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-zinc-200">
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-7 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <PluginCard key={p.pluginId} plugin={p} />
            ))}
          </div>
        )}
      </section>

      <section className="grid min-w-0 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <EventBusPanel />
        <MarketPanel />
      </section>
    </div>
  )
}
