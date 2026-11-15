/**
 * AXP v1.1.0 — 默认插件集（注册表种子数据）
 * 官方参考实现，覆盖全部五个标准扩展点。
 */

import { db } from '@/lib/db'
import { install } from './kernel'
import type { PluginManifest } from './types'
import { toRecord } from './registry'

export const DEFAULT_PLUGINS: {
  manifest: PluginManifest
  category: string
}[] = [
  {
    category: 'memory',
    manifest: {
      $schema: 'axp-plugin/1.1',
      id: 'axp.core.memory',
      name: 'Core Memory',
      version: '1.1.0',
      description:
        '官方记忆系统参考实现：键值式记忆条目，支持标签、重要性分级与按权重召回。',
      engine: '>=1.1.0 <2.0.0',
      entry: './index.js',
      permissions: ['memory:read', 'memory:write', 'memory:forget', 'trigger:emit', 'store:local'],
      provides: [{ point: 'agent.memory', contract: '1.1', features: ['tags', 'importance', 'recall', 'pin'] }],
      subscribes: ['axp:health:tick'],
      heartbeatMs: 15000,
      author: { name: 'AXP Working Group' },
      license: 'Apache-2.0',
      tags: ['memory', 'official', 'reference'],
    },
  },
  {
    category: 'tool',
    manifest: {
      $schema: 'axp-plugin/1.1',
      id: 'axp.tools.echo',
      name: 'Echo Toolkit',
      version: '1.0.2',
      description: '最小工具扩展点示例：向智能体暴露 echo / now 两个幂等工具。',
      engine: '>=1.0.0 <2.0.0',
      entry: './index.js',
      permissions: ['tool:invoke'],
      provides: [{ point: 'agent.tool', contract: '1.1', features: ['echo', 'now'] }],
      dependsOn: [{ id: 'axp.core.memory', range: '^1.1.0' }],
      heartbeatMs: 30000,
      author: { name: 'AXP Working Group' },
      license: 'Apache-2.0',
    },
  },
  {
    category: 'trigger',
    manifest: {
      $schema: 'axp-plugin/1.1',
      id: 'axp.triggers.scheduler',
      name: 'Scheduler Trigger',
      version: '1.1.0',
      description: '定时触发器：按 cron 表达式向总线注入 agent 任务唤醒事件。',
      engine: '>=1.1.0 <2.0.0',
      entry: './index.js',
      permissions: ['trigger:emit', 'trigger:subscribe'],
      provides: [{ point: 'agent.trigger', contract: '1.1', features: ['cron', 'interval'] }],
      subscribes: ['axp:plugin:activated', 'axp:plugin:deactivated'],
      heartbeatMs: 10000,
      author: { name: 'AXP Working Group' },
      license: 'Apache-2.0',
    },
  },
  {
    category: 'policy',
    manifest: {
      $schema: 'axp-plugin/1.1',
      id: 'axp.policy.guard',
      name: 'Policy Guard',
      version: '1.0.0',
      description: '策略审查实现：对 net:fetch 与 secret:read 执行默认拒绝链。',
      engine: '>=1.0.0 <2.0.0',
      entry: './index.js',
      permissions: ['policy:enforce', 'trigger:subscribe'],
      provides: [{ point: 'agent.policy', contract: '1.1', features: ['deny-by-default', 'allowlist'] }],
      heartbeatMs: 0,
      author: { name: 'AXP Working Group' },
      license: 'Apache-2.0',
    },
  },
  {
    category: 'ui',
    manifest: {
      $schema: 'axp-plugin/1.1',
      id: 'axp.ui.console',
      name: 'Console Panel',
      version: '1.0.1',
      description: '界面面板扩展点示例：向宿主 UI 注入只读的协议事件控制台。',
      engine: '>=1.0.0 <2.0.0',
      entry: './index.js',
      permissions: ['ui:render', 'trigger:subscribe'],
      provides: [{ point: 'ui.panel', contract: '1.1', features: ['readonly'] }],
      dependsOn: [{ id: 'axp.core.memory', range: '*' }],
      heartbeatMs: 20000,
      author: { name: 'AXP Working Group' },
      license: 'Apache-2.0',
    },
  },
]

/** 可从插件市场一键安装的扩展插件目录 */
export const MARKET_CATALOG: { manifest: PluginManifest; category: string }[] = [
  {
    category: 'memory',
    manifest: {
      $schema: 'axp-plugin/1.1',
      id: 'axp.labs.vector-memory',
      name: 'Vector Memory',
      version: '0.9.0',
      description: '实验性向量记忆：以嵌入相似度召回，权重 = 相似度 x importance。',
      engine: '>=1.1.0 <2.0.0',
      entry: './index.js',
      permissions: ['memory:read', 'memory:write', 'net:fetch', 'store:local'],
      provides: [{ point: 'agent.memory', contract: '1.1', features: ['embedding', 'ann-recall'] }],
      heartbeatMs: 15000,
      author: { name: 'AXP Labs' },
      license: 'Apache-2.0',
      tags: ['experimental'],
    },
  },
  {
    category: 'tool',
    manifest: {
      $schema: 'axp-plugin/1.1',
      id: 'axp.labs.web-tool',
      name: 'Web Toolpack',
      version: '0.7.0',
      description: '网页摘要工具集：net:fetch 敏感权限，安装时触发策略链三态裁决。',
      engine: '>=1.1.0 <2.0.0',
      entry: './index.js',
      permissions: ['tool:invoke', 'net:fetch', 'secret:read'],
      provides: [{ point: 'agent.tool', contract: '1.1', features: ['fetch', 'summarize'] }],
      dependsOn: [{ id: 'axp.policy.guard', range: '^1.0.0' }],
      heartbeatMs: 25000,
      author: { name: 'AXP Labs' },
      license: 'Apache-2.0',
      tags: ['experimental'],
    },
  },
]

/** 幂等初始化注册表 */
export async function ensureSeeded(): Promise<void> {
  const count = await db.plugin.count()
  if (count > 0) return
  for (const p of DEFAULT_PLUGINS) {
    try {
      await install(p.manifest, p.category)
    } catch {
      // 已存在则跳过（幂等）
    }
  }
}

export { toRecord }
