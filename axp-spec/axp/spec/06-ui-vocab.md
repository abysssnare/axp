# 06 · UI DSL 节点词汇表

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本文件定义 `ui.panel` / `ui.widget` 使用 `kind: "dsl"` 时的 `panel.json` 结构。`web` 与 `native` 形态不受本文件约束。

## 1. 文档结构

```jsonc
{
  "axpUi": "1.0",
  "root": "main",
  "nodes": [ /* 见 §2 */ ],
  "state": { "scroll": 0, "selected": null },
  "theme": "host"
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `axpUi` | ✅ | DSL 版本，本版 `"1.0"` |
| `root` | ✅ | 根节点 id |
| `nodes` | ✅ | 节点数组，扁平声明，通过 `children` 组成树 |
| `state` | | 初始局部状态；热加载时按 `hotReload.state.preserve` 保留 |
| `theme` | | `host`（跟随宿主） / `dark` / `light` |

## 2. 节点通用字段

```jsonc
{ "id": "title", "type": "Text", "props": { "text": "hello" }, "children": [], "bind": "..." }
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 节点唯一 id，供 `ui.bind[].to` / `actions[].id` / `state.preserve` 寻址 |
| `type` | ✅ | 见 §3 词汇表 |
| `props` | | 节点属性 |
| `children` | | 子节点 id 数组（容器类必填） |
| `bind` | | 内联绑定表达式，等价于在 `ui.bind` 中声明一条 |
| `visible` | | 绑定表达式，求值 false 时隐藏 |

## 3. 节点词汇表

### 容器

| type | props | children |
|---|---|---|
| `Scaffold` | `title`, `padding` | ✅ |
| `Column` | `spacing`, `scroll` | ✅ |
| `Row` | `spacing`, `align` | ✅ |
| `Box` | `padding`, `align` | ✅ |
| `Card` | `elevation` | ✅ |
| `List` | `items`(绑定表达式), `divider` | 模板子节点 |
| `Grid` | `columns`, `items` | 模板子节点 |
| `Tabs` | `tabs`, `selected` | ✅ |

### 内容

| type | props |
|---|---|
| `Text` | `text`, `style`, `maxLines` |
| `Image` | `src`, `scale`, `contentDescription` |
| `Icon` | `name`, `tint` |
| `Button` | `label`, `action`(动作 id), `enabled` |
| `Input` | `label`, `value`(绑定), `onChange`(动作 id), `multiline` |
| `Switch` | `label`, `checked`(绑定), `onChange` |
| `Slider` | `min`, `max`, `value`, `onChange` |
| `Progress` | `value`, `indeterminate` |
| `Divider` | `thickness` |
| `Spacer` | `size` |
| `Web` | `url`, `bridge` |
| `Chart` | `series`, `kind` |

### 动作事件

`Button.action` / `Input.onChange` / `Switch.onChange` / `Slider.onChange` 的值 `MUST` 是 `ui.actions[].id`；宿主 `MUST` 在装载时校验 `actions[].tool` 指向本包 `tools[].id`。

## 4. 绑定表达式

```
${surface:<uri>}        // 读取 Surface
${surface:<uri>.<view>} // 指定视图
${state:<key>}          // 读取局部 state
${i18n:<key>}           // 读取 i18n/
${props:<key>}          // 读取宿主注入属性
```

示例：

```jsonc
{ "id": "tree", "type": "Text", "props": { "text": "${surface:axp://screen.text}" } }
```

等价的清单声明：

```jsonc
"ui": { "bind": [ { "from": "axp://screen", "to": "ui.panel.tree" } ] }
```

`to` 路径格式：`ui.panel.<node-id>[.<prop>]`，`MUST` 能在 `panel.json` 中解析到节点。

## 5. 样式 token

`style` ∈ `display / title / body / label / caption / mono`；颜色与间距由 `theme: "host"` 提供，插件 `MUST NOT` 硬编码绝对像素密度。宿主 `MAY` 提供 token 覆盖表。

## 6. 生命周期契约

`ui.lifecycle` 的三个回调由宿主按以下时机调用，签名由宿主 SDK 定义，格式只规定时机与输入：

| 回调 | 时机 | 输入 | 宿主义务 |
|---|---|---|---|
| `onLoad` | 首次挂载界面 | `{ state, bindings }` | 完成后界面可见 |
| `onReload` | 热替换成功后 | `{ oldState, newState, changed[] }` | 先按 `state.migrate` 迁移，再调用；失败则触发回滚 |
| `onUnload` | 卸载 / 替换前 | `{ state }` | 释放资源；`MUST` 在旧类加载器回收前完成 |

启用 `hotReload` 且 `targets` 含 `ui.*` 时，`lifecycle` `MUST` 至少包含 `onReload` 与 `onUnload`。

## 7. 完整示例

见 [`examples/02-ui-panel/ui/panel.json`](../test/fixtures/02-ui-panel/ui/panel.json)。

## 8. 宿主一致性

| 等级 | 要求 |
|---|---|
| 最小 | 实现 `Scaffold / Column / Row / Text / Button / Input / List` 与 `${surface:}` 绑定 |
| 完整 | 本文件全部节点 + `${state:}` / `${i18n:}` + 生命周期回调 + 热重建 |
