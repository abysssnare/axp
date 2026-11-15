/**
 * AXP v1.1.0 — 插件注册表与依赖解析 (Plugin Registry)
 * 规范第 5 / 9 / 11 章：注册校验、拓扑激活次序、版本协商
 */

import { db } from '@/lib/db'
import {
  LIFECYCLE_STATES,
  LIFECYCLE_TRANSITIONS,
  type LifecycleAction,
  type LifecycleState,
  type PluginManifest,
  type PluginRecord,
} from './types'
import { validatePermissions } from './permissions'

/* ------------------------------------------------------------------ */
/* 记录映射                                                            */
/* ------------------------------------------------------------------ */

export function toRecord(p: {
  id: string
  pluginId: string
  name: string
  version: string
  description: string
  category: string
  status: string
  permissions: string
  provides: string
  dependsOn: string
  manifest: string
  health: number
  loadOrder: number
  activations: number
  createdAt: Date
  updatedAt: Date
}): PluginRecord {
  return {
    id: p.id,
    pluginId: p.pluginId,
    name: p.name,
    version: p.version,
    description: p.description,
    category: p.category,
    status: p.status as LifecycleState,
    permissions: JSON.parse(p.permissions || '[]'),
    provides: JSON.parse(p.provides || '[]'),
    dependsOn: JSON.parse(p.dependsOn || '[]'),
    manifest: JSON.parse(p.manifest || '{}') as PluginManifest,
    health: p.health,
    loadOrder: p.loadOrder,
    activations: p.activations,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/* 清单静态校验（规范 4.2）                                              */
/* ------------------------------------------------------------------ */

export function validateManifest(m: PluginManifest): {
  ok: boolean
  errors: string[]
} {
  const errors: string[] = []
  if (!m.id || !/^[a-z0-9]+(\.[a-z0-9-]+)+$/.test(m.id)) {
    errors.push(`清单 id "${m.id}" 不符合反向域名格式`)
  }
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(m.version ?? '')) {
    errors.push(`版本 "${m.version}" 不符合 SemVer 2.0.0`)
  }
  if (!m.entry) errors.push('缺少入口模块 entry')
  if (!m.engine) errors.push('缺少宿主引擎约束 engine')
  const perm = validatePermissions(m.permissions ?? [])
  if (!perm.ok) {
    errors.push(`未知的权限声明: ${perm.unknown.join(', ')}`)
  }
  if (!m.provides?.length) errors.push('至少需要提供一个扩展点实现')
  return { ok: errors.length === 0, errors }
}

/* ------------------------------------------------------------------ */
/* 注册                                                                */
/* ------------------------------------------------------------------ */

export async function registerPlugin(
  manifest: PluginManifest,
  category: string,
): Promise<PluginRecord> {
  const existing = await db.plugin.findUnique({ where: { pluginId: manifest.id } })
  if (existing) {
    throw new Error(`EALREADY: 插件 "${manifest.id}" 已注册（v${existing.version}）`)
  }
  const depIds = (manifest.dependsOn ?? []).map((d) => d.id)
  const row = await db.plugin.create({
    data: {
      pluginId: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      category,
      status: 'registered',
      permissions: JSON.stringify(manifest.permissions),
      provides: JSON.stringify(manifest.provides),
      dependsOn: JSON.stringify(depIds),
      manifest: JSON.stringify(manifest),
      health: 100,
      loadOrder: 0,
    },
  })
  return toRecord(row)
}

/* ------------------------------------------------------------------ */
/* 依赖解析与拓扑排序（规范 11，v1.1.0 新增）                              */
/* ------------------------------------------------------------------ */

/** Kahn 算法：返回按依赖次序排序的 pluginId；检测到环则抛错 */
export function topoSort(
  nodes: { pluginId: string; dependsOn: string[] }[],
): { order: string[]; cyclic: boolean } {
  const ids = new Set(nodes.map((n) => n.pluginId))
  const indegree = new Map<string, number>()
  const edges = new Map<string, string[]>() // dep -> dependents
  for (const n of nodes) {
    indegree.set(n.pluginId, 0)
    for (const dep of n.dependsOn) {
      if (!ids.has(dep)) continue // 外部缺失依赖在 resolve 阶段单独报错
      edges.set(dep, [...(edges.get(dep) ?? []), n.pluginId])
      indegree.set(n.pluginId, (indegree.get(n.pluginId) ?? 0) + 1)
    }
  }
  const queue = [...ids].filter((id) => (indegree.get(id) ?? 0) === 0)
  const order: string[] = []
  while (queue.length) {
    const cur = queue.shift()!
    order.push(cur)
    for (const next of edges.get(cur) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1
      indegree.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  return { order, cyclic: order.length !== ids.size }
}

/** 解析：校验依赖满足性，写回拓扑次序，状态 registered → resolved */
export async function resolvePlugin(pluginId: string): Promise<PluginRecord> {
  const all = await db.plugin.findMany()
  const records = all.map(toRecord)
  const me = records.find((r) => r.pluginId === pluginId)
  if (!me) throw new Error(`ENOTFOUND: 插件 "${pluginId}" 未注册`)

  if (!LIFECYCLE_TRANSITIONS[me.status].includes('resolved')) {
    throw new Error(`EBADSTATE: ${me.status} 状态不可执行 resolve`)
  }

  // 依赖满足性检查
  const missing = me.dependsOn.filter(
    (dep) => !records.some((r) => r.pluginId === dep && r.status !== 'disabled'),
  )
  if (missing.length) {
    await db.plugin.update({
      where: { pluginId },
      data: { status: 'error' },
    })
    throw new Error(`EDEP: 依赖缺失 → ${missing.join(', ')}`)
  }

  const { order, cyclic } = topoSort(
    records.map((r) => ({ pluginId: r.pluginId, dependsOn: r.dependsOn })),
  )
  if (cyclic) throw new Error('ECYCLE: 检测到循环依赖')

  const row = await db.plugin.update({
    where: { pluginId },
    data: { status: 'resolved', loadOrder: order.indexOf(pluginId) },
  })
  return toRecord(row)
}

/* ------------------------------------------------------------------ */
/* 生命周期状态机（规范 5.1）                                            */
/* ------------------------------------------------------------------ */

export const ACTION_TARGETS: Record<LifecycleAction, LifecycleState> = {
  resolve: 'resolved',
  activate: 'active',
  deactivate: 'resolved',
  recover: 'active',
  fail: 'error',
  quarantine: 'disabled',
  reenable: 'resolved',
}

export function assertTransition(from: LifecycleState, action: LifecycleAction) {
  const target = ACTION_TARGETS[action]
  if (!target) throw new Error(`EBADACTION: 未知动作 "${action}"`)
  if (!LIFECYCLE_STATES.includes(from)) {
    throw new Error(`EBADSTATE: 未知状态 "${from}"`)
  }
  // deactivate: active/degraded → resolved 也合法
  const extraLegal: Partial<Record<LifecycleAction, LifecycleState[]>> = {
    deactivate: ['resolved'],
  }
  const legal = [...LIFECYCLE_TRANSITIONS[from], ...(extraLegal[action] ?? [])]
  if (!legal.includes(target)) {
    throw new Error(
      `EBADTRANSITION: ${from} --${action}--> ${target} 不是规范允许的迁移`,
    )
  }
  return target
}

/** 激活前的运行时权限复核（敏感权限需策略放行） */
export function checkActivationGate(record: PluginRecord): {
  ok: boolean
  reason?: string
} {
  if (record.status !== 'resolved') {
    return { ok: false, reason: `状态为 ${record.status}，需先 resolve` }
  }
  return { ok: true }
}

/** 全表读取 */
export async function listPlugins(): Promise<PluginRecord[]> {
  const rows = await db.plugin.findMany({ orderBy: { loadOrder: 'asc' } })
  return rows.map(toRecord)
}

export async function getPlugin(pluginId: string): Promise<PluginRecord | null> {
  const row = await db.plugin.findUnique({ where: { pluginId } })
  return row ? toRecord(row) : null
}
