# 16 · 宿主上下文 `ctx`、反向通道与宿主层 Schema

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 把 `11-plugin-management-agent.md` §4 从「约定」提升为**正式契约**，并给出 `registry.json` / `install-intent.json` / `index.json` 的机器可读形式。
> 配套：[`16-registry.schema.json`](16-registry.schema.json) · [`16-install-intent.schema.json`](16-install-intent.schema.json) · [`10-index.schema.json`](10-index.schema.json)。

## 1. 为什么必须有这一层

`axp.json` 只**声明**能力（`fs.write:shared`、`runtimeServices`），不规定插件怎么拿到文件句柄、怎么发布 Surface、怎么让界面刷新。
v1.0 把这些全留给宿主，导致「带储存的记忆系统」「能写文件的 PDF 插件」无法只靠清单实现。
本章定义宿主执行实现体时 `MUST` 注入的第二参数 `ctx` —— 这是**格式与运行时之间唯一需要固定的缝隙**，不触碰「AXP 不是运行时」（01 §0.1）的边界。

## 2. `runtimeServices` 与 `ctx` 能力矩阵

| `runtimeServices` 值 | 启用 `ctx` 能力 | 额外权限要求 | 未声明时 |
|---|---|---|---|
| `storage` | `ctx.storage.*` | `fs.read:<scope>`（读）/ `fs.write:<scope>`（写） | `STORAGE_DENIED` |
| `sampling` | `ctx.agent.request(prompt)` | 无 | `CONTEXT_DENIED` |
| `elicitation` | `ctx.elicit(schema)` | 无 | `CONTEXT_DENIED` |
| `ui.push` | `ctx.ui.push(node, value)` | 存在 `ui{}` | `CONTEXT_DENIED` |
| `audit.read` | 读审计（宿主侧） | 无 | — |
| （默认） | `ctx.surface.*` / `ctx.audit.log` / `ctx.confirm` | Surface 须已声明 | `SURFACE_UNDECLARED` |

`storage` 是 **v1.1 新增可选值**（02 schema 纯加法）。未使用它的 v1.0 插件校验结果不变。

## 3. `ctx` 方法契约

宿主 `MUST` 提供下表；方法签名为**逻辑契约**，具体绑定方式（Java 接口 / JS 对象 / WebView `JavascriptInterface`）由宿主决定。

| 方法 | 入参 | 返回 | 语义 |
|---|---|---|---|
| `storage.get(key)` | string | any\|null | 读本包命名空间；未声明 `fs.read` → `STORAGE_DENIED` |
| `storage.put(key, value)` | string, any | boolean | 写本包命名空间；未声明 `fs.write` → `STORAGE_DENIED` |
| `storage.list()` | — | `[key, value][]` | 枚举本包全部键 |
| `storage.remove(key)` | string | boolean | 删除 |
| `surface.publish(uri, delta)` | `axp://`, any | boolean | `uri` `MUST` 在 `surfaces[].uri` 中；触发 `ui.bind` 刷新 |
| `surface.read(uri)` | `axp://` | any\|null | 读最近一次值 |
| `audit.log(event)` | object | void | 追加结构化审计；插件 `MUST NOT` 能删除/改写已有条目 |
| `ui.push(node, value)` | string, any | boolean | 主动更新 `ui.panel.<node>` |
| `agent.request(prompt)` | string | object | `sampling` 反向通道，宿主可转模型 |
| `elicit(schema)` | object | object | `elicitation` 反向通道 |
| `confirm` | boolean（属性） | — | 本次调用是否已由用户确认 |

**存储隔离（MUST）**：命名空间按 `axp.json` 的 `id` 划分；`MUST NOT` 允许插件读/写另一个 `id` 的空间；
`MUST NOT` 允许未声明 `fs.write` 的插件落盘。C20 用「声明 `storage` 但不给 `fs.write`」验证返回 `STORAGE_DENIED`。

## 4. 实现体执行契约

- 工具 JS `MUST` 导出 `run(args, ctx)`；只写 `run(args)` 的 v1.0 插件 `MUST` 仍能装载（向后兼容，C05）。
- 宿主执行前 `MUST` 剥离文件顶部的 `export ` 前缀（Node `vm` / JVM Nashorn / Android WebView 三种执行器已一致）。
- **语法基线 `SHOULD` 为 ES5**（`var` / `function`，不用 `??`、`?.`、箭头函数、模板字符串）——真机 WebView 与 Nashorn 兼容性由 C06 保证；
  `tools/spec-lint.mjs` 会对全部 `.js` 做静态扫描并报错。
- 返回值 `MUST` 是可 JSON 序列化的对象；抛出的异常 `MUST` 被宿主捕获并转成结构化错误（19），`MUST NOT` 让宿主崩溃。
- 宿主 `MUST` 设执行超时（`axp.json` 的 `runtime.cpuPct` 可作参考），超时 → `IMPL_TIMEOUT`。

## 5. `registry.json`（宿主注册表）

结构见 `16-registry.schema.json`。`MUST` 支持 `list / install / uninstall / enable / disable` 五个操作。
`enabled:false` 的插件 `MUST NOT` 进入 `agent-tools` 投影，`MUST NOT` 被装载执行（C08）。
插件管理页 `MUST` 展示：名称、版本、发布者指纹、权限层、是否有 UI、点开入口（11 §2）。

CLI 写在 `$AXP_HOME/registry.json`，Android 写在 `filesDir/axp/registry.json`，**同构**（三仓互认）。

## 6. `install-intent.json`（session-install 意图）

结构见 `16-install-intent.schema.json`。CLI 投递，Android 宿主消费并**重新执行** 10 §3 的第 2–7 步，
`MUST NOT` 信任 CLI 的结论（C14）。`createdAt` `MUST` 为 ISO-8601 UTC 字符串。

## 7. `index.json`（分发索引）

结构见 `10-index.schema.json`。`plugins[].capabilities` 是**索引期快照**，安装时 `MUST` 以包内清单重新校验，
`MUST NOT` 用索引字段替代（10 §2 规则 4）。`revoked[]` 命中 → `INSTALL_REVOKED`（C26）。

## 8. 一致性

| 等级 | 本章要求 |
|---|---|
| AXP-0 | §3 基础 `ctx`、§4 执行契约、§5 注册表 |
| AXP-1 | + §6 意图、§7 索引 |
| AXP-2 | + `ui.push`、存储隔离强制校验、插件 UI 入口 |
| AXP-3 | + 全部反向通道与审计不可篡改 |

`tools/spec-lint.mjs` 会现场生成一份 registry / intent / index 并用上述三个 schema 真实校验。
