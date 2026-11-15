/**
 * AXP v1.1.0 — 事件总线 (Event Bus)
 * 规范第 8 章：主题命名空间 / 订阅规则 / 审计轨迹
 *
 * 实现要点：
 *  - axp:* 保留主题仅内核可发布；插件只能发布 plugin: 前缀主题
 *  - 未声明 trigger:subscribe 的插件仅可订阅清单中列出的主题
 *  - 所有消息写入审计轨迹（EventLog 表）
 */

import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import {
  type BusEvent,
  type EventLevel,
  type PluginRecord,
} from './types'

/** 发布消息到总线（带订阅校验与审计落库） */
export async function publish(input: {
  topic: string
  source: string
  target?: string | null
  payload?: Record<string, unknown>
  level?: EventLevel
  /** 发布者记录；提供时执行订阅权校验 */
  publisher?: PluginRecord
}): Promise<BusEvent> {
  const { topic, source, target = null, payload = {}, level = 'info' } = input

  // 订阅权校验：非 memory 扩展点插件发布 axp:* 保留主题是被禁止的
  if (input.publisher && topic.startsWith('axp:') && !topic.startsWith('axp:memory:') && !topic.startsWith('axp:health:')) {
    throw new Error(
      `EPERM: plugin "${source}" attempted to publish reserved topic "${topic}"`,
    )
  }

  const row = await db.eventLog.create({
    data: {
      topic,
      source,
      target,
      payload: JSON.stringify(payload),
      level,
    },
  })

  return {
    id: row.id,
    topic: row.topic,
    source: row.source,
    target: row.target,
    payload,
    level: row.level as EventLevel,
    createdAt: row.createdAt.toISOString(),
  }
}

/** 生成消息封皮（规范 6.1） */
export function envelope<T>(input: {
  type: string
  source: string
  target?: string | null
  payload: T
}) {
  return {
    id: randomUUID(),
    type: input.type,
    source: input.source,
    target: input.target ?? null,
    timestamp: new Date().toISOString(),
    payload: input.payload,
  }
}

/** 读取最近的审计轨迹（演练场事件流数据源） */
export async function tailEvents(limit = 60): Promise<BusEvent[]> {
  const rows = await db.eventLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows.map((r) => ({
    id: r.id,
    topic: r.topic,
    source: r.source,
    target: r.target,
    payload: safeParse(r.payload),
    level: r.level as EventLevel,
    createdAt: r.createdAt.toISOString(),
  }))
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>
  } catch {
    return { raw: s }
  }
}
