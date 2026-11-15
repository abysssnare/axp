'use client'

/** 规范浏览器：左侧章节导航 + 右侧正文渲染（表格/代码/列表/注记） */

import { useMemo, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SPEC_META, SPEC_SECTIONS, type SpecBlock } from '@/lib/axp/spec'
import { cn } from '@/lib/utils'
import { BookOpen, ChevronRight, Info } from 'lucide-react'

function Block({ b }: { b: SpecBlock }) {
  switch (b.kind) {
    case 'subtitle':
      return (
        <h3 className="mt-7 mb-3 border-l-2 border-emerald-500 pl-3 text-sm font-semibold text-zinc-900">
          {b.text}
        </h3>
      )
    case 'para':
      return <p className="mb-4 text-sm leading-7 text-zinc-600">{b.text}</p>
    case 'list':
      return (
        <ul className="mb-4 space-y-2">
          {b.items?.map((it) => (
            <li key={it} className="flex gap-2.5 text-sm leading-6 text-zinc-600">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )
    case 'code':
      return (
        <pre className="mb-5 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-[11.5px] leading-relaxed text-zinc-100">
          <code className="font-mono">{b.code}</code>
        </pre>
      )
    case 'note':
      return (
        <div className="mb-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-6 text-amber-800">{b.text}</p>
        </div>
      )
    case 'table':
      return (
        <div className="mb-5 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                {b.table?.headers.map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.table?.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={cn(
                        'px-4 py-2.5 text-xs leading-5',
                        j === 0 ? 'font-mono font-medium text-emerald-700' : 'text-zinc-600',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

export function SpecTab() {
  const [activeId, setActiveId] = useState(SPEC_SECTIONS[0].id)
  const active = useMemo(
    () => SPEC_SECTIONS.find((s) => s.id === activeId) ?? SPEC_SECTIONS[0],
    [activeId],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* 章节导航 */}
      <aside>
        <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          <BookOpen className="h-3.5 w-3.5" />
          规范目录
        </div>
        <nav className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 bg-zinc-50/70 px-4 py-3">
            <div className="font-mono text-xs font-bold text-zinc-900">
              AXP / v{SPEC_META.version}
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500">{SPEC_META.fullName}</div>
          </div>
          <ScrollArea className="h-[420px] lg:h-[560px]">
            <ul className="p-1.5">
              {SPEC_SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition',
                      s.id === activeId
                        ? 'bg-emerald-50 text-emerald-900'
                        : 'text-zinc-600 hover:bg-zinc-50',
                    )}
                    aria-current={s.id === activeId ? 'true' : undefined}
                  >
                    <span
                      className={cn(
                        'font-mono text-[10px] tabular-nums',
                        s.id === activeId ? 'text-emerald-600' : 'text-zinc-400',
                      )}
                    >
                      §{s.no}
                    </span>
                    <span className="flex-1 text-xs font-medium leading-snug">{s.title}</span>
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition',
                        s.id === activeId
                          ? 'text-emerald-600'
                          : 'text-zinc-300 group-hover:text-zinc-400',
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </nav>
      </aside>

      {/* 正文 */}
      <article
        className="min-w-0 rounded-xl border border-zinc-200 bg-white p-6 sm:p-8"
        key={active.id}
      >
        <header className="mb-6 border-b border-zinc-100 pb-5">
          <div className="flex items-center gap-3">
            <span className="rounded bg-zinc-900 px-2 py-1 font-mono text-[10px] font-bold text-emerald-400">
              §{active.no}
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
              {active.title}
            </h2>
          </div>
          <p className="mt-2 text-xs text-zinc-500">{active.summary}</p>
        </header>
        <div>
          {active.blocks.map((b, i) => (
            <Block key={i} b={b} />
          ))}
        </div>
      </article>
    </div>
  )
}
