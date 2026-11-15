# 05 · `axp://` 标准域

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

Surface 由 `axp://` URI 寻址。宿主 `MUST` 内置下列 13 个标准域；插件可注册自定义域。

## 1. 标准域总表

| 域 | URI 模式 | views | anchor | watchable | 最低权限 | 用途 |
|---|---|---|---|---|---|---|
| `fs` | `axp://fs/<path>` | text, tree, tokens, diagnostics | line, offset, range | ✅ | L1 | 文件与文档视图 |
| `screen` | `axp://screen` | tree, text, image | node | ✅ | L2 | 当前屏幕节点树 |
| `app` | `axp://app/<package>` | meta, tree | uri | ✅ | L1 | 已安装应用与前台状态 |
| `notification` | `axp://notification/stream` | text, tree | uri | ✅ | L1 | 通知流（可作事件源） |
| `intent` | `axp://intent/<action>` | meta | uri | ✅ | L1 | Intent 收发 |
| `sensor` | `axp://sensor/<type>` | value | uri | ✅ | L1 | 传感器数值流 |
| `clipboard` | `axp://clipboard` | text, image | uri | ✅ | L1 | 剪贴板 |
| `telephony` | `axp://telephony/<kind>` | meta, text | uri | ✅ | L1 | 短信与通话状态 |
| `logcat` | `axp://logcat` | text | line | ✅ | L3 | 系统日志流 |
| `pm` | `axp://pm/<package>` | meta, tree | uri | ❌ | L3 | 包管理 |
| `media` | `axp://media/<id>` | image, audio | uri | ✅ | L1 | 媒体与截图 |
| `net` | `axp://net/<iface>` | value, text | uri | ✅ | L1 | 网络状态 |
| `sysprop` | `axp://sysprop/<key>` | value | uri | ❌ | L3 | 系统属性 |

`views` 是宿主 `MUST` 提供的最小集合；插件可在 `surfaces[].views` 中声明额外视图名。

## 2. URI 语法

```
axp://<domain>/<path>[?<query>][#<anchor>]
```

- `<domain>`：标准域名或 `x` 开头的自定义域。
- `<query>`：键值过滤，如 `?app=com.bank.*`。
- `#<anchor>`：配合 `surfaces[].anchor` 定位到节点 / 行列 / 偏移 / 范围。

URI 模板（带 `{}` 占位符）用于声明一类资源，例如 `axp://fs/{path}`；宿主 `MUST` 在订阅时展开。

## 3. watchable 与增量

`watchable: true` 的 Surface `MUST` 支持：

- 订阅 / 退订
- 增量推送（首次全量，之后 diff）
- 背压：宿主可声明最大推送频率，插件 `SHOULD` 遵守

`events[].on` 可直接指向 `watchable` 流并附加 `filter`；`ui.bind[].from` 也可指向该流实现界面自动刷新。

## 4. 自定义域注册

插件 `MAY` 声明 `axp://x/<plugin-id>/<name>`：

```jsonc
{
  "uri": "axp://x/com.example.demo/vision/screen",
  "views": ["tree", "image"],
  "anchor": "node",
  "watchable": true,
  "auth": "L2",
  "impl": { "kotlin": "surfaces/vision/vision.dex#ScreenSurface" }
}
```

规则：

- 前缀 `MUST` 为 `axp://x/<自身 id>/`，否则校验失败（防止抢占他人命名空间）。
- 自定义域不得与标准域同名。
- `auth` `MUST` ≤ `capabilities.privilege`。

## 5. 与组件的关系

```
surfaces[]  声明「有什么数据」      ← 本文件定义寻址
events[]    订阅「数据变了要做啥」  ← on: axp://...
ui.bind[]   把数据接到界面节点      ← from: axp://...
tools[]     对数据执行动作          ← 由 ui.actions / agents 调用
```


---

## 6. v1.1 域归一化（勘误）

v1.0 草案的示例曾使用一个以 `vision` 为域名、`screen` 为路径的 URI（`axp://vision` 拼接 `/screen`）。该写法既不属于 §1 的 13 个标准域，也不符合 §4 的自定义域格式 `axp://x/<id>/…`，属于规范内部不一致。

自**文档版本 1.1.0** 起：

- 规范正文、教程、示例、参考运行时与文档站点 `MUST` 统一使用标准域 `axp://screen`（views `tree/text/image`，anchor `node`，最低权限 L2）。
- 宿主 `MAY` 对 v1.0 草案包做归一化映射以兼容旧包，但 `MUST NOT` 把该写法当作合法域对外声明，也 `MUST NOT` 在新插件中建议它。
- `scripts/spec-check.mjs` `MUST` 断言仓库内不存在该遗留写法。

本勘误**不改变 `formatVersion`**（`axp` 仍为 `"1.0"`）：URI 字符串取值属于域词汇表，不属于清单结构。版本对齐见 [`09-versioning.md`](09-versioning.md) §7 与 [`index.json`](index.json)。
