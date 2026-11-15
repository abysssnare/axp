# 教程 · 用 `axp://` 标准域感知环境（M3）

> 状态：Stable
> 适用：AXP v1.x · Android API 26+ · 宿主 AXP-1+
> 最后更新：2026-11-14

规范定义见 [`../spec/05-domains.md`](../spec/05-domains.md)，可直接抄的示例见 [`../examples/04-domains/`](../examples/04-domains/)。

## 前置条件

- 完成 [`plugin-tutorial.md`](plugin-tutorial.md) 与 [`ui-tutorial.md`](ui-tutorial.md)
- 宿主实现 §8 装载流水线、Surface 订阅与 `ui.bind`
- 读过 `spec/05-domains.md` 的 13 个标准域总表

## 步骤 1 · 选域，别自己发明 URI

宿主内置 13 个域，每个域规定了 `views` / `anchor` / `watchable` / 最低权限：

| 域 | URI 模式 | anchor | 可订阅 | 最低权限 |
|---|---|---|---|---|
| `fs` | `axp://fs/<path>` | line / offset / range | ✅ | L1 |
| `screen` | `axp://screen` | node | ✅ | L2 |
| `app` | `axp://app/<package>` | uri | ✅ | L1 |
| `notification` | `axp://notification/stream` | uri | ✅ | L1 |
| `intent` | `axp://intent/<action>` | uri | ✅ | L1 |
| `sensor` | `axp://sensor/<type>` | uri | ✅ | L1 |
| `clipboard` | `axp://clipboard` | uri | ✅ | L1 |
| `telephony` | `axp://telephony/<kind>` | uri | ✅ | L1 |
| `logcat` | `axp://logcat` | line | ✅ | L3 |
| `pm` | `axp://pm/<package>` | uri | ❌ | L3 |
| `media` | `axp://media/<id>` | uri | ✅ | L1 |
| `net` | `axp://net/<iface>` | uri | ✅ | L1 |
| `sysprop` | `axp://sysprop/<key>` | uri | ❌ | L3 |

要用宿主没有的域，用 `axp://x/<自身插件 id>/<name>` 注册自定义域（前缀强制，防抢占）。

## 步骤 2 · 声明 Surface

```jsonc
{
  "uri": "axp://fs/{path}",          // {} 是 URI 模板，宿主订阅时展开
  "views": ["text", "tree", "tokens", "diagnostics"],
  "anchor": "line",                  // 配合 #L12:C3 之类的定位
  "watchable": true,                 // 支持订阅增量
  "auth": "L1",
  "impl": { "js": "surfaces/fs.js" }
}
```

三个字段各管一件事，别混：

- `views` —— 同一实体的**多种呈现**（文本、树、图像、符号、诊断）
- `anchor` —— **怎么定位**（节点 / 行列 / 偏移 / 范围 / URI）
- `watchable` —— **能不能订阅变更流**

`pm` 与 `sysprop` 在标准域表里是 ❌，声明时 `watchable` 保持 `false`，也**不要**把它们写进 `ui.bind[].from` 或 `events[].on`。

## 步骤 3 · 把流接到界面

```jsonc
"ui": {
  "panel": { "kind": "dsl", "entry": "ui/panel.json" },
  "bind": [
    { "from": "axp://screen", "to": "ui.panel.screenTree" },
    { "from": "axp://notification/stream", "to": "ui.panel.notify" },
    { "from": "axp://sensor/motion", "to": "ui.panel.motion" }
  ]
}
```

`to` 格式固定 `ui.panel.<node-id>[.<prop>]`，`MUST` 能在 `panel.json` 里解析到节点，否则装载报 `UI_BIND_TARGET_MISSING`。`from` 指向的 Surface `MUST` 是 `watchable: true`，否则 `SURFACE_NOT_WATCHABLE`。

界面节点里也可以用内联表达式，二者等价：

```json
{ "id": "screenTree", "type": "Text",
  "props": { "text": "${surface:axp://screen.tree}", "style": "mono" } }
```

见 [`../spec/06-ui-vocab.md`](../spec/06-ui-vocab.md) §4。

## 步骤 4 · 把流当事件源

```jsonc
"events": [
  { "on": "axp://notification/stream",
    "filter": "text~'验证码'",
    "run": { "js": "events/otp.js" },
    "privilege": "L1" },
  { "on": "lifecycle/tool.before",
    "when": { "tool": "sys.readProp" },
    "run": { "js": "events/audit-read.js" } }
]
```

两类触发源：① 任意 `watchable` Surface 流 + `filter`；② 生命周期命名空间。这是 AXP 相对固定 hook 事件表的增量。

## 步骤 5 · 权限按域分层

```jsonc
"capabilities": {
  "privilege": "L3",
  "requests": [
    "accessibility.read",       // screen (L2)
    "notification.listen",      // notification
    "sensor.motion",            // sensor
    "clipboard.read",           // clipboard
    "net.stat",                 // net
    "sysprop.read",             // sysprop (L3)
    "logcat.read",              // logcat (L3)
    "fs.read:app"               // fs
  ],
  "dangerous": ["accessibility.read", "sysprop.read", "logcat.read"]
}
```

`requests` 必须是 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) 词汇表里的项，否则 `CAP_UNKNOWN_REQUEST`。`dangerous` 必须是 `requests` 的子集，宿主装载时单独向用户确认。

同一工具在不同权限层走不同实现，用 `gradient`：

```jsonc
"gradient": {
  "L1": { "impl": { "js": "tools/read-file.js" } },
  "L3": { "impl": { "js": "tools/read-file.js", "proc": { "cmd": "bin/read-file", "args": [] } } }
}
```

宿主按「当前可用最高层 → 该层内按 `native > kotlin > wasm > bin > js > proc > url` 选形态」降级，见 [`../spec/03-impl-reference.md`](../spec/03-impl-reference.md) §2。

## 步骤 6 · 校验

```bash
node validator/src/validate.mjs examples/04-domains
node cli/bin/axp.mjs inspect examples/04-domains
```

## 验证

- [ ] 校验全绿，8 个 Surface / 3 个 tool / 1 个 agent / 2 个 event
- [ ] 5 条 `ui.bind` 的 `from` 全部指向 `watchable: true` 的域
- [ ] `sysprop` / `logcat` 类 L3 请求都列进了 `dangerous`
- [ ] 把 `gradient` 键写成 `L4`（超过 `privilege: L3`）→ `GRADIENT_EXCEEDS_PRIVILEGE`
- [ ] 把自定义域写成 `axp://x/other.plugin/foo` → 校验拒绝（前缀必须是自身 id）

## 常见错误

| 现象 | 原因 | 处理 |
|---|---|---|
| `SURFACE_NOT_WATCHABLE` | 把 `pm` / `sysprop` 这类不可订阅域写进 `bind` / `events` | 改用可订阅域，或改成 tool 主动读取 |
| `UI_BIND_TARGET_MISSING` | `to` 的 node-id 在 `panel.json` 里不存在 | 对齐节点 id |
| `CAP_UNKNOWN_REQUEST` | 权限名拼错或用通配符 host | 查 `04-capabilities.md` 词汇表 |
| 自定义域被拒 | 前缀不是 `axp://x/<自身 id>/` | 换成自身 `id` |
| 面板不刷新 | 宿主没实现 `watchable` 增量推送 / 背压 | 见 [`runtime-guide.md`](runtime-guide.md) 步骤 3 |
| 真机上读屏为空 | 未拿到 L2 无障碍授权 | 单独确认 `accessibility.read` |

## 下一步

- 让插件热更新不重启 → [`hot-reload-tutorial.md`](hot-reload-tutorial.md)
- 把标准域接到真机 → [`runtime-guide.md`](runtime-guide.md) 步骤 4 的 `HostBridge.surface()` 对照表
