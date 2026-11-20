# 13 · 术语、规范性约定与命名空间

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 本文件是**全规范的阅读入口**：定义关键词、术语、优先级、URI 语法与五类版本号。
> 不引入任何新字段，不改变 `02-manifest.schema.json`。

## 1. 规范性层级与冲突处理

当两份文件对同一件事说法不一致时，按以下顺序取信（前者优先）：

1. `01-format.md` —— **唯一规范性正文**（§0–§12）；
2. `02-manifest.schema.json` —— §3 的机器可读形式（draft 2020-12）；
3. `03`–`12` 专章 —— 对主规范条款的展开，不得与 01 冲突；
4. `13`–`20` 专章 —— 术语、字段参考、DSL、宿主上下文、域、安全、错误码、治理；
5. `docs/` 教程、`examples/`（独立仓）、`test/fixtures/` —— **说明性材料，不具规范效力**；
6. 参考实现（Node `runtime/`、Java `core/`、Android App） —— 语义示例，最终以规范文本为准。

`10-index.schema.json` / `15-panel.schema.json` / `16-*.schema.json` 是各自结构的机器可读形式，
它们是**分发层/界面层/宿主层**的 schema，`MUST NOT` 被合并进 `axp.json` 的校验。

关键词按 RFC 2119：`MUST` / `MUST NOT`（强制，违反即不合规）、`SHOULD` / `SHOULD NOT`（推荐，偏离须在合规声明里写明理由）、`MAY`（可选）。
本仓所有 `MUST` 都在 `12-host-conformance.md` 与 `tools/spec-lint.mjs` 中有对应断言；没有断言的条款不得写 `MUST`。

## 2. 术语表

| 术语 | 定义 | 首次出现 |
|---|---|---|
| **AXP 包** / `.axp` | 一个插件的全部文件。**目录态**用于开发，**zip 态**用于分发；包根 `axp.json` 是唯一事实源 | 01 §2 |
| **清单** / manifest | 包根 `axp.json`。`additionalProperties:false`，未在清单声明的文件一律不执行 | 01 §3 |
| **组件** | `tools[] / surfaces[] / knowledge[] / agents[] / events[] / ui{}` 六类，全部可选、数组可空 | 01 §5 |
| **实现体** / impl | 统一实现引用，七形态 `js/kotlin/native/wasm/bin/url/proc`；宿主按固定顺序择一 | 03 |
| **宿主** / host | 装载并执行 `.axp` 包的 Android 应用（或用于语义验证的 Node/Java 参考运行时） | 01 §0.1 |
| **装载** / load | 九步流水线：解析→签名→引用完整性→abis→依赖闭包→权限校验→注册组件→UI 挂载→热加载就绪。**任一步失败整包拒绝、不部分注册** | 01 §7 |
| **注册** / register | 把已装载插件写入 `registry.json`，使其组件对 Agent 可见 | 11 §2 |
| **投影** / projection | 把已启用插件的 `tools[]/knowledge[]` 摊平成 `name=<pluginId>.<toolId>` 的扁平清单，供模型做选择 | 11 §3 |
| **Surface** | 可读取/订阅的数据实体，用 `axp://` URI 寻址；`watchable:true` 时产生 `full` 快照与 `delta` 增量 | 01 §5.2 / 17 |
| **标准域** | `axp://` 下 13 个预定义命名空间（`fs/screen/app/...`）；自定义域固定前缀 `axp://x/<id>/` | 05 / 17 |
| **权限层** / L0–L5 | 沙箱→标准权限→AccessibilityService→Shizuku→Root→系统签名；`gradient` 按层自动降级 | 04 |
| **宿主上下文** / ctx | 宿主执行实现体时注入的第二参数，提供 `storage/surface/audit/ui/agent/elicit` 反向通道 | 11 §4 / 16 |
| **热加载代** / generation | 一次组件级替换产生的版本代；`rollback.keep` 决定保留几代 | 08 |
| **发布者指纹** | `distribution.publisher = sha256:<64hex>`，与签名证书绑定；换指纹即换身份 | 01 §9 / 10 |
| **会话安装** / session-install | 默认分发渠道：CLI/宿主投递安装意图，Android 宿主重新校验后写入自己的注册表 | 10 §5 |
| **一致性等级** | AXP-0 → AXP-1 → AXP-2 → AXP-3，逐级叠加能力，见 20 §4 | 01 §11 / 20 |
| **夹具** / fixture | `axp-spec/axp/test/fixtures/` 下的**内部测试资产**；对外示例全部住在 `axp-examples/` | 本文件 §5 |

## 3. 命名空间与 URI 语法

```
axp-uri      = "axp://" ( std-domain | custom-domain ) [ "/" tail ]
std-domain   = "fs" | "screen" | "app" | "notification" | "intent" | "sensor"
             | "clipboard" | "telephony" | "logcat" | "pm" | "media" | "net" | "sysprop"
custom-domain= "x/" plugin-id "/" tail
plugin-id    = reverse-domain-id  ; 与 axp.json 的 id 同一正则
tail         = 1*( unreserved / "/" / ":" / "." / "-" / "*" )
```

- 标准域的完整 URI 模板、views、anchor 见 `17-domains-reference.md`；
- 自定义域 `MUST` 以 `axp://x/<自身 id>/` 开头，宿主 `MUST` 拒绝插件声明别的 `id` 的自定义域；
- `MUST NOT` 使用 `axp://mcp/` / `axp://skill/` 等外部格式名作为域前缀（同级独立，`07-expression-map.md` 只作验收材料）。

## 4. 五类版本号（不要混用）

| 名称 | 位置 | 例 | 含义 |
|---|---|---|---|
| **格式版本** | `axp.json` 的 `axp` | `"1.0"` | 清单语法代；v1.x 内 `MUST` 保持 `"1.0"` |
| **规范文档版本** | 各 spec 头部 / `09-versioning.md` | `1.0.0` → `1.1.0` | 规范文本的发布版本，**不改变格式版本** |
| **插件版本** | `axp.json` 的 `version` | `1.2.3` | semver，`requires[].range` 与之比较 |
| **宿主版本** | `minHost` / 宿主 `hostVersion` | `0.1.0` | 宿主能力协商（20 §3） |
| **索引版本** | `index.json` 的 `axpIndex` | `"1.0"` | 分发索引结构版本，与格式版本独立 |

`v1.1.0` 规范新增 13–20 专章、新增 `storage` 可选值与 3 个附属 schema，
**属于加法**：v1.0 合法清单在 v1.1 校验结果不变（由 `tools/spec-lint.mjs` 的「v1.0 基线回归」断言保证）。

## 5. 三仓边界（本文件效力说明）

| 仓库 | 规范地位 |
|---|---|
| `axp-spec/` | 规范、Schema、校验器、CLI、参考运行时、一致性套件、`test/fixtures/` |
| `axp-examples/` | 说明性示例，**不具规范效力** |
| `axp-android-host/` | 参考实现，**不具规范效力**；其 `conformance/` 用同一张 C01–C26 表证明实现与文本一致 |

`test/fixtures/` 与 `axp-examples/` 内容可以相同，但**性质不同**：前者是 CI 断言的输入，删掉会让套件红；后者是对外教学材料，可自由增删。
这正是「示例模块放在示例仓库」的规范依据。

## 6. 一致性声明格式

宿主 `MUST` 在 README 用下列结构声明等级，不得只写「支持 AXP」：

```jsonc
{
  "axpConformance": "1.0",
  "hostLevel": "AXP-2",
  "hostVersion": "1.0.0",
  "suite": "axp-conformance/1.0",
  "cases": { "passed": 26, "failed": 0 },
  "notImplemented": ["hotReload", "apk-v3-strict", "shizuku-l3"]
}
```

未实现的 `MUST` 项 `MUST` 出现在 `notImplemented`，`MUST NOT` 标成通过（`12-host-conformance.md` §4）。
