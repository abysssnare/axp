'use client'

/** AXP 单页应用外壳：页头导航 + 标签路由 + 粘性页脚 */

import { useState } from 'react'
import { AxpProvider, useAxp } from './store'
import { OverviewTab } from './overview'
import { SpecTab } from './spec-browser'
import { PlaygroundTab } from './playground'
import { MemoryLab } from './memory-lab'
import { InfrastructureTab, type CodeFile } from './infrastructure'
import { SPEC_META } from '@/lib/axp/spec'
import { cn } from '@/lib/utils'
import { BookOpen, Boxes, Brain, FlaskConical, Layers } from 'lucide-react'

const TABS = [
  { id: 'overview', label: '概览', icon: Layers },
  { id: 'spec', label: '规范', icon: BookOpen },
  { id: 'playground', label: '演练场', icon: FlaskConical },
  { id: 'memory', label: '记忆实验室', icon: Brain },
  { id: 'infra', label: '内核源码', icon: Boxes },
]

function Shell({ files }: { files: CodeFile[] }) {
  const [tab, setTab] = useState('overview')
  const { plugins, events } = useAxp()
  const activeCount = plugins.filter((p) => p.status === 'active').length

  return (
    <div className="flex min-h-screen flex-col bg-[#fafaf9]">
      {/* 页头 */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          {/* Logo */}
          <button
            onClick={() => setTab('overview')}
            className="flex shrink-0 items-center gap-2.5"
            aria-label="回到概览"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 font-mono text-[13px] font-bold text-emerald-400">
              ax
            </span>
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="font-mono text-sm font-bold tracking-tight text-zinc-900">AXP</span>
              <span className="text-[10px] text-zinc-500">智能体扩展协议</span>
            </span>
          </button>

          {/* 标签导航 */}
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="主导航">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition',
                  tab === t.id
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
                )}
                aria-current={tab === t.id ? 'page' : undefined}
              >
                <t.icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </nav>

          {/* 运行状态指示 */}
          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 lg:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              kernel v{SPEC_META.version} · {activeCount}/{plugins.length} active · {events.length} events
            </span>
          </div>
        </div>
      </header>

      {/* 主体 */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {tab === 'overview' && <OverviewTab onNavigate={setTab} />}
        {tab === 'spec' && <SpecTab />}
        {tab === 'playground' && <PlaygroundTab />}
        {tab === 'memory' && <MemoryLab />}
        {tab === 'infra' && <InfrastructureTab files={files} />}
      </main>

      {/* 粘性页脚 */}
      <footer className="mt-auto border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 font-mono text-[10px] font-bold text-emerald-400">
              ax
            </span>
            <div className="text-[11px] leading-4 text-zinc-500">
              <div>
                AXP {SPEC_META.fullName} · v{SPEC_META.version} {SPEC_META.status}
              </div>
              <div className="text-zinc-400">
                {SPEC_META.organization} · {SPEC_META.license}
              </div>
            </div>
          </div>
          <div className="font-mono text-[10px] text-zinc-400">
            本站即参考实现：注册表 / 总线 / 权限代理全部真实运行
          </div>
        </div>
      </footer>
    </div>
  )
}

export function AxpApp({ files }: { files: CodeFile[] }) {
  return (
    <AxpProvider>
      <Shell files={files} />
    </AxpProvider>
  )
}
