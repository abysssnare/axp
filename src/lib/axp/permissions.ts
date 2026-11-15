/**
 * AXP v1.1.0 — 权限代理 (Permission Broker)
 * 规范第 7 章：能力目录 / 三态裁决 / 策略链
 */

import { PERMISSIONS, type Permission, type PermissionDecision } from './types'

/** 静态校验清单中的权限声明是否合法 */
export function validatePermissions(declared: string[]): {
  ok: boolean
  unknown: string[]
} {
  const catalog = new Set<string>(PERMISSIONS)
  const unknown = declared.filter((p) => !catalog.has(p))
  return { ok: unknown.length === 0, unknown }
}

/**
 * 三态裁决。宿主的策略链按顺序执行：
 *  - 任一 deny → 立即拒绝
 *  - 全部 grant → 批准
 *  - 出现 ask 且无 deny → 升级为用户确认（演练场中默认批准）
 */
export function decide(
  granted: Permission[],
  required: Permission,
  policyChain: PermissionDecision[] = ['grant'],
): PermissionDecision {
  if (!granted.includes(required)) return 'deny'
  if (policyChain.includes('deny')) return 'deny'
  if (policyChain.includes('ask')) return 'ask'
  return 'grant'
}

/** 敏感权限集合：裁决为 ask 的默认场景 */
export const SENSITIVE_PERMISSIONS: Permission[] = [
  'net:fetch',
  'secret:read',
  'spawn:worker',
]

/** 权限的人类可读说明（UI 展示用） */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'memory:read': '读取记忆条目',
  'memory:write': '写入 / 修改记忆条目',
  'memory:forget': '删除 / 淘汰记忆条目',
  'tool:invoke': '调用其他插件声明的工具',
  'trigger:emit': '向事件总线发布自定义主题',
  'trigger:subscribe': '订阅任意总线主题',
  'policy:enforce': '注册策略审查回调',
  'ui:render': '渲染界面面板',
  'net:fetch': '发起受限外联请求',
  'store:local': '持久化私有键值数据',
  'secret:read': '读取作用域密钥',
  'spawn:worker': '派生隔离子任务',
}
