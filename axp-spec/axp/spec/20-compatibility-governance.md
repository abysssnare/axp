# 20 · 兼容性、版本互操作与规范治理

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 与 `09-versioning.md` 互补：09 管**格式版本**，本文件管**宿主协商、等级判定、变更流程与迁移**。

## 1. 五类版本号（复述 13 §4，给出互操作规则）

| 版本 | 谁读 | 不匹配时 |
|---|---|---|
| `axp:"1.0"`（格式） | 校验器 / 宿主 | `MUST` 拒绝非 `1.0`（v1.x 内不改） |
| 规范文档版本 `1.1.0` | 人类 / CI | 仅影响文档，`MUST NOT` 改变清单校验结果 |
| 插件 `version` | `requires[].range` / 索引 | 选满足 range 的最高版本 |
| `minHost` / `hostVersion` | 宿主 | 宿主低于 `minHost` → `INSTALL_MIN_HOST` |
| `axpIndex:"1.0"` | 索引读取方 | 不认识 → `INDEX_VERSION_UNSUPPORTED` |

## 2. v1.x 变更规则（**只做加法**）

允许（无需提升格式版本）：
- 新增**可选**顶层字段？ ❌ **不允许** —— `additionalProperties:false` 会让旧宿主拒新包；新增顶层字段 `MUST` 走格式版本升级。
- 新增**可选子字段 / 枚举值**（如 `runtimeServices += storage`）✅；
- 新增**独立** schema 文件（10/15/16）✅；
- 新增专章、教程、错误码、一致性用例 ✅；
- 收紧**校验器**对已有字段的检查（把原本宽容的变成明确拒绝）✅，但 `MUST` 在 CHANGELOG 标注「行为变更」。

禁止：
- 改已有字段的语义、类型、必填性；
- 删除已有枚举值；
- 让 v1.0 合法清单在 v1.1 变得不合法。

**回归断言**：`tools/spec-lint.mjs` 的 `v1.0-baseline` 检查会拿 v1.0 的 4 个原始夹具跑当前校验器，要求全部仍 `ok:true`；若变红即违反本条。

## 3. 宿主能力协商

宿主 `MUST` 在 `registry.json` 声明 `hostLevel`（`AXP-0..3`）与可选 `hostVersion`，并 `MUST` 随 App 发布能力态 `host.json`（21 §5）——本节协商的输入即来自该文件。
安装时按下列顺序判定（任一不满足 → 整包拒绝，不写注册表）：

1. `minAndroid <= Build.VERSION.SDK_INT` → 否则 `INSTALL_MIN_ANDROID`；
2. `abis` 与设备 ABI 有交集，或为空（纯 JS）→ 否则 `INSTALL_ABI_UNSUPPORTED`；
3. `minHost <= hostVersion`（按 semver）→ 否则 `INSTALL_MIN_HOST`；
4. 插件声明的等级（由组件推断，§4）`<= hostLevel` → 否则按**可降级协商**处理：超出等级的功能若能安全停用（如工具在 `gradient` 中无可用层 → 标 `available:false`；`hotReload` 超出 → 按不可用处理并通过协商机制告知 Agent），`MUST` 接受整包、把这些功能标 `available:false` 并写审计 `INSTALL_HOST_LEVEL_NEGOTIATED`；仅当存在无法降级的组件（如纯 L3 实现且无低层回退）才 `INSTALL_HOST_LEVEL` 整包拒绝。`minAndroid` / `abis` / `minHost` 不参与降级（不满足即拒）；`hostLevel` 按本条协商；
5. `requires[]` 闭包全部已启用且满足 range → 否则 `INSTALL_DEPENDENCY_MISSING`。

宿主 `MUST NOT` 用「索引里的 capabilities 快照」替代包内清单做以上判定（10 §2 规则 4）。

## 4. AXP-0 … AXP-3 正式判定矩阵

| 能力 | AXP-0 | AXP-1 | AXP-2 | AXP-3 |
|---|:---:|:---:|:---:|:---:|
| 九步装载 + `tools[]` 调用 | ✅ | ✅ | ✅ | ✅ |
| 注册表 / `agent-tools` 投影 / `ctx` 基础 | ✅ | ✅ | ✅ | ✅ |
| `surfaces[]` / `knowledge[]` / `ui.bind` 订阅 | — | ✅ | ✅ | ✅ |
| `index.json` / `session-install` 意图 | — | ✅ | ✅ | ✅ |
| 渐进披露 / `allowedTools` 白名单 / `available` 标注 | — | ✅ | ✅ | ✅ |
| `agents[]` / `events[]` / 插件 UI 页（点开） | — | — | ✅ | ✅ |
| `ui.actions` 继承 confirm / `ctx.ui.push` / 存储隔离 | — | — | ✅ | ✅ |
| L0–L5 `gradient` 全语义 | — | — | — | ✅ |
| `hotReload{}` 全语义（每次验签/状态迁移/回滚） | — | — | — | ✅ |
| 生产 APK v3 验签 / 吊销 / 更新回滚 | — | — | — | ✅ |
| 13 域真机适配器（或逐项声明 `DOMAIN_UNAVAILABLE`） | — | — | — | ✅ |

判定：某等级**全部**用例（12 §2 中该等级及以下的 C 项）通过 → 可声明；
未实现项 `MUST` 列入一致性声明的 `notImplemented`（13 §6），`MUST NOT` 标成通过。

本套交付：
- Node 参考运行时 `axp-spec/axp/runtime/` → **AXP-3**（26/26）；
- CLI 宿主 `axp-spec/axp/cli/` → **AXP-3**（26/26，无 UI 渲染但返回 `ui()` 快照）；
- Android 宿主 `axp-android-host/` → **AXP-2**（26/26 core；热加载/真验签/Shizuku 列入 `notImplemented`）。

## 5. 字段弃用三段流程

1. **Deprecated（v1.x）**：在 `14-manifest-reference.md` 标注 `⚠️`，校验器发 `WARN_*`，语义不变；
2. **Frozen（下一个 v1.x）**：不再推荐新插件使用，文档给迁移写法，仍可校验；
3. **Removed（仅格式版本 +1）**：从 schema 移除，同时提供 `axp migrate` 命令与迁移指南。

`MUST NOT` 在 v1.x 内直接删除字段。

## 6. spec-change 提案流程

模板见 `axp-spec/axp/.github/ISSUE_TEMPLATE/spec-change.md`。每个提案 `MUST` 含：

- 动机的**反例**（哪个现有合法/非法场景处理不了）；
- 影响的字段与 schema diff；
- 对 v1.0 基线的回归结论（spec-lint 结果）；
- 新增/修改的 C 编号（一致性用例）；
- 实现影响（Node CLI / Java core / Android App 三处是否都要改）；
- 向后兼容判定（按 §2 的允许/禁止清单）。

合并前 `MUST`：31 / 47 / 30 / 26 四套 + `spec-lint` 全绿、0 断链、CHANGELOG 有条目。

## 7. CHANGELOG / tag / Release

- 格式版本不变时打 **规范文档版本** tag，如 `spec-v1.1.0`；
- Release 产物：`axp-spec-<version>.zip`（`axp/spec/` 全量）、`AXP-v1.1-规范全文合订.md`、一致性报告 JSON；
- CHANGELOG 分组：`Added / Changed / Deprecated / Fixed / Security`，`Security` 必须引用 `18-security-model.md` 的 T 编号。

## 8. v1.0 → v1.1 迁移指南（本轮）

| 你是… | 要做什么 |
|---|---|
| **插件作者（v1.0 包）** | **无需改动**，清单校验结果不变；想用 `ctx.storage` 才加 `runtimeServices:["storage"]` + `fs.read/write:<scope>` |
| **工具链维护者** | 升级 CLI 到含 `install/publish/index/agent-tools/conformance` 的版本；schema 多一个可选枚举值 |
| **宿主开发者** | 实现 `10`（十步安装）、`11`（注册表/投影/UI 入口）、`16`（`ctx`），跑 `12` 的 C01–C26 声明等级 |
| **站点维护者** | 文档站改从示例仓拉快照，别再写死 `exampleCount===4` |

`v1.1.0` 的全部新增都是**加法 + 独立 schema + 专章**，没有改动 `01-format.md` §0–§12 与 8 个必填字段。
