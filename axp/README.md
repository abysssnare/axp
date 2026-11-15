# AXP — Agent eXtension Package

> 一种**与 MCP / LSP / Agent Skills / Claude Plugins / OpenCode Plugins / DSH 规范地位平级**的、**Android 专属**的独立插件描述格式。

[![CI](https://github.com/OWNER/axp/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/axp/actions/workflows/ci.yml)
![Spec](https://img.shields.io/badge/spec-v1.0.0-blue)
![Docs](https://img.shields.io/badge/docs-v1.1.0-10b981)
![Platform](https://img.shields.io/badge/Android-API%2026%2B-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## 一句话定位

AXP 定义「一个插件长什么样」：一个 `.axp` 包、一份 `axp.json` 清单、六类组件、一套 Android 原生权限模型，外加 **UI** 与 **热加载** 两个一等能力。

它**不是协议、不是桥、不是适配层、不是元格式**。AXP 不接入任何外部插件运行时，不导入/转译/代理它们的插件，也不把自己导出成它们的格式。它和那些格式是**同级规范**：各自定义自己的清单与组件语义，互不依附。

「规范地位平级」与「表达能力覆盖」是两件事：AXP 的组件模型足以表达上述格式中出现过的全部组件类型，逐字段证明放在 [`spec/07-expression-map.md`](spec/07-expression-map.md)（对外验收材料）；规范正文不借用任何外部格式的字段名。

## 为什么需要它

| 现有格式缺的东西 | AXP 的做法 |
|---|---|
| 没有 UI | `ui{}` 是一等组件：声明式面板、小组件、WebView、原生 Activity、界面注入 |
| 不能热加载 | `hotReload{}` 字段族：组件级替换、每次加载验签、状态迁移、回滚、UI 重建 |
| 权限是事后补丁 | `L0–L5` 权限阶梯 + `gradient` 同一工具多权限实现自动降级 |
| Android 能力靠外部工具硬凑 | 13 个 `axp://` 标准域、`abis`、`minAndroid`、APK v3 签名原生字段 |
| 声明与实现绑死 | **声明层统一 / 实现层开放**：清单唯一，实现体可任意语言任意文件格式 |

## 快速开始

```bash
git clone https://github.com/OWNER/axp.git && cd axp
node cli/bin/axp.mjs validate examples/01-hello        # 校验示例插件
node cli/bin/axp.mjs pack examples/01-hello -o hello.axp
```

写第一个插件 → [`docs/plugin-tutorial.md`](docs/plugin-tutorial.md)
把 AXP 接进你的 Android 宿主 → [`docs/integration-guide.md`](docs/integration-guide.md)
让插件热更新不重启 → [`docs/hot-reload-tutorial.md`](docs/hot-reload-tutorial.md)

## 文档索引

### 规范（`spec/`）

| 文件 | 内容 |
|---|---|
| [`01-format.md`](spec/01-format.md) | **主规范**：格式定位、包结构、清单 schema、全部组件、装载与校验规则 |
| [`02-manifest.schema.json`](spec/02-manifest.schema.json) | `axp.json` 的完整 JSON Schema（draft 2020-12） |
| [`03-impl-reference.md`](spec/03-impl-reference.md) | 统一实现引用 `impl` 的 7 种形态与宿主选择算法 |
| [`04-capabilities.md`](spec/04-capabilities.md) | L0–L5 权限阶梯、`requests` 完整词汇表、`gradient` |
| [`05-domains.md`](spec/05-domains.md) | 13 个 `axp://` 标准域定义与自定义域注册 |
| [`06-ui-vocab.md`](spec/06-ui-vocab.md) | UI DSL 节点词汇表、数据绑定、动作绑定、生命周期契约 |
| [`07-expression-map.md`](spec/07-expression-map.md) | 表达能力覆盖的逐字段映射与验收方法（外部材料，不属于规范正文） |
| [`08-hot-reload.md`](spec/08-hot-reload.md) | 热加载专章：状态机、Android 类加载器隔离、验签、回滚 |
| [`09-versioning.md`](spec/09-versioning.md) | 版本语义、兼容策略、schema 演进与弃用、文档版本与格式版本分离 |
| [`10-infrastructure.md`](spec/10-infrastructure.md) | **基础设施规范**：零依赖工具链、校验一致性、CI 门禁、构建产物、standalone 部署、发布 |
| [`11-conformance.md`](spec/11-conformance.md) | **一致性认证**：AXP-0…3 可验证断言、`axp-conformance.json` 结果格式、第三方认证流程 |
| [`12-security.md`](spec/12-security.md) | **安全规范与威胁模型**：信任边界、S1–S12、签名与密钥、审计最小事件集 |
| [`13-registry.md`](spec/13-registry.md) | **索引与分发**（M6）：`axp-index/1.0`、三种通道、版本单调、session-install 状态机 |
| [`index.json`](spec/index.json) | 文档清单、版本、统计、错误码、断言 ID 的机器可读单一事实源 |

### 教程与指南（`docs/`）

| 文件 | 内容 |
|---|---|
| [`integration-guide.md`](docs/integration-guide.md) | **宿主集成教程**：Gradle、Manifest、HostBridge、装载流水线、热加载接入、CI |
| [`plugin-tutorial.md`](docs/plugin-tutorial.md) | 5 分钟写第一个插件 |
| [`ui-tutorial.md`](docs/ui-tutorial.md) | 带界面与数据绑定的插件 |
| [`hot-reload-tutorial.md`](docs/hot-reload-tutorial.md) | 不重启宿主替换 UI / 工具 / 知识 |
| [`cli-reference.md`](docs/cli-reference.md) | `axp new / validate / pack / inspect / install` |
| [`host-checklist.md`](docs/host-checklist.md) | 宿主合规自检表（MUST / SHOULD） |
| [`doc-templates.md`](docs/doc-templates.md) | 集成教程、插件 README、spec 变更提案的**文档格式模板** |
| [`faq.md`](docs/faq.md) | 定位、边界、常见误解 |
| [`runtime-guide.md`](docs/runtime-guide.md) | 用可运行参考宿主理解规范语义，再搬到 Android |
| [`domains-tutorial.md`](docs/domains-tutorial.md) | M3 教程：13 个 `axp://` 标准域、URI 模板、`anchor`、`watchable`、事件与多域绑定 |
| [`github-setup.md`](docs/github-setup.md) | 把本目录变成 GitHub 仓库：初始化、`OWNER` 替换、CI、tag 与 Release |
| [`deployment.md`](docs/deployment.md) | 文档站点部署：standalone / 容器 / 环境变量 / 部署后检查清单 |
| [`release.md`](docs/release.md) | 版本对齐、打包、`SHA256SUMS`、tag 与 GitHub Release |
| [`reference-host/README.md`](reference-host/README.md) | 参考宿主实现索引：`runtime/`（可运行）与 `android/`（未编译验证骨架） |

### 工具与示例

```
validator/         离线校验器（schema + 安全规则 + 引用完整性）
validator/test/    31 条行为用例 + Python jsonschema 独立交叉复核（43 项）
cli/               axp 命令行：new / validate / pack / inspect / install
runtime/           ★ 可运行参考宿主（Node，AXP-3）：9 步装载 / gradient / Surface / UI / 热加载
sdk/sdk-js/        TypeScript 类型定义
reference-host/    Android/Kotlin 真机骨架（源码，未编译验证）
conformance/       第三方宿主一致性认证模板与用例骨架（断言见 spec/11）
spec/index.json    规范文档 / 版本 / 统计 / 错误码 / 断言 ID 单一事实源
examples/          01-hello、02-ui-panel、03-hot-reload、04-domains（M3 标准域）
.github/           CI、Release、Dependabot、PR / Issue 模板
```

## 仓库自检

```bash
node validator/src/validate.mjs examples/01-hello
node validator/src/validate.mjs examples/02-ui-panel
node validator/src/validate.mjs examples/03-hot-reload
node validator/src/validate.mjs examples/04-domains

node validator/test/run-tests.mjs            # 31 条行为用例
python3 validator/test/schema-crosscheck.py  # 43 项独立引擎复核（需 pip install jsonschema）
node runtime/test/smoke.mjs                 # 30 条端到端断言
node ../scripts/spec-check.mjs             # 规范一致性（在仓库根运行亦可：node scripts/spec-check.mjs）
node ../scripts/site-check.mjs --prebuild # 构建前数据完整性
```

四个示例必须全绿；CI 对每次 PR 执行上述全部检查，外加 `spec-check` 一致性门禁、站点 Lint / 构建 / standalone 产物自检，以及**全仓** Markdown 链接审计（五个 job）。规范数字以 `spec/index.json` 为准。

## 参考实现状态

| 层次 | 状态 |
|---|---|
| 格式规范 / schema / 校验器 / CLI / 文档 / 示例 | ✅ 完成 |
| **Node 参考运行时**（M2 语义验证，声明 AXP-3） | ✅ 可运行，30 条端到端断言全绿 |
| **M3 感知域**（规范 / 示例 / 教程） | ✅ `spec/05` + `examples/04-domains` + `docs/domains-tutorial.md`；真机域适配器待补 |
| Android/Kotlin 真机骨架（类加载器隔离、验签、Compose 绑定） | ⚠️ 源码骨架，需在 Android Studio 中编译；见 [`reference-host/README.md`](reference-host/README.md) |
| **基础设施规范 / 认证 / 安全 / 索引**（`spec/10`–`13` + `index.json`） | ✅ 规范就位；`spec-check.mjs` 断言自洽 |
| 一致性套件用例（`conformance/cases/`） | 🟡 模板与断言 ID 就位，用例待生态补齐 |
| 真实 APK v3 证书链、无障碍服务、Shizuku 授权 | ⬜ 宿主侧实现，接口已留（分发语义见 `spec/13`） |

## 路线图

M1 格式定稿 ✅ → M2 最小宿主 ✅（Node 参考运行时）/ ⚠️（Android 骨架）→ **M2.5 热加载 ✅** → M3 感知域 🟡（规范 / 示例 / 教程就位，真机域适配器待补）→ M4 提权与梯度 🟡（`gradient` 已实现，Shizuku 通道待接）→ M5 全组件 ✅ → M6 分发与签名信任链 → M7 生态。
详见 [`spec/01-format.md`](spec/01-format.md) §12；运行时用法见 [`docs/runtime-guide.md`](docs/runtime-guide.md)；全项目任务总账见仓库根 [`../ROADMAP-ALL-TASKS.md`](../ROADMAP-ALL-TASKS.md)。

## 贡献与许可

见 [`CONTRIBUTING.md`](CONTRIBUTING.md) · [MIT](LICENSE) · 安全披露 [`../SECURITY.md`](../SECURITY.md)

> 本仓库内容由 AI 辅助生成，仅作为规范草案与工程起点；落地实现前请按 `docs/host-checklist.md` 逐项验证。
