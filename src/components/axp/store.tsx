'use client'

/**
 * AXP 演练场的前端状态中枢：
 * 持有注册表快照 / 事件轨迹 / 记忆条目，封装全部 API 调用与错误提示。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from '@/hooks/use-toast'
import type { BusEvent, PluginManifest, PluginRecord } from '@/lib/axp/types'

export interface MemoryItem {
  id: string
  pluginId: string
  scope: string
  key: string
  content: string
  tags: string[]
  importance: number
  accessCount: number
  pinned: boolean
  createdAt: string
  lastAccessedAt: string
  score?: number
}

interface AxpStore {
  plugins: PluginRecord[]
  events: BusEvent[]
  market: PluginManifest[]
  memories: MemoryItem[]
  loading: boolean
  busy: string | null
  refreshRegistry: () => Promise<void>
  refreshMemories: (q?: string) => Promise<void>
  lifecycle: (pluginId: string, action: string) => Promise<void>
  installFromMarket: (marketId: string) => Promise<void>
  uninstall: (pluginId: string) => Promise<void>
  writeMemory: (input: {
    key: string
    content: string
    tags?: string[]
    importance?: number
    pinned?: boolean
  }) => Promise<void>
  forgetMemory: (id: string) => Promise<void>
  pinMemory: (id: string, pinned: boolean) => Promise<void>
  touchMemory: (id: string) => Promise<void>
  sweep: () => Promise<void>
}

const Ctx = createContext<AxpStore | null>(null)

function errMessage(res: { error?: { message?: string } }): string {
  return res.error?.message ?? '请求失败'
}

export function AxpProvider({ children }: { children: ReactNode }) {
  const [plugins, setPlugins] = useState<PluginRecord[]>([])
  const [events, setEvents] = useState<BusEvent[]>([])
  const [market, setMarket] = useState<PluginManifest[]>([])
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const bootedRef = useRef(false)

  const refreshRegistry = useCallback(async () => {
    const res = await fetch('/api/plugins', { cache: 'no-store' })
    const data = (await res.json()) as {
      plugins: PluginRecord[]
      events: BusEvent[]
      market: PluginManifest[]
    }
    setPlugins(data.plugins ?? [])
    setEvents(data.events ?? [])
    setMarket(data.market ?? [])
  }, [])

  const refreshMemories = useCallback(async (q?: string) => {
    const url = q
      ? `/api/memory?q=${encodeURIComponent(q)}`
      : '/api/memory?limit=50'
    const res = await fetch(url, { cache: 'no-store' })
    const data = (await res.json()) as { memories: MemoryItem[] }
    setMemories(data.memories ?? [])
  }, [])

  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    ;(async () => {
      try {
        await Promise.all([refreshRegistry(), refreshMemories()])
      } catch {
        toast({ title: '加载失败', description: '无法连接 AXP 内核', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshRegistry, refreshMemories])

  // 轮询：活跃插件存在时每 6 秒拉取一次快照，模拟实时总线
  useEffect(() => {
    const t = setInterval(
      () => {
        refreshRegistry().catch(() => undefined)
      },
      6000,
    )
    return () => clearInterval(t)
  }, [refreshRegistry])

  const lifecycle = useCallback(
    async (pluginId: string, action: string) => {
      setBusy(`${pluginId}:${action}`)
      try {
        const res = await fetch(`/api/plugins/${pluginId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast({
            title: `${action} 被拒绝`,
            description: errMessage(data),
            variant: 'destructive',
          })
        } else {
          toast({ title: `${pluginId} → ${action} 完成` })
        }
        await Promise.all([refreshRegistry(), refreshMemories()])
      } finally {
        setBusy(null)
      }
    },
    [refreshRegistry, refreshMemories],
  )

  const installFromMarket = useCallback(
    async (marketId: string) => {
      setBusy(`install:${marketId}`)
      try {
        const res = await fetch('/api/plugins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marketId }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast({ title: '安装失败', description: errMessage(data), variant: 'destructive' })
        } else {
          toast({ title: `已注册 ${marketId}`, description: '清单校验通过，进入 registered 状态' })
        }
        await refreshRegistry()
      } finally {
        setBusy(null)
      }
    },
    [refreshRegistry],
  )

  const uninstall = useCallback(
    async (pluginId: string) => {
      setBusy(`uninstall:${pluginId}`)
      try {
        const res = await fetch(`/api/plugins/${pluginId}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) {
          toast({ title: '注销被拒绝', description: errMessage(data), variant: 'destructive' })
        } else {
          toast({ title: `已注销 ${pluginId}` })
        }
        await refreshRegistry()
      } finally {
        setBusy(null)
      }
    },
    [refreshRegistry],
  )

  const writeMemory = useCallback<AxpStore['writeMemory']>(
    async (input) => {
      setBusy('memory:write')
      try {
        const res = await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const data = await res.json()
        if (!res.ok) {
          toast({ title: '写入被拒绝', description: errMessage(data), variant: 'destructive' })
          return
        }
        toast({ title: `记忆已写入：${input.key}` })
        await Promise.all([refreshMemories(), refreshRegistry()])
      } finally {
        setBusy(null)
      }
    },
    [refreshMemories, refreshRegistry],
  )

  const forgetMemory = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: '遗忘失败', description: errMessage(data), variant: 'destructive' })
        return
      }
      toast({ title: '记忆已遗忘（axp:memory:forgotten）' })
      await Promise.all([refreshMemories(), refreshRegistry()])
    },
    [refreshMemories, refreshRegistry],
  )

  const pinMemory = useCallback(
    async (id: string, pinned: boolean) => {
      const res = await fetch(`/api/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: pinned ? 'pin' : 'unpin' }),
      })
      if (!res.ok) return
      await refreshMemories()
    },
    [refreshMemories],
  )

  const touchMemory = useCallback(
    async (id: string) => {
      await fetch(`/api/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'touch' }),
      })
      await refreshMemories()
    },
    [refreshMemories],
  )

  const sweep = useCallback(async () => {
    const res = await fetch('/api/memory', { method: 'PUT' })
    const data = await res.json()
    toast({
      title: `sweep 完成：淘汰 ${data.swept ?? 0} 条`,
      description: '规则：非置顶 + importance ≤ 2 + 7 天未访问',
    })
    await Promise.all([refreshMemories(), refreshRegistry()])
  }, [refreshMemories, refreshRegistry])

  const value = useMemo<AxpStore>(
    () => ({
      plugins,
      events,
      market,
      memories,
      loading,
      busy,
      refreshRegistry,
      refreshMemories,
      lifecycle,
      installFromMarket,
      uninstall,
      writeMemory,
      forgetMemory,
      pinMemory,
      touchMemory,
      sweep,
    }),
    [
      plugins,
      events,
      market,
      memories,
      loading,
      busy,
      refreshRegistry,
      refreshMemories,
      lifecycle,
      installFromMarket,
      uninstall,
      writeMemory,
      forgetMemory,
      pinMemory,
      touchMemory,
      sweep,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAxp(): AxpStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAxp must be used within AxpProvider')
  return ctx
}
