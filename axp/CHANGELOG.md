# Changelog

本文件记录规范与工具链的变更。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [1.1.0] - 2026-11-15

> **规范语义不变**：`axp` 格式版本仍为 `1.0.0`（清单字段 `axp: "1.0"`），本次为文档版本提升——新增章节、编辑性勘误与基础设施规范落地，已有插件无需修改 `axp.json`。

### Added · 基础设施规范（spec/10–13 + index.json）
- `spec/10-infrastructure.md`：零依赖工具链、双引擎校验一致性、五个 CI job 门禁、构建产物、standalone 自包含条款（tracing + cp 双保险）、部署与发布规范、四种版本对齐
- `spec/11-conformance.md`：把 AXP-0…3 拆成 26 条可验证断言（C-0-* … C-3-*）、`axp-conformance/1.0` 结果格式、第三方认证流程
- `spec/12-security.md`：信任边界、S1–S12 威胁与缓解（映射到校验器错误码）、签名与密钥 pin、审计最小事件集、漏洞披露
- `spec/13-registry.md`：`axp-index/1.0` 索引格式、三种通道信任语义、版本单调/同密钥/freshness、session-install 状态机、SHA256SUMS
- `spec/index.json`：文档清单、`formatVersion` / `specVersion`、统计常量、40 个错误码、26 个断言 ID 的机器可读单一事实源
- `axp/conformance/`：结果模板与用例骨架说明

### Added · 基础设施实体
- `scripts/spec-check.mjs`：零依赖一致性自检（文档索引双向闭合、版本对齐、章节编号连续、错误码闭合、URI 回归、断言闭合、CI 门禁、全仓链接）
- `.github/workflows/release.yml`（tag `spec-v*` 自动打包 + SHA256SUMS + Release）、`.github/dependabot.yml`
- `Dockerfile` / `.dockerignore` / `.env.example`（standalone 容器镜像，构建期断言 `axp/spec/index.json` 存在，HEALTHCHECK 命中 `/api/doc`）
- `SECURITY.md`、`axp/docs/deployment.md`、`axp/docs/release.md`
- CI 新增 `spec-consistency` job；`docs-links` 扩到全仓 Markdown

### Fixed · 主规范优化（编辑性，格式语义不变）
- `spec/01-format.md` 补 §8.2「校验器与规范的一致性」，修复 §8 子章节编号从 8.1 跳到 8.3
- 新增 §0.4「文档体系与规范性引用」，明确 `10`–`13` 规定的是规范项目与宿主生态，**不是** `.axp` 清单字段
- §3.1 字段表措辞：五个数组组件 + `ui{}` 第六类
- §9 / §11 分别挂接 `13` 分发规范与 `11` 一致性认证；§12 进度更新到 1.1.0；附录 A 增补勘误行
- `spec/09-versioning.md` 修正兼容规则自相矛盾：严格 schema 下「新增可选字段 / 新增枚举值」**不是**向后兼容（旧宿主 MUST 拒绝并提示升级）；新增 §7 文档版本与格式版本分离
- `spec/05-domains.md` 新增 §6 域归一化勘误
- **URI 统一**：主规范示例、`06-ui-vocab.md`、`03-hot-reload` 示例、`runtime/` 冒烟、文档站点 `data.ts` 中的非标准 `axp://vision/screen` 全部改为标准域 `axp://screen`；`spec-check.mjs` 断言该遗留写法不再出现

### Changed · 站点
- `src/lib/axp-server.ts` 的统计数字改为从 `spec/index.json` 派生，文档库新增 4 篇规范章节、索引、部署/发布教程与一致性套件说明
- `scripts/site-check.mjs` 的产物文档清单改为动态扫描 `axp/spec/`
- `data.ts` 的 M2 路线图状态改为 partial（Node ✅ / Android 骨架 ⚠️），与 README 口径统一；工具链新增 `conformance/` 与 `index.json` 条目

### Verified
- 4 个示例 `axp validate` 全绿；`run-tests.mjs` 31/31；`schema-crosscheck.py` 43/43；`smoke.mjs` 30/30
- `spec-check.mjs` 全绿；`site-check.mjs --prebuild` 全绿；全仓 Markdown 本地链接零断链

### 未验证
- 仍**未执行一次真实 `next build`**（本环境无 Bun / 完整前端依赖）；`web-build` job 首次运行结果需在有 Bun 的环境观测（任务 E03）。`index.json.buildGateStatus` 已如实标记。

## [1.0.4] - 2026-11-15

> 仓库级工程化修复与完成度审计；**规范语义不变**，`axp` 格式版本仍为 `1.0.0`。
> 本条记录的是外层 Next.js 文档站点与 CI 的变化，`axp/` 内规范 / schema / 校验器 / CLI / 运行时 / 示例均未改动。

### Fixed
- standalone 自包含部署缺陷：站点运行时以 `path.join(process.cwd(), "axp")` 读取规范项目，Next.js output file tracing 无法追踪该拼接路径；现通过 `next.config.ts` 的 `outputFileTracingIncludes` 与 `build` 脚本 `cp -r axp .next/standalone/` 双保险解决，避免容器化部署后文档库与校验器演练场失效
- `readDocContent` 路径前缀校验改用 `path.sep` 判断，避免同前缀目录绕过（纵深防御）

### Added
- CI `web-build` job：`bun run build` + `node scripts/site-check.mjs`，首次把站点可构建性纳入质量门禁
- `scripts/site-check.mjs`：零依赖产物自检（`--prebuild` 数据完整性 / 默认 standalone 自包含性）
- 顶层 `LICENSE`（MIT）、`AUDIT.md`（完成度审计）、`ROADMAP-ALL-TASKS.md`（一次性全部任务）、`PATCHES.md`（改动与回滚）

### 未验证
- 本环境不具备 Bun 与完整前端依赖安装条件，**未执行一次真实 `next build`**；`web-build` job 的首次运行结果需在有 Bun 的环境观测。

### Verified
- 4 个示例 `axp validate` 全绿；`run-tests.mjs` 31/31；`schema-crosscheck.py` 43/43；`smoke.mjs` 30/30
- 全仓 Markdown 本地链接零断链；`axp/` 与 v1.0.2 基准逐文件比对，仅 CHANGELOG 与 `runtime/src/surfaces.mjs`（v1.0.3 修复）两处差异

## [1.0.3] - 2026-11-14

> 参考运行时时序修复；**规范语义不变**，`axp` 格式版本仍为 `1.0.0`。

### Fixed
- `runtime/src/surfaces.mjs`：`prime()` 发出的初始 `full` 快照现在会在该 Surface 上**重置背压计时**（`lastAt = 0`）。此前装载期间的初始快照会占用一次推送窗口，导致装载后 `1000/maxHz` 内的第一个真实 `delta` 被误判为高频推送而吞掉（`smoke.mjs` 的 `surface delivered to subscribers` 断言在快速机器上间歇性失败）。修复后 `smoke.mjs` **30/30 稳定全绿**。

### Verified
- 4 个示例 `axp validate` 全绿；`run-tests.mjs` 31/31；`schema-crosscheck.py` 43/43；`smoke.mjs` 30/30（连续三次）；`axp pack` 正常产出。

## [1.0.2] - 2026-11-14

> M3 感知域示例与教程、回归加固；**规范语义不变**，`axp` 格式版本仍为 `1.0.0`。

### Added
- `examples/04-domains/`：M3 感知域示例插件，覆盖 8 个 `axp://` 标准域、URI 模板（`{}` 占位）、`views` / `anchor` / `watchable`、5 条多域 `ui.bind`、`events` 两类触发源、`gradient` 双路径、L1/L2/L3 分层权限与 `dangerous` 单独确认
- `docs/domains-tutorial.md`：选域 → 声明 Surface → 绑定 → 事件 → 权限分层 → 校验的六步教程
- `validator/test/run-tests.mjs` 增加 `ID_INVALID` / `ABI_MISSING` 用例与 `04-domains` 正面校验（31 条）

### Changed
- 参考实现统一为单一入口：可运行 `runtime/` + 未编译验证 `reference-host/android/`；交叉复核统一到 `validator/test/schema-crosscheck.py`，避免两套宿主 / 两套复核并存造成歧义
- `schema-crosscheck.py` 的示例遍历自动覆盖第 4 个示例（43 项）
- README、运行时指南、开仓库指南、合规自检表的自检数字与示例清单同步到 **31 / 43 / 30**
- `spec/01-format.md` §12 与附录 B 补实现状态与 M3 示例索引；`reference-host/README.md` 补 M3–M6 状态表

### Verified
- 4 个示例 `axp validate` 全绿
- `run-tests.mjs` **31/31**、`schema-crosscheck.py` **43/43**（Python `jsonschema` draft 2020-12）、`smoke.mjs` **30/30**
- 标准引擎对 schema 的 `const` / `additionalProperties` / `anyOf` / `minItems` / `if-then` / `patternProperties` / `enum` / `type` 八类分支独立复核，13 个 case 两引擎结论零差异
- 全仓 Markdown 本地链接零断链

## [1.0.1] - 2026-11-14

> 工具链增强与整合，**规范语义不变**，`axp` 格式版本仍为 `1.0.0`。

### Added
- `runtime/`：可运行的 Node 参考宿主（声明等级 AXP-3），实现 §8 九步装载、`gradient` 权限梯度与多实现路径降级、Surface 订阅/背压、`ui.bind`/`actions`/`lifecycle`、热加载状态机与回滚、dev/strict 签名策略、结构化审计日志
- `runtime/test/smoke.mjs`：30 条端到端断言，覆盖装载、调用、绑定、热替换、越权拒绝、回滚、严格签名
- `validator/test/run-tests.mjs`：30 条正负面用例，固化全部错误码行为
- `validator/test/schema-crosscheck.py`：**41 项**独立复核（Python `jsonschema` draft 2020-12）
  - 校验 schema 自身的元语法合法性与 `$schema` 声明
  - **区分 schema 层与业务层**：只比对 `SCHEMA_*` 结论，避免「碰巧整体拒绝」造成假通过
  - 17 个反例覆盖 `if/then + const`、`patternProperties + additionalProperties:false`、`anyOf`、`enum/const`
  - `hotReload.enabled=false` 时 `if/then` 不误触发的正例；7 类「标准 schema 放行 / Node 精确拒绝业务码」边界用例
  - `subprocess.run` 加 30 秒超时，避免 CI 挂死
- `validator/test/README.md`：两套测试的分工、覆盖关键字、手写引擎的已知边界
- `reference-host/android/`：Kotlin/Gradle 真机骨架（`HostBridge`、`InMemoryDexClassLoader` 隔离、Compose 绑定示意、热加载状态机、单元测试）
- `reference-host/README.md`：重写为「可运行 `runtime/` + 未编译验证 `android/`」的总入口，移除重复的 Android 骨架副本
- `docs/runtime-guide.md`：把参考运行时语义搬到 Android 的对照指南
- `docs/github-setup.md`：开仓库操作指南（初始化、`OWNER` 替换、CI、tag 与 Release）
- CI 拆为三个 job：`validate`（示例 + CLI 烟雾测试）、`cross-check`（行为固化 + 标准 schema 复核 + 端到端冒烟）、`docs`（全仓 Markdown 链接 + 参考实现文件清单）

### Changed
- `examples/03-hot-reload` 的 L3 `gradient` 分支增加 `js` 实现路径，演示 `spec/03` §2 的多实现路径降级
- README 补充参考实现状态表、一键自检命令与四套自检数字
- CI 的链接检查从「仅 README」升级为「全仓所有 `.md`」
- `.gitignore` 增加 `.tmp/`（交叉复核的临时 fixture 目录）

### Fixed
- 精简 schema 引擎：`properties` 命中的键现在会**同时**应用 `patternProperties`，并把 `additionalProperties` 限定为「两者都未匹配」的键，与 draft 2020-12 语义一致
- 修正参考运行时的权限上限计算：宿主取 **max(已授权层)** 再与 `capabilities.privilege` 取 min（原写法误取 min 导致永远 L0）
- 修正热加载变更检测：返回组件前缀而非文件路径，`targets` 匹配不再误判 `HOT_TARGET_MISMATCH`

### 未变
- `spec/01-format.md` 的字段与语义、[`spec/02-manifest.schema.json`](spec/02-manifest.schema.json) 的结构

## [1.0.0] - 2026-11-14

### Added
- AXP v1.0 主规范：包结构、`axp.json` 清单、六类组件（tools / surfaces / knowledge / agents / events / ui）
- **同级独立格式**定位声明，表达能力覆盖证明移入 `spec/07-expression-map.md`
- 统一实现引用 `impl` 的 7 种形态；外部进程统一用 `proc` 声明，规范正文不内嵌任何外部格式名
- Android 原生能力：L0–L5 权限阶梯、`gradient` 权限梯度、13 个 `axp://` 标准域、APK v3 签名
- **UI 一等组件**：`ui.panel / widget / web / activity / inject` + `lifecycle / bind / actions` + `06-ui-vocab.md`
- **热加载 `hotReload{}`**：组件级替换、`on-every-load` 验签、状态迁移、回滚、UI 重建、隔离类加载器；`08-hot-reload.md` 专章
- `runtime.allowDynamicCode` 边界澄清：禁止「网络未签名代码」，允许「可信源已签名实现体替换」
- 分发通道改为 Android 原生：会话安装 / 签名信任链
- 完整 JSON Schema、离线校验器、`axp` CLI、3 个示例、CI、集成教程与文档模板
- 路线图新增 M2.5 热加载里程碑

### Changed
- 早期草案中 `impl.mcp` → 通用 `impl.proc`
- 早期草案中表达力总表从规范正文移出至 `07-expression-map.md`
- 早期草案中 `distribution.channels` 的通用仓库/包管理器措辞 → `distribution.channel` Android 会话安装

### Removed
- 早期草案中的握手 / 方法表 / transport 章节（属于宿主实现细节，不属于格式）
