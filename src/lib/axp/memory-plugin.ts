/**
 * AXP v1.1.0 — agent.memory 扩展点参考实现
 * 「简单记忆系统」插件的内核侧实现：
 *   write   写入一条记忆（memory:write）
 *   recall  按查询词 + 标签 + 重要度权重召回（memory:read）
 *   forget  删除一条记忆（memory:forget）
 *   sweep   淘汰低价值记忆（pinned 永不淘汰）
 *
 * 每个操作都会向总线发布对应主题，形成完整审计轨迹。
 */

import { db } from '@/lib/db'
import { publish } from './event-bus'
import { EVENT_TOPICS } from './types'

export interface MemoryWriteInput {
  key: string
  content: string
  tags?: string[]
  importance?: number
  scope?: string
  pinned?: boolean
}

export interface MemoryRecallQuery {
  q?: string
  tag?: string
  scope?: string
  limit?: number
}

/** 写入记忆（同 scope + key 覆盖更新） */
export async function writeMemory(input: MemoryWriteInput) {
  const importance = clamp(Math.round(input.importance ?? 3), 1, 5)
  const tags = (input.tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8)

  const existing = await db.memoryEntry.findFirst({
    where: { scope: input.scope ?? 'default', key: input.key },
  })

  const row = existing
    ? await db.memoryEntry.update({
        where: { id: existing.id },
        data: {
          content: input.content,
          tags: JSON.stringify(tags),
          importance,
          pinned: input.pinned ?? existing.pinned,
          lastAccessedAt: new Date(),
        },
      })
    : await db.memoryEntry.create({
        data: {
          scope: input.scope ?? 'default',
          key: input.key,
          content: input.content,
          tags: JSON.stringify(tags),
          importance,
          pinned: input.pinned ?? false,
        },
      })

  await publish({
    topic: EVENT_TOPICS.memoryWritten,
    source: 'axp.core.memory',
    payload: { key: row.key, scope: row.scope, importance, tags, updated: !!existing },
  })
  return serialize(row)
}

/** 召回记忆：q 命中 key/content 加权 + importance + 新近度 + 置顶 */
export async function recallMemory(query: MemoryRecallQuery) {
  const limit = clamp(query.limit ?? 20, 1, 100)
  const rows = await db.memoryEntry.findMany({
    where: {
      ...(query.scope ? { scope: query.scope } : {}),
      ...(query.tag
        ? { tags: { contains: `"${query.tag.toLowerCase()}"` } }
        : {}),
    },
    orderBy: [{ pinned: 'desc' }, { importance: 'desc' }, { lastAccessedAt: 'desc' }],
    take: 200,
  })

  const q = query.q?.trim().toLowerCase()
  const now = Date.now()
  const scored = rows
    .map((r) => {
      const hitKey = q && r.key.toLowerCase().includes(q)
      const hitContent = q && r.content.toLowerCase().includes(q)
      const hitTag = q && r.tags.toLowerCase().includes(q)
      const relevance = q
        ? (hitKey ? 40 : 0) + (hitContent ? 25 : 0) + (hitTag ? 15 : 0)
        : 20
      const freshness = Math.max(
        0,
        20 - Math.floor((now - r.lastAccessedAt.getTime()) / 86_400_000),
      )
      const score = relevance + r.importance * 6 + freshness + (r.pinned ? 30 : 0)
      return { ...serialize(r), score }
    })
    .filter((r) => (q ? r.score > 45 || r.pinned : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  if (query.q) {
    await publish({
      topic: EVENT_TOPICS.memoryRecalled,
      source: 'axp.core.memory',
      payload: { q: query.q, matches: scored.length },
      level: 'debug',
    })
  }
  return scored
}

/** 单条触达（记录访问，用于新近度衰减） */
export async function touchMemory(id: string) {
  const row = await db.memoryEntry.update({
    where: { id },
    data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
  })
  return serialize(row)
}

/** 遗忘指定记忆 */
export async function forgetMemory(id: string) {
  const row = await db.memoryEntry.delete({ where: { id } })
  await publish({
    topic: EVENT_TOPICS.memoryForgotten,
    source: 'axp.core.memory',
    payload: { key: row.key, scope: row.scope },
    level: 'warn',
  })
  return serialize(row)
}

/** 置顶 / 取消置顶 */
export async function pinMemory(id: string, pinned: boolean) {
  const row = await db.memoryEntry.update({ where: { id }, data: { pinned } })
  return serialize(row)
}

/** 淘汰：删除非置顶、重要性 ≤ 2 且 7 天未访问的记忆 */
export async function sweepMemory() {
  const stale = new Date(Date.now() - 7 * 86_400_000)
  const victims = await db.memoryEntry.findMany({
    where: { pinned: false, importance: { lte: 2 }, lastAccessedAt: { lt: stale } },
  })
  for (const v of victims) {
    await db.memoryEntry.delete({ where: { id: v.id } })
    await publish({
      topic: EVENT_TOPICS.memoryForgotten,
      source: 'axp.core.memory',
      payload: { key: v.key, scope: v.scope, reason: 'sweep' },
      level: 'debug',
    })
  }
  return victims.map(serialize)
}

function serialize(r: {
  id: string
  pluginId: string
  scope: string
  key: string
  content: string
  tags: string
  importance: number
  accessCount: number
  pinned: boolean
  createdAt: Date
  lastAccessedAt: Date
}) {
  return {
    id: r.id,
    pluginId: r.pluginId,
    scope: r.scope,
    key: r.key,
    content: r.content,
    tags: JSON.parse(r.tags || '[]') as string[],
    importance: r.importance,
    accessCount: r.accessCount,
    pinned: r.pinned,
    createdAt: r.createdAt.toISOString(),
    lastAccessedAt: r.lastAccessedAt.toISOString(),
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
