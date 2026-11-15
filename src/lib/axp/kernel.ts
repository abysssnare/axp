/**
 * AXP v1.1.0 — 内核 (Kernel)
 * 组装注册表 / 生命周期 / 权限代理 / 事件总线，
 * 提供面向宿主的高层 API：install → resolve → activate → ... → uninstall
 *
 * 内核是唯一允许发布 axp:* 保留主题的组件（规范 8.1）。
 */

import { db } from '@/lib/db'
import { publish } from './event-bus'
import {
  assertTransition,
  getPlugin,
  listPlugins,
  registerPlugin,
  resolvePlugin,
  toRecord,
} from './registry'
import { checkActivationGate } from './registry'
import {
  EVENT_TOPICS,
  type BusEvent,
  type LifecycleAction,
  type PluginManifest,
  type PluginRecord,
} from './types'

/** 内核版本（引擎约束的基准实现版本） */
export const AXP_KERNEL_VERSION = '1.1.0'

/* ------------------------------------------------------------------ */
/* 安装（注册 + 广播）                                                   */
/* ------------------------------------------------------------------ */

export async function install(
  manifest: PluginManifest,
  category: string,
): Promise<PluginRecord> {
  const record = await registerPlugin(manifest, category)
  await publish({
    topic: EVENT_TOPICS.pluginRegistered,
    source: 'host',
    payload: {
      pluginId: record.pluginId,
      version: record.version,
      provides: record.provides.map((p) => p.point),
    },
  })
  return record
}

/* ------------------------------------------------------------------ */
/* 生命周期驱动                                                        */
/* ------------------------------------------------------------------ */

export async function transition(
  pluginId: string,
  action: LifecycleAction,
): Promise<PluginRecord> {
  const record = await getPlugin(pluginId)
  if (!record) throw new Error(`ENOTFOUND: 插件 "${pluginId}" 未注册`)

  const target = assertTransition(record.status, action)

  // 激活门：额外校验 + 依赖就绪
  if (action === 'activate') {
    const gate = checkActivationGate(record)
    if (!gate.ok) throw new Error(`EGATE: ${gate.reason}`)
    const deps = record.dependsOn
    if (deps.length) {
      const all = await listPlugins()
      const notReady = deps.filter((dep) => {
        const d = all.find((r) => r.pluginId === dep)
        return !d || d.status !== 'active'
      })
      if (notReady.length) {
        throw new Error(`EDEP: 依赖未激活 → ${notReady.join(', ')}`)
      }
    }
  }

  // resolve 需要走依赖解析
  if (action === 'resolve') {
    await resolvePlugin(pluginId)
    const resolved = await getPlugin(pluginId)
    await publish({
      topic: EVENT_TOPICS.pluginResolved,
      source: 'host',
      payload: { pluginId, loadOrder: resolved?.loadOrder ?? 0 },
    })
    return resolved!
  }

  const data: Record<string, unknown> = { status: target }
  if (action === 'activate') data.activations = { increment: 1 }
  if (action === 'activate' || action === 'recover') data.health = 100
  if (action === 'quarantine') data.health = 0

  const row = await db.plugin.update({ where: { pluginId }, data: data as never })
  const next = toRecord(row)

  // 广播对应的保留主题
  const topicByAction: Partial<Record<LifecycleAction, string>> = {
    activate: EVENT_TOPICS.pluginActivated,
    deactivate: EVENT_TOPICS.pluginDeactivated,
    recover: EVENT_TOPICS.pluginActivated,
    fail: EVENT_TOPICS.pluginFailed,
    quarantine: EVENT_TOPICS.pluginDegraded,
  }
  const topic = topicByAction[action]
  if (topic) {
    await publish({
      topic,
      source: 'host',
      payload: { pluginId, from: record.status, to: target },
    })
  }
  return next
}

/* ------------------------------------------------------------------ */
/* 卸载（注销 + 广播 + 清理）                                             */
/* ------------------------------------------------------------------ */

export async function uninstall(pluginId: string): Promise<void> {
  const record = await getPlugin(pluginId)
  if (!record) throw new Error(`ENOTFOUND: 插件 "${pluginId}" 未注册`)
  // 被依赖的插件不允许直接注销
  const all = await listPlugins()
  const dependents = all.filter(
    (r) => r.pluginId !== pluginId && r.dependsOn.includes(pluginId),
  )
  if (dependents.length && record.status === 'active') {
    throw new Error(
      `EBUSY: 仍有插件依赖它 → ${dependents.map((d) => d.pluginId).join(', ')}`,
    )
  }
  await db.plugin.delete({ where: { pluginId } })
  await publish({
    topic: EVENT_TOPICS.pluginRemoved,
    source: 'host',
    payload: { pluginId },
  })
}

/* ------------------------------------------------------------------ */
/* 心跳 / 健康分（规范 10，v1.1.0 新增）                                  */
/* ------------------------------------------------------------------ */

export async function heartbeat(pluginId: string): Promise<PluginRecord> {
  const record = await getPlugin(pluginId)
  if (!record) throw new Error(`ENOTFOUND: 插件 "${pluginId}" 未注册`)
  // 演练场模拟：健康分在 55-100 间随机回升
  const score = Math.min(100, Math.max(55, record.health + Math.floor(Math.random() * 20)))
  const row = await db.plugin.update({
    where: { pluginId },
    data: { health: score },
  })
  await publish({
    topic: EVENT_TOPICS.healthTick,
    source: pluginId,
    payload: { score },
    level: 'debug',
  })
  return toRecord(row)
}

/** 注入一次心跳失联，观察降级路径 */
export async function injectFault(pluginId: string): Promise<PluginRecord> {
  const record = await getPlugin(pluginId)
  if (!record) throw new Error(`ENOTFOUND: 插件 "${pluginId}" 未注册`)
  const score = Math.max(0, record.health - 60)
  const status = score < 40 ? 'degraded' : record.status
  const row = await db.plugin.update({
    where: { pluginId },
    data: { health: score, status },
  })
  if (status === 'degraded') {
    await publish({
      topic: EVENT_TOPICS.pluginDegraded,
      source: 'host',
      payload: { pluginId, reason: 'heartbeat-missed x3', health: score },
      level: 'warn',
    })
  }
  return toRecord(row)
}

/* ------------------------------------------------------------------ */
/* 查询便捷方法                                                         */
/* ------------------------------------------------------------------ */

export async function snapshot(): Promise<{
  plugins: PluginRecord[]
  events: BusEvent[]
}> {
  const [plugins, events] = await Promise.all([listPlugins(), import('./event-bus').then((m) => m.tailEvents(40))])
  return { plugins, events }
}
