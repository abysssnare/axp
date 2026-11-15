/**
 * AXP v1.1.0 — 完整规范文本（结构化数据，供规范浏览器渲染）
 * 章节结构与正式规范文档保持一致。
 */

export interface SpecBlock {
  kind: 'para' | 'list' | 'code' | 'table' | 'note' | 'subtitle'
  text?: string
  items?: string[]
  code?: string
  lang?: string
  table?: { headers: string[]; rows: string[][] }
}

export interface SpecSection {
  id: string
  no: string
  title: string
  summary: string
  blocks: SpecBlock[]
}

export const SPEC_META = {
  protocol: 'AXP',
  fullName: 'Agent eXtension Protocol（智能体扩展协议）',
  version: '1.1.0',
  date: '2026-11-01',
  status: 'Stable',
  organization: 'AXP Working Group',
  license: 'Apache-2.0 (spec) / Apache-2.0 (reference implementation)',
}

export const SPEC_SECTIONS: SpecSection[] = [
  {
    id: 'overview',
    no: '1',
    title: '概述与目标',
    summary: '协议的定位、设计目标与非目标。',
    blocks: [
      {
        kind: 'para',
        text: 'AXP（Agent eXtension Protocol）是面向智能体（Agent）系统的开放插件协议。它定义了宿主（Host）与插件（Plugin）之间的清单格式、生命周期、消息契约、权限模型与事件总线语义，使任意符合规范的记忆系统、工具包、触发器、策略与界面组件可以在不同宿主之间可移植地复用。',
      },
      {
        kind: 'subtitle',
        text: '设计目标',
      },
      {
        kind: 'list',
        items: [
          '可移植：同一插件包不做修改即可运行于任意 AXP 兼容宿主。',
          '最小惊讶：生命周期与权限语义完全显式，无隐藏副作用。',
          '可审计：所有跨边界通信必须经过总线并留下轨迹。',
          '渐进增强：v1.1 合约向后兼容 v1.0，未声明新特性的插件零成本迁移。',
          '安全默认：能力未声明即拒绝；敏感能力默认进入策略链。',
        ],
      },
      {
        kind: 'subtitle',
        text: '非目标',
      },
      {
        kind: 'list',
        items: [
          '不定义插件的打包与分发格式（交由宿主生态，如 npm / OCI）。',
          '不定义插件内部的编程语言绑定（契约是进程/边界的，不是语言的）。',
          '不强制沙箱实现技术（WebAssembly、容器、进程隔离均可满足规范）。',
        ],
      },
    ],
  },
  {
    id: 'concepts',
    no: '2',
    title: '核心概念',
    summary: '宿主、插件、扩展点、消息契约四要素。',
    blocks: [
      {
        kind: 'para',
        text: '一次 AXP 部署由一个宿主和零个或多个插件组成。宿主实现内核职责（注册表 / 总线 / 权限代理），插件通过实现扩展点向宿主注入能力。',
      },
      {
        kind: 'table',
        table: {
          headers: ['概念', '说明', '规范引用'],
          rows: [
            ['Host（宿主）', '运行内核并调度插件的智能体运行时', '§3'],
            ['Plugin（插件）', '以 axp.plugin.json 自描述的可移植扩展单元', '§4'],
            ['Extension Point（扩展点）', '宿主定义的能力插槽契约', '§2.1'],
            ['Message（消息）', '跨边界通信的统一封皮', '§6'],
            ['Event Bus（事件总线）', '发布/订阅式的审计化消息中枢', '§8'],
            ['Permission（权限）', '插件运行所需的能力令牌', '§7'],
          ],
        },
      },
      {
        kind: 'subtitle',
        text: '2.1 标准扩展点',
      },
      {
        kind: 'table',
        table: {
          headers: ['扩展点标识', '用途', '契约版本'],
          rows: [
            ['agent.memory', '记忆系统：写入 / 召回 / 遗忘 / 淘汰', '1.1'],
            ['agent.tool', '工具提供方：结构化可调用能力', '1.1'],
            ['agent.trigger', '触发器：向总线注入外部事件', '1.1'],
            ['agent.policy', '策略审查：运行时拦截与裁决', '1.1'],
            ['ui.panel', '界面面板：向宿主 UI 注入视图', '1.1'],
          ],
        },
      },
    ],
  },
  {
    id: 'manifest',
    no: '3',
    title: '插件清单（axp.plugin.json）',
    summary: '插件分发的必备自描述文件及其静态校验规则。',
    blocks: [
      {
        kind: 'para',
        text: '每个插件根目录必须包含 axp.plugin.json。宿主在注册阶段执行纯静态校验：任何校验失败都必须在注册前拒绝，不允许"带病注册"。',
      },
      {
        kind: 'code',
        lang: 'json',
        code: `{
  "$schema": "axp-plugin/1.1",
  "id": "axp.core.memory",
  "name": "Core Memory",
  "version": "1.1.0",
  "description": "官方记忆系统参考实现",
  "engine": ">=1.1.0 <2.0.0",
  "entry": "./index.js",
  "permissions": ["memory:read", "memory:write", "memory:forget"],
  "provides": [
    { "point": "agent.memory", "contract": "1.1",
      "features": ["tags", "importance", "recall", "pin"] }
  ],
  "dependsOn": [
    { "id": "axp.policy.guard", "range": "^1.0.0" }
  ],
  "subscribes": ["axp:health:tick"],
  "heartbeatMs": 15000,
  "author": { "name": "AXP Working Group" },
  "license": "Apache-2.0"
}`,
      },
      {
        kind: 'subtitle',
        text: '3.1 校验规则（必须全部通过）',
      },
      {
        kind: 'list',
        items: [
          'id：反向域名格式 ^[a-z0-9]+(\\.[a-z0-9-]+)+$，全局唯一且注册后不可变更。',
          'version：符合 SemVer 2.0.0。',
          'engine：宿主内核版本必须落在约束区间内，否则报 EENGINE。',
          'permissions：必须是 §7 权限目录中的已知项。',
          'provides：至少声明一个扩展点；同一扩展点在同一插件内只能实现一次。',
          'dependsOn：依赖的插件必须存在且版本落在 range 内（解析期检查）。',
          'subscribes：通配符仅允许尾部 *，如 "axp:memory:*"。',
        ],
      },
      {
        kind: 'note',
        text: 'v1.1.0 变化：新增 heartbeatMs（心跳间隔，0 表示不参与心跳）与 dependsOn.range 的严格区间语义（v1.0 仅支持单一版本）。',
      },
    ],
  },
  {
    id: 'lifecycle',
    no: '4',
    title: '生命周期',
    summary: '六状态状态机、八个规范动作与迁移合法性表。',
    blocks: [
      {
        kind: 'para',
        text: '插件的生命周期由宿主内核驱动。所有状态迁移必须沿着下表允许的边进行，任何非法迁移都是宿主实现缺陷。',
      },
      {
        kind: 'table',
        table: {
          headers: ['状态', '含义'],
          rows: [
            ['registered', '已注册：清单通过静态校验，尚未解析'],
            ['resolved', '已解析：依赖满足、权限获批、拓扑次序已计算'],
            ['active', '活跃：activate() 已被调用，正在提供服务'],
            ['degraded', '降级：心跳超时或部分能力失效，等待恢复或熔断'],
            ['error', '错误：激活/运行期异常，已隔离并停止调度'],
            ['disabled', '禁用：被策略或用户显式停用'],
          ],
        },
      },
      {
        kind: 'subtitle',
        text: '4.1 规范动作与目标状态',
      },
      {
        kind: 'table',
        table: {
          headers: ['动作', '目标状态', '前置状态'],
          rows: [
            ['resolve', 'resolved', 'registered | error | disabled'],
            ['activate', 'active', 'resolved | degraded(恢复)'],
            ['deactivate', 'resolved', 'active | degraded'],
            ['recover', 'active', 'degraded'],
            ['fail', 'error', 'registered | resolved | active | degraded'],
            ['quarantine', 'disabled', '任意非 disabled 状态'],
            ['reenable', 'resolved', 'disabled'],
            ['unregister', '（移除）', '任意状态；active 时需无依赖方'],
          ],
        },
      },
      {
        kind: 'note',
        text: 'v1.1.0 变化：激活采用依赖拓扑次序（§5.2）——被依赖者优先激活；unregister 在存在 active 依赖方时必须报 EBUSY。',
      },
    ],
  },
  {
    id: 'message',
    no: '5',
    title: '消息契约',
    summary: '统一封皮、请求-响应关联与超时语义。',
    blocks: [
      {
        kind: 'para',
        text: '所有跨边界通信（宿主→插件、插件→宿主、插件→插件）必须使用统一封皮。封皮字段是保留的：实现不得增删或重排语义。',
      },
      {
        kind: 'code',
        lang: 'json',
        code: `{
  "id": "cif0example-message-id",
  "type": "axp:memory:recall",
  "source": "axp.tools.echo",
  "target": "axp.core.memory",
  "timestamp": "2026-11-01T08:30:00.000Z",
  "payload": { "q": "用户偏好", "limit": 10 }
}`,
      },
      {
        kind: 'subtitle',
        text: '5.1 规则',
      },
      {
        kind: 'list',
        items: [
          'type 命名空间：axp: 前缀为协议保留，plugin: 前缀为插件自定义（如 plugin:my-feature:ping）。',
          '请求-响应通过 id / inReplyTo 关联；响应必须携带 ok 字段。',
          '默认超时 5000ms；超时后宿主视目标插件为 degraded 候选。',
          'source 必须与消息实际发布者一致，内核负责核验，伪造 source 视为协议违规并触发 quarantine。',
          '未知 type 的消息必须被静默丢弃并计入 debug 级轨迹（不得抛错打断总线）。',
        ],
      },
    ],
  },
  {
    id: 'permissions',
    no: '6',
    title: '权限模型',
    summary: '12 项能力目录、三态裁决与敏感能力默认策略。',
    blocks: [
      {
        kind: 'para',
        text: '插件在清单中声明的权限是它运行所需的全部能力。宿主在 resolve 阶段把权限请求提交策略链裁决；未声明的能力在运行期一律拒绝（EPERM）。',
      },
      {
        kind: 'table',
        table: {
          headers: ['权限', '说明', '敏感'],
          rows: [
            ['memory:read', '读取记忆条目', '否'],
            ['memory:write', '写入 / 修改记忆条目', '否'],
            ['memory:forget', '删除 / 淘汰记忆条目', '否'],
            ['tool:invoke', '调用其他插件声明的工具', '否'],
            ['trigger:emit', '向总线发布自定义主题', '否'],
            ['trigger:subscribe', '订阅任意总线主题', '否'],
            ['policy:enforce', '注册策略审查回调', '否'],
            ['ui:render', '渲染界面面板', '否'],
            ['net:fetch', '发起受限外联请求', '是'],
            ['store:local', '持久化私有键值数据', '否'],
            ['secret:read', '读取作用域密钥', '是'],
            ['spawn:worker', '派生隔离子任务', '是'],
          ],
        },
      },
      {
        kind: 'subtitle',
        text: '6.1 三态裁决',
      },
      {
        kind: 'para',
        text: '策略链按声明顺序执行，结果为 grant / deny / ask 三态：任一 deny 立即拒绝；出现 ask 且无 deny 时升级为用户确认；全部 grant 才静默批准。敏感权限（net:fetch、secret:read、spawn:worker）默认进入 ask。',
      },
      {
        kind: 'note',
        text: '运行期的每一次能力使用都经过权限代理（Permission Broker）复核——声明是"入场券"，不是"通行证"。',
      },
    ],
  },
  {
    id: 'bus',
    no: '7',
    title: '事件总线',
    summary: '主题命名空间、订阅规则与审计要求。',
    blocks: [
      {
        kind: 'para',
        text: '总线是宿主内唯一的消息中枢。所有消息（包括请求-响应）都在总线上流动并写入审计轨迹。',
      },
      {
        kind: 'subtitle',
        text: '7.1 保留主题命名空间',
      },
      {
        kind: 'table',
        table: {
          headers: ['主题', '发布者', '时机'],
          rows: [
            ['axp:plugin:registered / resolved / removed', 'host', '注册 / 解析 / 注销'],
            ['axp:plugin:activated / deactivated', 'host', '激活 / 停用'],
            ['axp:plugin:degraded / failed', 'host', '降级 / 失败'],
            ['axp:health:tick', 'plugin', '每次心跳'],
            ['axp:memory:written / recalled / forgotten', '记忆插件', '记忆操作'],
            ['axp:policy:denied', '策略插件', '裁决拒绝'],
          ],
        },
      },
      {
        kind: 'subtitle',
        text: '7.2 规则',
      },
      {
        kind: 'list',
        items: [
          'axp:* 保留主题仅内核可发布；插件发布保留主题是协议违规。',
          '未声明 trigger:subscribe 的插件仅可订阅清单 subscribes 列出的主题。',
          '订阅通配符仅支持尾部 *：axp:memory:* 合法，axp:*:written 非法。',
          '审计轨迹至少保留最近 N 条（宿主可配置），演练场默认 40 条。',
        ],
      },
    ],
  },
  {
    id: 'deps',
    no: '8',
    title: '依赖解析与拓扑激活（v1.1.0 新增）',
    summary: 'Kahn 拓扑排序、循环检测与激活次序。',
    blocks: [
      {
        kind: 'para',
        text: 'v1.1.0 将依赖图引入注册表：resolve 阶段构建以插件为节点、dependsOn 为边的有向图，用 Kahn 算法计算无环拓扑次序，作为激活的先后依据。',
      },
      {
        kind: 'list',
        items: [
          '依赖缺失（EDEP）：resolve 直接置 error，并在轨迹中记录缺失清单。',
          '循环依赖（ECYCLE）：整批 resolve 失败，宿主必须给出参与环的节点列表。',
          '激活次序：拓扑序小的先激活；同层按注册时间稳定排序。',
          '依赖方未 active 时，activate 报 EDEP 并保持 resolved。',
          '禁用（disabled）的依赖视同缺失，参与 EDEP 判定。',
        ],
      },
      {
        kind: 'code',
        lang: 'ts',
        code: `// 注册表内置实现（节选自 src/lib/axp/registry.ts）
export function topoSort(nodes: { pluginId: string; dependsOn: string[] }[]) {
  const indegree = new Map(nodes.map(n => [n.pluginId, 0]))
  const edges = new Map<string, string[]>() // dep -> dependents
  for (const n of nodes)
    for (const dep of n.dependsOn) {
      edges.set(dep, [...(edges.get(dep) ?? []), n.pluginId])
      indegree.set(n.pluginId, indegree.get(n.pluginId)! + 1)
    }
  const queue = [...indegree].filter(([, d]) => d === 0).map(([id]) => id)
  const order: string[] = []
  while (queue.length) {
    const cur = queue.shift()!
    order.push(cur)
    for (const next of edges.get(cur) ?? []) {
      const d = indegree.get(next)! - 1
      indegree.set(next, d)
      if (d === 0) queue.push(next)
    }
  }
  return { order, cyclic: order.length !== nodes.length }
}`,
      },
    ],
  },
  {
    id: 'health',
    no: '9',
    title: '健康检查与心跳（v1.1.0 新增）',
    summary: '心跳间隔、健康分与降级熔断。',
    blocks: [
      {
        kind: 'para',
        text: 'heartbeatMs > 0 的插件必须按间隔向内核发送 axp:health:tick。内核为每个插件维护 0-100 的健康分；连续 3 个周期未收到心跳即降为 degraded。',
      },
      {
        kind: 'table',
        table: {
          headers: ['健康分', '判定', '动作'],
          rows: [
            ['80-100', '健康', '正常调度'],
            ['40-79', '观察', '正常调度，轨迹记录'],
            ['<40 或心跳丢失', '降级', 'degraded + 广播 axp:plugin:degraded'],
            ['降级后 5 分钟未恢复', '熔断', 'quarantine → disabled'],
          ],
        },
      },
      {
        kind: 'note',
        text: '恢复路径：degraded 的插件心跳恢复且健康分回升到 55 以上时，内核调用 recover 动作回到 active。',
      },
    ],
  },
  {
    id: 'memory-contract',
    no: '10',
    title: 'agent.memory 扩展点契约（1.1）',
    summary: '记忆系统的数据模型、操作语义与召回权重。',
    blocks: [
      {
        kind: 'para',
        text: '实现 agent.memory 的插件必须提供四个操作：write / recall / forget / sweep，并发布对应主题。记忆条目的数据模型如下。',
      },
      {
        kind: 'table',
        table: {
          headers: ['字段', '类型', '语义'],
          rows: [
            ['scope', 'string', '记忆域（命名空间隔离），默认 "default"'],
            ['key', 'string', '域内唯一键；同 scope+key 的 write 为覆盖更新'],
            ['content', 'string', '记忆正文'],
            ['tags', 'string[]', '最多 8 个小写标签，用于过滤召回'],
            ['importance', '1-5', '重要性分级，权重占比最高'],
            ['pinned', 'boolean', '置顶：召回强制领先，sweep 永不淘汰'],
            ['lastAccessedAt', 'datetime', '新近度衰减基准'],
            ['accessCount', 'int', '触达计数（召回单条时 +1）'],
          ],
        },
      },
      {
        kind: 'subtitle',
        text: '10.1 召回权重（参考实现公式）',
      },
      {
        kind: 'code',
        lang: 'ts',
        code: `score = relevance      // key 命中 40 / content 命中 25 / tag 命中 15
     + importance * 6   // 重要性 6-30
     + freshness        // 20 - 距上次访问天数（下限 0）
     + pinned ? 30 : 0  // 置顶加成`,
      },
      {
        kind: 'subtitle',
        text: '10.2 sweep 淘汰规则',
      },
      {
        kind: 'list',
        items: [
          '候选：pinned = false 且 importance ≤ 2 且 7 天未访问。',
          '淘汰必须以 axp:memory:forgotten（reason: sweep）留痕。',
          '宿主不得替插件执行淘汰——淘汰是插件自治行为。',
        ],
      },
    ],
  },
  {
    id: 'compat',
    no: '11',
    title: '兼容性与版本策略',
    summary: 'SemVer 承诺、契约版本与迁移指引。',
    blocks: [
      {
        kind: 'para',
        text: '协议版本遵循 SemVer 2.0.0。扩展点契约独立于协议版本演进，以 minor 步进（1.0 → 1.1）并保持向后兼容：实现旧契约的插件在宿主按新契约调度时，未声明的新特性字段必须被忽略而非报错。',
      },
      {
        kind: 'table',
        table: {
          headers: ['变更类型', '版本动作', '兼容性'],
          rows: [
            ['新增可选清单字段', '协议 patch', '完全兼容'],
            ['新增扩展点 / 权限项', '协议 minor', '旧插件零改动'],
            ['收紧语义 / 删除字段', '协议 major', '需要迁移指引'],
            ['扩展点新增 feature', '契约 minor', '宿主需容忍缺省'],
          ],
        },
      },
      {
        kind: 'subtitle',
        text: '11.1 v1.0 → v1.1 迁移清单',
      },
      {
        kind: 'list',
        items: [
          '（建议）为参与健康检查的插件补充 heartbeatMs。',
          '（建议）把 dependsOn 的单版本改为 range 区间。',
          '（无需）未使用新特性的插件无需改动清单版本号。',
        ],
      },
    ],
  },
]

/** v1.1.0 相对 v1.0.0 的变更摘要（总览页展示） */
export const CHANGELOG = [
  {
    version: '1.1.0',
    date: '2026-11-01',
    tag: 'minor',
    items: [
      '新增依赖解析与拓扑激活（§8）：Kahn 排序、循环检测、EDEP/ECYCLE 错误码。',
      '新增健康检查与心跳协议（§9）：健康分、降级、熔断与恢复路径。',
      '权限目录从 8 项扩展到 12 项，新增 net:fetch / store:local / secret:read / spawn:worker 的敏感级标注。',
      'agent.memory 契约升级到 1.1：tags、importance、pinned、sweep 语义正式化。',
      'dependsOn 支持 SemVer range 区间（v1.0 仅支持单一版本）。',
      'unregister 增加 EBUSY 保护：存在 active 依赖方时禁止注销。',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-15',
    tag: 'major',
    items: [
      '首个正式版：清单格式、六状态生命周期、消息封皮、权限模型、事件总线命名空间。',
      '五个标准扩展点：agent.memory / agent.tool / agent.trigger / agent.policy / ui.panel。',
    ],
  },
]
