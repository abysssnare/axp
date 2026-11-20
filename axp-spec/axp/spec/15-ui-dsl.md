# 15 · 插件 UI DSL 与 `panel.json`

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 机器可读形式：[`15-panel.schema.json`](15-panel.schema.json)。
> 本文件把 `06-ui-vocab.md` 的词汇与 `01-format.md` §5.6 的 `ui{}` 落到**宿主真的能渲染**的节点模型。

## 1. 两种合法形态（v1.0 兼容）

v1.0 的官方示例使用 **扁平 id 引用**形态；v1.1 的示例仓 `05-memory-system` 使用 **嵌套**形态。
两者都合规，`15-panel.schema.json` 用 `anyOf` 同时接受，宿主 `MUST` 都支持。

**形态 A（legacy / 扁平）**：

```jsonc
{
  "axpUi": "1.0", "root": "main", "theme": "host",
  "state": { "scroll": 0, "selected": null },
  "nodes": [
    { "id": "main", "type": "Scaffold", "props": { "title": "屏幕面板" },
      "children": ["title", "tree", "row"] },
    { "id": "title", "type": "Text", "props": { "text": "当前界面节点", "style": "title" } },
    { "id": "tree", "type": "Text",
      "props": { "text": "${surface:axp://x/com.example.panel/vision/screen.text}" } },
    { "id": "row", "type": "Row", "props": { "spacing": 8 },
      "children": ["tapBtn", "refreshBtn"] },
    { "id": "tapBtn", "type": "Button", "props": { "label": "点击", "action": "ui.panel.tap" } }
  ]
}
```

`children[]` 是**节点 id 的字符串数组**，按 id 在 `nodes[]` 中查找；`root` 指向渲染入口。
`state` 是面板初始状态（`state.preserve` 热加载迁移时保留）。

**形态 B（v1.1 / 嵌套）**：

```jsonc
{
  "type": "Scaffold", "title": "记忆与储存",
  "nodes": [
    { "id": "title", "type": "Text", "props": { "text": "我的记忆", "style": "title" } },
    { "id": "input", "type": "Input", "props": { "label": "输入内容", "value": "${state:draft}" } },
    { "id": "add", "type": "Button", "props": { "label": "记住", "action": "ui.panel.add" } },
    { "id": "list", "type": "List",
      "props": { "items": "${surface:axp://x/com.example.memory/entries}", "divider": true } },
    { "id": "count", "type": "Text", "props": { "text": "条目数：${state:count}" } }
  ]
}
```

嵌套形态允许节点自带 `nodes[]` 或 `children[]`，`type`/`title` 即根节点。

## 2. 节点类型词汇表（13 种）

| type | 用途 | 关键 `props` | 可含子节点 |
|---|---|---|---|
| `Scaffold` | 页面根 | `title` / `padding` | ✅ |
| `Column` | 纵向容器 | `spacing` / `padding` | ✅ |
| `Row` | 横向容器 | `spacing` | ✅ |
| `Card` | 卡片容器 | `elevation` / `title` | ✅ |
| `Text` | 文本 | `text` / `style`(`title|mono|body`) / `maxLines` / `color` | ❌ |
| `Input` | 输入框 | `label` / `value` / `hint` / `multiline` | ❌ |
| `Button` | 按钮 | `label` / `action`（指向 `ui.actions[].id`） / `enabled` | ❌ |
| `List` | 列表 | `items` / `divider` / `emptyText` | ❌ |
| `Image` | 图片 | `src` / `contentScale` | ❌ |
| `Divider` | 分隔线 | `thickness` | ❌ |
| `Spacer` | 留白 | `size` | ❌ |
| `Select` | 选择 | `options` / `value` | ❌ |
| `Progress` | 进度 | `value` / `indeterminate` | ❌ |

每个节点 `MUST` 有唯一 `id`（`^[A-Za-z_][A-Za-z0-9_]*$`）与 `type`；
`children[]`/`nodes[]` 中引用的 id `MUST` 存在于同一 panel（由 `tools/spec-lint.mjs` 断言）。
未知 `type` 的宿主行为：`SHOULD` 渲染为占位文本而非崩溃（Android `PluginActivity` 即如此）。

## 3. 绑定表达式

`props` 里的字符串值 `MAY` 含插值：

| 表达式 | 含义 | 刷新时机 |
|---|---|---|
| `${state:<key>}` | 取面板 `state.<key>` | `ctx.ui.push(node, value)` 或 `state` 变化 |
| `${surface:<axp-uri>}` | 取该 Surface 最近一次 `full`/`delta` 的值 | Surface 产生 delta 时**自动** |

`ui.bind[]` 是**声明式**绑定，优先级高于插值：

```
ui.bind[].from = axp://...        (MUST watchable:true)
ui.bind[].to   = ui.panel.<nodeId> (MUST 存在于 panel.json)
```

宿主 `MUST`：① 建立 Surface 订阅；② 收到 delta 时把值写入 `<nodeId>` 的 `props.text`（Text）或 `props.items`（List）；③ 重绘该节点。
`axp-android-host` 的 `AxpHost.SurfaceListener → PluginActivity.render()` 与 `axp ui <plugin>` 返回的 `bindings` 快照都实现了这条。

## 4. `ui.actions` 与 `lifecycle`

`actions[]` = `{ id, tool }`。`Button.props.action` → `id` → `tool` → 本包 `tools[].id`。
调用 `MUST` 继承工具的 `confirm` / `sideEffects` 策略（C18）；`tool` 不存在 → `UI_ACTION_TOOL_MISSING`。

`lifecycle` 三个回调都是**包内 JS 文件**，签名：

```js
export function onLoad(state, ctx) { /* 返回新 state */ }
export function onReload(oldState, newState, ctx) { /* 返回迁移后的 state */ }
export function onUnload(state, ctx) { /* 清理 */ }
```

宿主 `MUST` 在插件界面打开 / 热替换完成 / 界面关闭时分别调用；
只写 `run(args)` 的旧插件 `MUST` 仍能装载（16 §3 向后兼容）。

## 5. 宿主渲染义务（AXP-2）

| 义务 | 断言 |
|---|---|
| 插件管理页为 `ui.panel` 插件提供可点击入口 | `11 §5` / C17 |
| 解析两种 panel 形态、渲染 13 种节点 | `15-panel.schema.json` + spec-lint |
| 建立 `ui.bind` 订阅并自动刷新 | C09 / C17 |
| `ui.actions` 回填工具并继承 confirm | C18 / C06 |
| 执行三个 lifecycle 回调 | `08` / C23 |
| 无 `ui{}` 插件仍可在列表查看、被 Agent 调用、启停 | 14 §1 / C08 |

`ui.widget / ui.web / ui.activity / ui.inject` 的入口文件同样受「未声明文件不执行」约束（14 §4），
但它们的渲染细节由宿主决定，本文件只约束 `ui.panel`。

## 6. Schema

`15-panel.schema.json` 用 `anyOf` 接受形态 A/B，`$defs.node` 定义节点，
`MUST NOT` 被并入 `axp.json` 校验。CI 通过 `tools/spec-lint.mjs` 对全部 `panel.json` 做真实校验与 id 引用检查。
