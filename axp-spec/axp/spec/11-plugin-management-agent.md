# 11 · 插件管理、Agent 选择与宿主上下文

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 本文件把 v1.0 里被划为「宿主实现细节」、但**直接决定「Agent 能不能自由使用选择插件」「点开插件有没有 UI」**的部分补成契约。

## 1. 三个此前缺失的概念

| 概念 | v1.0 状态 | 本文件补齐 |
|---|---|---|
| 已装插件注册表 | 无 | §2 `registry.json` |
| Agent 可见工具集 | 只有 `tools[].cost` 注释 | §3 `agent-tools` 输出契约 |
| 插件自己的持久化与宿主上下文 | 只有 `fs.*` 权限词，无调用方式 | §4 `runtimeServices: storage` + `ctx` |

## 2. 注册表 `registry.json`

宿主 `MUST` 持久化一份注册表（CLI 在 `$AXP_HOME/registry.json`，Android 在 `filesDir/axp/registry.json`）：

```jsonc
{
  "axpRegistry": "1.0",
  "hostLevel": "AXP-2",
  "plugins": [
    {
      "id": "com.example.memory",
      "version": "1.0.0",
      "path": "plugins/com.example.memory",
      "publisher": "sha256:<64hex>",
      "sha256": "<64hex>",
      "enabled": true,
      "installedAt": "2026-11-20T00:00:00Z",
      "privilege": "L1",
      "requests": ["fs.read:shared", "fs.write:shared"],
      "ui": true,
      "tools": ["memory.add", "memory.list", "memory.search", "memory.clear"]
    }
  ]
}
```

`MUST` 支持的操作：`list` / `install` / `uninstall` / `enable` / `disable`。
插件管理页 `MUST` 展示：名称、版本、发布者指纹、权限层、是否有 UI、**点开入口**。
`enabled:false` 的插件 `MUST NOT` 出现在 Agent 工具集，`MUST NOT` 被装载执行。

## 3. Agent 可见工具集 `agent-tools`

宿主 `MUST` 能从**已启用插件**构造一份扁平工具清单（CLI `axp agent-tools --json`；Android `AgentBroker.visibleTools()`）：

```jsonc
{
  "tools": [
    {
      "name": "com.example.memory.memory.add",
      "plugin": "com.example.memory",
      "id": "memory.add",
      "description": "写入一条记忆",
      "input": { "type": "object", "properties": { "text": { "type": "string" } } },
      "cost": "fast",
      "sideEffects": "none",
      "confirm": false,
      "privilege": "L1",
      "available": true
    }
  ],
  "knowledge": [
    { "plugin": "...", "id": "...", "kind": "skill", "progressive": true, "allowedTools": ["..."] }
  ]
}
```

规则：

1. `name` = `<pluginId>.<toolId>`，`MUST` 全局唯一；选中后宿主 `MUST` 映射回原插件与工具。
2. `available:false` 的工具（gradient 无可用实现 / 权限未授予）`SHOULD` 仍列出但标注原因，避免 Agent 反复试错。
3. `cost` 与 `description` 是选择依据；`sideEffects:"device"|"destructive"` 或 `confirm:true` 的工具 `MUST` 在调用前经用户确认。
4. **选择策略由宿主决定**（规则匹配 / 模型 function-calling / 用户手动），格式只约束「可见什么、能调什么、调到哪一级」——这与 `01-format.md` §0.1「不是运行时」不冲突：这里定义的是**清单投影**，不是调度引擎。
5. `knowledge[].progressive:true` 时宿主 `MUST` 三级渐进披露；`allowedTools` 在知识激活期 `MUST` 作为白名单生效。
6. 每次选择/调用/拒绝 `MUST` 写审计日志（`audit.read` 可读）。

## 4. 宿主上下文 `ctx` 与 `storage` 反向通道

`capabilities.runtimeServices` 增加可选值 **`storage`**（`02-manifest.schema.json` 已同步）。
宿主执行 `impl.js` / `ui.lifecycle` 时 `MUST` 注入第二参数 `ctx`：

| 字段 | 语义 | 权限约束 |
|---|---|---|
| `ctx.storage.get(key)` / `put(key,value)` / `list()` / `remove(key)` | 插件私有 KV，命名空间按 `id` 隔离 | `MUST` 声明 `fs.read:<scope>` / `fs.write:<scope>`；未声明 → `STORAGE_DENIED` |
| `ctx.surface.publish(uri, delta)` / `read(uri)` | 发布/读取 `axp://x/<id>/…` 自定义域 | `MUST` 指向本包已声明 `surfaces[].uri` |
| `ctx.audit.log(event)` | 追加结构化审计 | 无需额外声明 |
| `ctx.agent.request(prompt)` | `sampling` 反向通道 | `MUST` 声明 `runtimeServices:["sampling"]` |
| `ctx.elicit(schema)` | `elicitation` 反向通道 | `MUST` 声明 `["elicitation"]` |
| `ctx.ui.push(node, value)` | 主动更新界面 | `MUST` 声明 `["ui.push"]` 且存在 `ui{}` |

`ctx` 的调用约定由宿主运行时定义、格式不规定方法签名（`01-format.md` §5.7 原则不变）；
但 `MUST` 提供上表能力，否则「带储存的记忆系统」「能写文件的插件」无法只靠 `axp.json` 实现。
工具函数签名 `run(args, ctx)`；只声明 `run(args)` 的旧插件 `MUST` 仍能装载（向后兼容）。

**存储隔离**：`MUST NOT` 允许插件读另一个 `id` 的命名空间；`MUST NOT` 允许未声明 `fs.write` 的插件落盘。

## 5. 插件 UI 入口（「点开插件」）

宿主 `MUST`：在插件管理页为每个 `ui.panel` 插件提供可点击入口 → 打开插件界面页。
界面页 `MUST`：解析 `ui.panel.entry`（`06-ui-vocab.md` 节点集）→ 建立 `ui.bind` 订阅 → 把 `ui.actions` 绑定到本包 `tools[].id` → 按时机调用 `lifecycle.onLoad/onReload/onUnload`。
`watchable` Surface 产生 delta 时 `MUST` 自动刷新绑定节点，用户不用手写刷新逻辑。
无 `ui{}` 的纯功能插件 `MUST` 仍可在列表中查看信息、被 Agent 调用、被启用/停用。

## 6. 一致性要求

| 等级 | 本文件要求 |
|---|---|
| AXP-0 | §2 注册表 + §3 工具集 + §4 `ctx`（基础字段） |
| AXP-1 | + §3 渐进披露 / `available` 标注 |
| AXP-2 | + §5 插件 UI 入口与绑定 |
| AXP-3 | + 全部审计、`allowedTools` 白名单、存储隔离强制校验 |
