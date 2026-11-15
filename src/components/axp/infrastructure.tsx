'use client'

/** 基础设施源码浏览器：展示真实的 AXP 内核实现（服务端读取磁盘文件传入） */

import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SectionTitle } from './badges'
import { cn } from '@/lib/utils'
import { FileCode2, Terminal } from 'lucide-react'

export interface CodeFile {
  path: string
  desc: string
  code: string
}

export function InfrastructureTab({ files }: { files: CodeFile[] }) {
  const [activePath, setActivePath] = useState(files[0]?.path ?? '')
  const active = files.find((f) => f.path === activePath) ?? files[0]
  const lineCount = active?.code.split('\n').length ?? 0

  return (
    <div>
      <SectionTitle
        eyebrow="REFERENCE IMPLEMENTATION"
        title="内核基础设施源码"
        desc="以下即本站背后的真实内核实现（运行时从磁盘读取，非副本）。协议的每个语义都能在此找到对应代码。"
      />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* 文件树 */}
        <aside className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3">
            <FileCode2 className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-mono text-xs font-semibold text-zinc-800">src/lib/axp/</span>
          </div>
          <ul className="p-1.5">
            {files.map((f) => (
              <li key={f.path}>
                <button
                  onClick={() => setActivePath(f.path)}
                  className={cn(
                    'w-full rounded-lg px-3 py-2.5 text-left transition',
                    f.path === activePath ? 'bg-emerald-50' : 'hover:bg-zinc-50',
                  )}
                  aria-current={f.path === activePath ? 'true' : undefined}
                >
                  <div
                    className={cn(
                      'font-mono text-[11px] font-semibold',
                      f.path === activePath ? 'text-emerald-800' : 'text-zinc-700',
                    )}
                  >
                    {f.path}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-zinc-400">{f.desc}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* 代码视图 */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-mono text-xs text-zinc-300">{active?.path}</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500">
              <span>{lineCount} lines</span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-400">TypeScript</span>
            </div>
          </div>
          <ScrollArea className="max-h-[620px]">
            <pre className="p-4 text-[11px] leading-[1.7] text-zinc-300">
              <code className="font-mono">{active?.code}</code>
            </pre>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
