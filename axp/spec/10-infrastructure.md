# 10 · 基础设施规范

> 状态：Stable
> 适用：AXP v1.x 规范项目（工具链 / CI / 文档站点 / 发布物）
> 最后更新：2026-11-15
> 规范性地位：本文件规定**规范项目自身**的基础设施，不规定 `.axp` 包的结构。包结构由 [`01-format.md`](01-format.md) 定义，二者互不覆盖。

## 1. 边界与目的

AXP 是格式规范，但一份可被实施、可被验证、可被分发的规范必须自带基础设施。本章把「规范之外的工程约定」也写成规范性条款，目的是让任何 fork / 镜像 / 重新打包都能得到**同一套可验证结果**。

| 属于本章 | 不属于本章 |
|---|---|
| 校验器 / CLI / 参考运行时的构建与测试门槛 | `.axp` 包的字段语义（→ `01`） |
| CI 门禁、构建产物、发布物 | 插件实现体的执行方式（→ `03`） |
| 文档站点的构建与自包含部署 | 宿主如何调度组件（→ `01` §8） |
| 版本对齐、索引、校验和 | 权限与签名语义（→ `04` / `12` / `13`） |

## 2. 单一事实源

`spec/index.json` 是本规范项目的**机器可读索引**，包含：

- `formatVersion`：格式版本（对应 `axp` 字段，本版 `1.0`）
- `specVersion`：规范文档版本（本版 `1.1.0`，编辑性修订不改 `formatVersion`）
- `documents[]`：全部规范章节的路径、标题、状态、规范性地位
- `counts`：站点与文档展示用的统计常量
- `artifacts`：发布物清单

所有展示统计（站点 `loadSiteData()`、`data.ts` 的自检数字、README 徽章）`MUST` 由 `index.json` 派生或由 `scripts/spec-check.mjs` 断言与之一致；`MUST NOT` 出现第三份互相独立维护的数字。

## 3. 工具链规范

| 组件 | 运行环境 | 约束 |
|---|---|---|
| `validator/` | Node 20+ | **零 npm 依赖**；只用 Node 内置模块 |
| `cli/` | Node 20+ | 零 npm 依赖；`pack` 产物为 zip |
| `runtime/` | Node 20+ | 零 npm 依赖；参考宿主，不依赖 validator 的内部实现细节 |
| `validator/test/schema-crosscheck.py` | Python 3 + `jsonschema` 4.26（draft 2020-12） | 独立引擎交叉复核，唯一允许的外部依赖 |
| `reference-host/android/` | Android SDK / Gradle / Kotlin | 源码骨架，`MUST` 标注「未编译验证」状态 |
| 文档站点 | Node 20+ / Bun | 依赖由根目录 `package.json` + lockfile 锁定 |

**零依赖原则**：`validator/` / `cli/` / `runtime/` 引入任何 npm 包都 `MUST` 视为破坏性变更，需要规范变更提案。理由：校验器是安全边界，供应链面必须可人工审计。

## 4. 校验一致性规范

1. `02-manifest.schema.json` `MUST` 是 draft 2020-12 合法 schema，且 `MUST` 被至少一个独立引擎（Python `jsonschema`）复核。
2. 校验器的精简 schema 引擎与标准引擎在 `const` / `additionalProperties` / `anyOf` / `minItems` / `if-then` / `patternProperties` / `enum` / `type` 等分支上 `MUST` 结论一致；差异由 `schema-crosscheck.py` 断言。
3. 每个业务错误码 `MUST` 至少有一条行为用例覆盖，且 `MUST` 出现在 `validator/README.md` 的错误码表中；由 `spec-check.mjs` 断言。
4. 四个官方示例 `MUST` 全部通过 `axp validate`；`validator/test/run-tests.mjs`、`runtime/test/smoke.mjs` `MUST` 全绿。
5. 自检数字 `MUST` 与 `index.json.counts` 一致，`MUST NOT` 在 README / 站点 / CI 中各自硬编码不同值。

## 5. CI 门禁规范

`.github/workflows/ci.yml` 对 `main` 的每次 push / PR `MUST` 执行以下 job，任一失败即阻断合并：

| job | 必须断言 |
|---|---|
| `axp-selfcheck` | schema 可解析 · 4 示例全绿 · 行为用例 · 独立引擎复核 · 运行时断言 · `axp pack` 烟雾 |
| `spec-consistency` | `node scripts/spec-check.mjs` · `node scripts/site-check.mjs --prebuild` |
| `web-lint` | `bun install --frozen-lockfile` · `bun run lint` |
| `web-build` | `bun run build` · `node scripts/site-check.mjs`（standalone 自包含） |
| `docs-links` | **全仓** Markdown 本地链接零断链（含根目录文档，排除 `node_modules` / `.next`） |

CI `MUST NOT` 使用 `|| true`、`continue-on-error: true` 或等价方式掩盖上述断言失败。

> 允许 `typescript.ignoreBuildErrors: true` 作为过渡，但 `MUST` 在 `index.json` 标记 `buildGateStatus` 并在 [`../ROADMAP-ALL-TASKS.md`](../../ROADMAP-ALL-TASKS.md) 登记为待办；一旦完成一次真实 `next build` 且类型错误清零，`SHOULD` 置为 `false`。

## 6. 构建产物规范

| 产物 | 生成命令 | 内容 | 校验 |
|---|---|---|---|
| `.axp` 分发包 | `axp pack <dir> -o <file>` | zip，含 `axp.json`；发布前 `apksigner sign --v3` | `unzip -l` 含 `axp.json` |
| spec 发布包 | release workflow | `spec/` 全量 + `index.json` + `CHANGELOG.md` | `sha256sum` |
| 站点 standalone | `bun run build` | `server.js` + `.next/static` + `public` + **`axp/`** | `scripts/site-check.mjs` |
| 校验和清单 | release workflow | 每个产物一行 `SHA256  filename` | `sha256sum -c` |

**standalone 自包含条款（关键）**：站点运行时以 `path.join(process.cwd(), "axp")` 读取规范项目；Next.js 的 output file tracing 无法静态追踪该拼接路径。因此 `MUST` 同时满足：

1. `next.config.ts` 配置 `outputFileTracingIncludes` 覆盖 `./axp/**/*`
2. `build` 脚本 `MUST` 执行 `cp -r axp .next/standalone/`
3. `scripts/site-check.mjs` `MUST` 断言产物内 `axp/spec/`、`axp/validator/src/validate.mjs`、4 个示例 `axp.json` 均存在

只做其中一条视为不合规——双保险是为了同时覆盖「tracing 行为随 Next 版本变化」与「部署脚本只搬 standalone 目录」两种失效路径。

## 7. 部署规范

1. 部署根 `MUST` 是 `.next/standalone/`，工作目录 `MUST` 设为该目录，使 `process.cwd()/axp` 解析到随产物分发的数据。
2. `MUST NOT` 假设部署环境能访问源仓库或 `https://fonts.googleapis.com`；字体应自托管（见任务 D19）。
3. 环境变量 `MUST` 有 `.env.example` 说明；`MUST NOT` 在镜像内写入任何密钥。
4. 容器化部署 `MUST` 提供 `Dockerfile` / `.dockerignore`，且 `HEALTHCHECK` 或等价探针 `MUST` 命中 `/api/doc?path=spec/index.json`（同时验证服务端数据层可用）。
5. 部署教程见 [`../docs/deployment.md`](../docs/deployment.md)。

## 8. 发布规范

1. tag `MUST` 形如 `spec-v<specVersion>`（如 `spec-v1.1.0`），`MUST` 与 `index.json.specVersion` 一致。
2. 每个 tag `MUST` 附：`axp-spec-<specVersion>.zip`、`SHA256SUMS`、`CHANGELOG.md` 差异摘要、对应版本的校验器源码。
3. `MUST NOT` 在未更新 `index.json.counts` 的情况下发版；`spec-check.mjs` 在 release workflow 中 `MUST` 先于打包执行。
4. 流程细节见 [`../docs/release.md`](../docs/release.md)，信任链与索引格式见 [`13-registry.md`](13-registry.md)。

## 9. 版本对齐表

| 版本 | 位置 | 本版值 | 变更条件 |
|---|---|---|---|
| 格式版本 | `axp.json` 的 `axp` / `index.json.formatVersion` | `1.0` | 清单结构不兼容（→ 主版本） |
| 规范文档版本 | `index.json.specVersion` / git tag | `1.1.0` | 新增章节、编辑性修订、勘误 |
| 工具链版本 | `axp/cli/package.json` / `validator/package.json` | 随实现 | 校验器行为变化 |
| 站点仓库版本 | 根 `package.json` | `1.1.0` | 站点 / CI / 文档变化 |
| 插件版本 | 各插件 `axp.json` 的 `version` | 各自 | 插件内容变化 |

三者互不自动同步：`specVersion` 提升 `MUST NOT` 隐式改变 `formatVersion`。版本语义细节见 [`09-versioning.md`](09-versioning.md)。

## 10. 合规命令

```bash
node scripts/spec-check.mjs                 # 规范一致性（零依赖）
node scripts/site-check.mjs --prebuild     # 构建前数据完整性
node axp/validator/test/run-tests.mjs      # 行为用例
python3 axp/validator/test/schema-crosscheck.py
node axp/runtime/test/smoke.mjs
bun run build && node scripts/site-check.mjs   # 构建 + standalone 自包含
```

## 11. 与其他章节的关系

- 一致性等级的可验证定义 → [`11-conformance.md`](11-conformance.md)
- 威胁模型与安全 MUST → [`12-security.md`](12-security.md)
- 索引格式与 session-install → [`13-registry.md`](13-registry.md)
- 宿主合规自检表 → [`../docs/host-checklist.md`](../docs/host-checklist.md)
