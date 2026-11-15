'use client'

/** AXP 共享展示组件：状态徽章 / 类别徽章 / 健康条 / 权限标签 */

import { Badge } from '@/components/ui/badge'
import { PERMISSION_DESCRIPTIONS } from '@/lib/axp/permissions'
import type { LifecycleState, Permission } from '@/lib/axp/types'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<LifecycleState, string> = {
  registered: 'bg-stone-100 text-stone-700 border-stone-300',
  resolved: 'bg-amber-50 text-amber-700 border-amber-300',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  degraded: 'bg-orange-50 text-orange-700 border-orange-300',
  error: 'bg-red-50 text-red-700 border-red-300',
  disabled: 'bg-zinc-100 text-zinc-500 border-zinc-300 line-through',
}

const STATUS_DOT: Record<LifecycleState, string> = {
  registered: 'bg-stone-400',
  resolved: 'bg-amber-400',
  active: 'bg-emerald-500',
  degraded: 'bg-orange-500',
  error: 'bg-red-500',
  disabled: 'bg-zinc-400',
}

export function StatusBadge({ status, className }: { status: LifecycleState; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLE[status],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
      {status}
    </span>
  )
}

const CATEGORY_STYLE: Record<string, string> = {
  memory: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/25',
  tool: 'bg-teal-600/10 text-teal-700 border-teal-600/25',
  trigger: 'bg-amber-600/10 text-amber-700 border-amber-600/25',
  policy: 'bg-rose-600/10 text-rose-700 border-rose-600/25',
  ui: 'bg-fuchsia-600/10 text-fuchsia-700 border-fuchsia-600/25',
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant="outline" className={cn('font-mono text-[10px]', CATEGORY_STYLE[category] ?? 'bg-zinc-100 text-zinc-600')}>
      {category}
    </Badge>
  )
}

export function HealthBar({ health }: { health: number }) {
  const color =
    health >= 80 ? 'bg-emerald-500' : health >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2" aria-label={`健康分 ${health}`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-200">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${health}%` }} />
      </div>
      <span className="font-mono text-[10px] text-zinc-500">{health}</span>
    </div>
  )
}

const SENSITIVE = new Set(['net:fetch', 'secret:read', 'spawn:worker'])

export function PermissionChip({ perm }: { perm: Permission }) {
  const sensitive = SENSITIVE.has(perm)
  return (
    <span
      title={PERMISSION_DESCRIPTIONS[perm] ?? perm}
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px]',
        sensitive
          ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
          : 'bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200',
      )}
    >
      {perm}
      {sensitive && <span className="ml-1 text-[9px]">!</span>}
    </span>
  )
}

export function TopicChip({ topic, level }: { topic: string; level?: string }) {
  const isDenied = topic.includes('denied')
  const isWarn = level === 'warn' || topic.includes('degraded')
  const isError = level === 'error' || topic.includes('failed')
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 font-mono text-[10px] font-medium',
        isDenied || isError
          ? 'bg-red-50 text-red-700'
          : isWarn
            ? 'bg-amber-50 text-amber-700'
            : 'bg-emerald-50 text-emerald-700',
      )}
    >
      {topic}
    </span>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string
  title: string
  desc?: string
}) {
  return (
    <div className="mb-5">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-700">
        {eyebrow}
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{title}</h2>
      {desc && <p className="mt-1.5 max-w-2xl text-sm text-zinc-500">{desc}</p>}
    </div>
  )
}
