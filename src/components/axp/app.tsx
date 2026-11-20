'use client'

/** AXP 单页应用外壳：页头导航 + 标签路由 + 页脚 */

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
  const { plugins, events, loading } = useAxp()
  const activeCount = plugins.filter((p) => p.status === 'active').length
  const navigate = (nextTab: string) => {
    setTab(nextTab)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9f6]">
      <header className="sticky top-0 z-40 border-b border-[#e1eae3] bg-[#fcfdfb]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4 sm:px-6 lg:h-[72px] lg:flex-nowrap">
          <div className="flex h-14 w-full items-center justify-between lg:h-auto lg:w-auto">
            <button onClick={() => navigate('overview')} className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" aria-label="回到概览">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#173b30] font-mono text-[13px] font-bold text-emerald-300">ax</span>
              <span className="flex flex-col items-start leading-tight">
                <span className="font-mono text-sm font-bold tracking-tight text-[#173b30]">AXP</span>
                <span className="text-[10px] text-zinc-500">智能体扩展协议</span>
              </span>
            </button>
            <span className="font-mono text-[10px] text-zinc-400 lg:hidden">v{SPEC_META.version} · {SPEC_META.status}</span>
          </div>

          <nav className="-mx-4 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 lg:pb-0" aria-label="主导航">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => navigate(t.id)} className={cn('flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-[13px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-700', tab === t.id ? 'bg-[#e7f2e9] text-[#205d40]' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900')} aria-current={tab === t.id ? 'page' : undefined}>
                <t.icon className="hidden h-3.5 w-3.5 sm:block" />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-[#e1eae3] bg-white px-3 py-2 xl:flex">
            <span className={cn('h-1.5 w-1.5 rounded-full', loading ? 'bg-zinc-400' : 'bg-emerald-500')} />
            <span className="font-mono text-[10px] text-zinc-500">{loading ? '正在读取内核状态' : `${activeCount}/${plugins.length} active · ${events.length} events`}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {tab === 'overview' && <OverviewTab onNavigate={navigate} />}
        {tab === 'spec' && <SpecTab />}
        {tab === 'playground' && <PlaygroundTab />}
        {tab === 'memory' && <MemoryLab />}
        {tab === 'infra' && <InfrastructureTab files={files} />}
      </main>

      <footer className="mt-auto border-t border-[#e1eae3] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-7 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#173b30] font-mono text-[10px] font-bold text-emerald-300">ax</span>
            <div className="text-[11px] leading-5 text-zinc-500">
              <div className="font-medium text-zinc-700">AXP {SPEC_META.fullName} · v{SPEC_META.version}</div>
              <div>{SPEC_META.organization} · {SPEC_META.license}</div>
            </div>
          </div>
          <div className="font-mono text-[10px] text-zinc-400">OPEN PROTOCOL FOR AGENT EXTENSIONS</div>
        </div>
      </footer>
    </div>
  )
}

export function AxpApp({ files }: { files: CodeFile[] }) {
  return <AxpProvider><Shell files={files} /></AxpProvider>
}
