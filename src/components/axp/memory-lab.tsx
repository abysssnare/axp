'use client'

/** 记忆实验室：agent.memory 扩展点契约的可视化操作台 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { SectionTitle } from './badges'
import { useAxp } from './store'
import { cn } from '@/lib/utils'
import { Brain, Eraser, Pin, PinOff, Search, Sparkles, Trash2 } from 'lucide-react'

const IMPORTANCE_LABELS = ['', '边缘', '低', '常规', '重要', '核心']

export function MemoryLab() {
  const { memories, writeMemory, forgetMemory, pinMemory, touchMemory, sweep, plugins, busy, refreshMemories } = useAxp()
  const memoryPlugin = plugins.find((p) => p.pluginId === 'axp.core.memory')
  const memoryActive = memoryPlugin?.status === 'active'

  // 写入表单
  const [key, setKey] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [importance, setImportance] = useState(3)
  const [pinned, setPinned] = useState(false)

  // 召回搜索
  const [query, setQuery] = useState('')
  const [lastQuery, setLastQuery] = useState<string | null>(null)

  const submitWrite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim() || !content.trim()) return
    await writeMemory({
      key: key.trim(),
      content: content.trim(),
      tags: tags
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      importance,
      pinned,
    })
    setKey('')
    setContent('')
    setTags('')
    setImportance(3)
    setPinned(false)
  }

  const submitRecall = async (e: React.FormEvent) => {
    e.preventDefault()
    await refreshMemories(query.trim() || undefined)
    setLastQuery(query.trim() || null)
  }

  const clearRecall = async () => {
    setQuery('')
    setLastQuery(null)
    await refreshMemories()
  }

  const hitCount = memories.length

  return (
    <section>
      <SectionTitle
        eyebrow="AGENT.MEMORY LAB"
        title="记忆系统实验室"
        desc="对 axp.core.memory 插件执行 write / recall / forget / sweep，每个操作都遵循 §10 契约并留痕于总线。"
      />

      {!memoryActive && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <Brain className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-6 text-amber-800">
            记忆插件当前状态为 <span className="font-mono font-semibold">{memoryPlugin?.status ?? '未注册'}</span>。
            依据规范 §7 的运行期权限复核，写入将被 EPERM 拒绝——请先在上方注册表中
            {memoryPlugin?.status === 'registered' ? 'resolve 并 activate' : 'activate'} 该插件。
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* 写入面板 */}
        <Card className="h-fit border-zinc-200">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-zinc-900">write · 写入记忆</h3>
            </div>
            <form onSubmit={submitWrite} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="mem-key" className="text-xs">
                  key <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mem-key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="user:preference:theme"
                  className="h-9 font-mono text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mem-content" className="text-xs">
                  content <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="mem-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="用户偏好深色主题，正文应保持高对比……"
                  className="min-h-[72px] text-xs leading-5"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mem-tags" className="text-xs">
                  tags <span className="text-zinc-400">（逗号分隔，最多 8 个）</span>
                </Label>
                <Input
                  id="mem-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="preference, ui, user"
                  className="h-9 font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">importance · {IMPORTANCE_LABELS[importance]}</Label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setImportance(n)}
                      className={cn(
                        'h-7 flex-1 rounded font-mono text-[11px] transition',
                        importance === n
                          ? n >= 4
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
                      )}
                      aria-pressed={importance === n}
                      aria-label={`重要性 ${n} ${IMPORTANCE_LABELS[n]}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="h-3.5 w-3.5 accent-emerald-600"
                />
                pinned 置顶（sweep 永不淘汰，召回 +30）
              </label>
              <Button
                type="submit"
                disabled={!memoryActive || busy === 'memory:write' || !key.trim() || !content.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500"
              >
                {busy === 'memory:write' ? '写入中…' : '写入（axp:memory:written）'}
              </Button>
            </form>

            <div className="mt-5 border-t border-zinc-100 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void sweep()}
                className="w-full text-[11px]"
                disabled={!memoryActive}
              >
                <Eraser className="mr-1.5 h-3.5 w-3.5" />
                sweep · 淘汰低价值记忆
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 召回面板 */}
        <Card className="flex min-h-[420px] flex-col border-zinc-200">
          <div className="border-b border-zinc-100 p-4">
            <form onSubmit={submitRecall} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="recall：按 key / content / tag 检索…"
                  className="h-9 pl-8 font-mono text-xs"
                />
              </div>
              <Button type="submit" size="sm" variant="default" className="h-9 bg-zinc-900 px-4 hover:bg-zinc-800">
                recall
              </Button>
              {lastQuery !== null && (
                <Button type="button" size="sm" variant="ghost" onClick={() => void clearRecall()} className="h-9 px-3 text-xs text-zinc-500">
                  清除
                </Button>
              )}
            </form>
            {lastQuery !== null && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                <Badge variant="outline" className="font-mono text-[10px] text-emerald-700">
                  q=&quot;{lastQuery}&quot;
                </Badge>
                <span>命中 {hitCount} 条</span>
                <span className="text-zinc-400">（score = relevance + importance×6 + freshness + pinned×30）</span>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {memories.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <Brain className="h-8 w-8 text-zinc-300" />
                  <p className="text-xs text-zinc-400">
                    {memoryActive ? '记忆为空——用左侧表单写下第一条记忆' : '激活记忆插件后开始实验'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {memories.map((m) => (
                      <motion.li
                        key={m.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className={cn(
                          'group rounded-lg border p-3.5 transition',
                          m.pinned ? 'border-amber-200 bg-amber-50/40' : 'border-zinc-200 bg-white hover:border-zinc-300',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {m.pinned && <Pin className="h-3 w-3 text-amber-500" />}
                              <span className="font-mono text-xs font-semibold text-emerald-800">{m.key}</span>
                              <span className="font-mono text-[10px] text-zinc-400">@{m.scope}</span>
                              {m.score !== undefined && (
                                <Badge variant="outline" className="h-4 px-1.5 font-mono text-[9px] text-zinc-500">
                                  score {m.score}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              onClick={() => void pinMemory(m.id, !m.pinned)}
                              className="rounded p-1 text-zinc-400 hover:bg-amber-50 hover:text-amber-600"
                              aria-label={m.pinned ? '取消置顶' : '置顶'}
                              title={m.pinned ? '取消置顶' : '置顶'}
                            >
                              {m.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => void touchMemory(m.id)}
                              className="rounded p-1 font-mono text-[10px] text-zinc-400 hover:bg-emerald-50 hover:text-emerald-700"
                              aria-label="触达（记录访问）"
                              title="touch · 记录访问"
                            >
                              touch
                            </button>
                            <button
                              onClick={() => void forgetMemory(m.id)}
                              className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="遗忘该记忆"
                              title="forget · 遗忘"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-1.5 text-xs leading-5 text-zinc-600">{m.content}</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {m.tags.map((t) => (
                            <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                              #{t}
                            </span>
                          ))}
                          <span className="ml-auto flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                            <span title={`importance ${m.importance}`}>
                              {'●'.repeat(m.importance)}
                              <span className="text-zinc-300">{'●'.repeat(5 - m.importance)}</span>
                            </span>
                            <span>×{m.accessCount}</span>
                            <span>{new Date(m.lastAccessedAt).toLocaleDateString('zh-CN')}</span>
                          </span>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </section>
  )
}
