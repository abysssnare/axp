/**
 * AXP — Agent eXtension Protocol (智能体扩展协议) v1.1.0
 * 核心类型定义 —— 规范第 3/4/5/6/7 章的类型化投影
 *
 * 本文件是 AXP v1.1.0 规范的权威 TypeScript 契约。
 * 任何实现方（宿主 / 插件 / 工具链）都应基于本契约进行开发。
 */

/* ------------------------------------------------------------------ */
/* 3.1 插件标识                                                        */
/* ------------------------------------------------------------------ */

/** 反向域名式插件标识，如 "axp.core.memory"。全局唯一，注册后不可变更。 */
export type PluginIdentifier = string

/** 语义化版本号（SemVer 2.0.0），格式：MAJOR.MINOR.PATCH */
export type SemVer = string

/* ------------------------------------------------------------------ */
/* 4. 扩展点 (Extension Points)                                        */
/* ------------------------------------------------------------------ */

/** v1.1.0 规范定义的标准扩展点 */
export const EXTENSION_POINTS = {
  /** 记忆系统：写入 / 召回 / 遗忘 / 检索 */
  memory: 'agent.memory',
  /** 工具提供方：供智能体调用的结构化能力 */
  tool: 'agent.tool',
  /** 触发器：向总线注入外部事件的事件源 */
  trigger: 'agent.trigger',
  /** 策略审查：对敏感操作进行运行时拦截 */
  policy: 'agent.policy',
  /** 界面面板：向宿主 UI 注入面板组件 */
  ui: 'ui.panel',
} as const

export type ExtensionPoint = (typeof EXTENSION_POINTS)[keyof typeof EXTENSION_POINTS]

/** 扩展点声明 —— 插件清单 provides 数组的元素 */
export interface ExtensionDeclaration {
  /** 扩展点标识 */
  point: ExtensionPoint
  /** 实现契约的版本，如 "1.1" */
  contract: string
  /** 可选的能力修饰（见各扩展点契约章节） */
  features?: string[]
}

/* ------------------------------------------------------------------ */
/* 7. 权限模型 (Permission Model)                                      */
/* ------------------------------------------------------------------ */

/** v1.1.0 权限目录 —— 共 12 项运行时能力 */
export const PERMISSIONS = [
  'memory:read', // 读取记忆条目
  'memory:write', // 写入 / 修改记忆条目
  'memory:forget', // 删除 / 淘汰记忆条目
  'tool:invoke', // 调用其他插件声明的工具
  'trigger:emit', // 向事件总线发布自定义主题
  'trigger:subscribe', // 订阅任意主题（默认仅可订阅 axp:host:*）
  'policy:enforce', // 注册策略审查回调
  'ui:render', // 渲染界面面板
  'net:fetch', // 发起受限外联请求（需 policy 放行）
  'store:local', // 持久化私有键值数据
  'secret:read', // 读取宿主保管的作用域密钥
  'spawn:worker', // 派生隔离子任务
] as const

export type Permission = (typeof PERMISSIONS)[number]

/** 权限请求的三态结果 */
export type PermissionDecision = 'grant' | 'deny' | 'ask'

/* ------------------------------------------------------------------ */
/* 5. 生命周期 (Lifecycle)                                             */
/* ------------------------------------------------------------------ */

/** 插件生命周期状态机（规范 5.1） */
export const LIFECYCLE_STATES = [
  'registered', // 已注册：清单通过静态校验，尚未解析
  'resolved', // 已解析：依赖满足、权限获批，具备激活条件
  'active', // 活跃：宿主已调用 activate()，正在提供服务
  'degraded', // 降级：心跳超时或部分能力失效，等待恢复或熔断
  'error', // 错误：激活 / 运行期异常，已隔离并停止调度
  'disabled', // 禁用：被策略或用户显式停用，不再参与解析
] as const

export type LifecycleState = (typeof LIFECYCLE_STATES)[number]

/** 合法的状态迁移边（有向无环） */
export const LIFECYCLE_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  registered: ['resolved', 'disabled', 'error'],
  resolved: ['active', 'disabled', 'error'],
  active: ['degraded', 'disabled', 'error'],
  degraded: ['active', 'error', 'disabled'],
  error: ['resolved', 'disabled'],
  disabled: ['registered', 'resolved'],
}

/** 触发迁移的规范动作 */
export type LifecycleAction =
  | 'resolve' // 解析依赖与权限
  | 'activate' // 激活
  | 'deactivate' // 停用（回到 resolved）
  | 'recover' // 从降级恢复
  | 'fail' // 置为错误
  | 'quarantine' // 隔离禁用
  | 'reenable' // 重新启用
  | 'unregister' // 注销并清理

/* ------------------------------------------------------------------ */
/* 6. 消息协议 (Message Contract)                                      */
/* ------------------------------------------------------------------ */

/** 总线消息封皮 —— 所有跨边界通信的统一信封（规范 6.1） */
export interface AxpMessage<T = unknown> {
  /** 消息 id（cuid / uuid），用于请求-响应关联 */
  id: string
  /** 消息类型：axp: 保留前缀为协议消息，plugin: 前缀为插件自定义 */
  type: string
  /** 发布者：插件 id 或 "host" */
  source: string
  /** 定向接收者；null 表示广播 */
  target: string | null
  /** 消息时间戳（ISO 8601） */
  timestamp: string
  /** 业务负载 */
  payload: T
}

/** 请求-响应模式下的响应封皮 */
export interface AxpResponse<T = unknown> extends AxpMessage<T> {
  /** 关联的请求 id */
  inReplyTo: string
  ok: boolean
  error?: { code: string; message: string }
}

/* ------------------------------------------------------------------ */
/* 事件总线主题命名空间（规范 8.2）                                      */
/* ------------------------------------------------------------------ */

export const EVENT_TOPICS = {
  /* 协议保留主题 */
  pluginRegistered: 'axp:plugin:registered',
  pluginResolved: 'axp:plugin:resolved',
  pluginActivated: 'axp:plugin:activated',
  pluginDeactivated: 'axp:plugin:deactivated',
  pluginDegraded: 'axp:plugin:degraded',
  pluginFailed: 'axp:plugin:failed',
  pluginRemoved: 'axp:plugin:removed',
  healthTick: 'axp:health:tick',
  /* 记忆扩展点主题 */
  memoryWritten: 'axp:memory:written',
  memoryRecalled: 'axp:memory:recalled',
  memoryForgotten: 'axp:memory:forgotten',
  /* 策略主题 */
  policyDenied: 'axp:policy:denied',
} as const

export type ReservedTopic = (typeof EVENT_TOPICS)[keyof typeof EVENT_TOPICS]

export type EventLevel = 'debug' | 'info' | 'warn' | 'error'

/* ------------------------------------------------------------------ */
/* 10. 健康检查 / 心跳（v1.1.0 新增）                                    */
/* ------------------------------------------------------------------ */

export interface HealthReport {
  pluginId: PluginIdentifier
  /** 健康分 0-100；低于 40 判定为 degraded */
  score: number
  /** 最近一次心跳时间 */
  lastHeartbeat: string
  /** 心跳间隔（毫秒）；连续 3 次未收到则降级 */
  intervalMs: number
  detail?: Record<string, unknown>
}

/* ------------------------------------------------------------------ */
/* 4. 插件清单 (axp.plugin.json)                                        */
/* ------------------------------------------------------------------ */

/** 插件清单 —— 每个插件分发的必备自描述文件（规范 4.1） */
export interface PluginManifest {
  /** 清单格式版本，固定 "axp-plugin/1.1" */
  $schema: string
  id: PluginIdentifier
  name: string
  version: SemVer
  description: string
  /** 期望的宿主引擎约束，如 ">=1.1.0 <2.0.0" */
  engine: string
  /** 入口模块（相对插件根目录） */
  entry: string
  /** 声明并需要获批的权限 */
  permissions: Permission[]
  /** 提供的扩展点实现 */
  provides: ExtensionDeclaration[]
  /** 依赖的其他插件（含版本范围） */
  dependsOn?: { id: PluginIdentifier; range: string }[]
  /** 事件订阅声明：未声明 trigger:subscribe 时仅可订阅列出的主题 */
  subscribes?: string[]
  /** 心跳间隔（毫秒），0 表示不参与心跳 */
  heartbeatMs?: number
  author?: { name: string; email?: string; url?: string }
  homepage?: string
  license?: string
  tags?: string[]
}

/** 注册表中的插件运行时记录 */
export interface PluginRecord {
  id: string
  pluginId: PluginIdentifier
  name: string
  version: SemVer
  description: string
  category: string
  status: LifecycleState
  permissions: Permission[]
  provides: ExtensionDeclaration[]
  dependsOn: string[]
  manifest: PluginManifest
  health: number
  loadOrder: number
  activations: number
  createdAt: string
  updatedAt: string
}

/** 总线事件的可序列化投递 */
export interface BusEvent {
  id: string
  topic: string
  source: string
  target: string | null
  payload: Record<string, unknown>
  level: EventLevel
  createdAt: string
}
