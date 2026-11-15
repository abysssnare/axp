# AXP — Agent eXtension Package

> 一种**与 MCP / LSP / Agent Skills / Claude Plugins / OpenCode Plugins / DSH 规范地位平级**的、**Android 专属**的独立插件描述格式，
> 外加一个把整套规范、示例与真实校验器搬到浏览器里的 **Next.js 交互式文档站点**。

![Spec](https://img.shields.io/badge/spec-v1.0.0-10b981)
![Platform](https://img.shields.io/badge/Android-API%2026%2B-3ddc84)
![Site](https://img.shields.io/badge/site-Next.js%2016-222222)
![License](https://img.shields.io/badge/license-MIT-lightgrey)
![Docs](https://img.shields.io/badge/docs-v1.1.1-10b981)
![Checks](https://img.shields.io/badge/self--check-31%2B43%2B30%2B4-brightgreen)

---

## 这个仓库是什么

本仓库包含**两部分**，一体交付：

| 目录 | 内容 |
|---|---|
| **`axp/`** | AXP 规范项目本体：13 篇规范章节 + `spec/index.json` 机器索引、JSON Schema、零依赖校验器、CLI、可运行参考宿主（Node，AXP-3）、Android/Kotlin 真机骨架、TS SDK、4 个官方示例、13 篇教程与指南、一致性套件模板 |
| **`src/` 等** | 一个 Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui 的**交互式文档站点**，在线渲染全部规范与教程，并提供**真实校验器演练场** |

一句话定位：**AXP 定义「一个插件长什么样」**——一个 `.axp` 包、一份 `axp.json` 清单、六类组件、一套 Android 原生权限模型，外加 **UI** 与 **热加载** 两个一等能力。

它**不是协议、不是桥、不是适配层、不是元格式**。AXP 不接入任何外部插件运行时，不导入/转译/代理它们的插件，也不把自己导出成它们的格式；它与那些格式是**同级规范**，各自定义自己的清单与组件语义，互不依附。「能表达」不等于「能装载」：AXP 宿主只装载 `.axp` 包。

## 为什么需要它

| 现有格式缺的东西 | AXP 的做法 |
|---|---|
| 没有 UI | `ui{}` 是一等组件：声明式面板、小组件、WebView、原生 Activity、界面注入 |
| 不能热加载 | `hotReload{}` 字段族：组件级替换、每次加载验签、状态迁移、回滚、UI 重建 |
| 权限是事后补丁 | `L0–L5` 权限阶梯 + `gradient` 同一工具多权限实现自动降级 |
| Android 能力靠外部工具硬凑 | 13 个 `axp://` 标准域、`abis`、`minAndroid`、APK v3 签名原生字段 |
| 声明与实现绑死 | **声明层统一 / 实现层开放**：清单唯一，实现体可任意语言任意文件格式 |

五条设计原则：**声明层统一**（`axp.json` 唯一事实源，未声明的文件一律不执行）、**实现层开放**（`.js` / `.dex` / `.so` / `.wasm` / `.md` / `.yaml` / `.html` / 独立二进制 / 外部进程）、**同级独立**（不借用外部格式字段名）、**Android 一等公民**、**实现体可替换**（热加载基础）。

---

## 快速开始

### 1）文档站点（本仓库根）

```bash
# 需要 Bun（或改用 npm/pnpm 安装依赖均可）
bun install
bun run dev          # http://localhost:3000

# 规范一致性（零依赖，任何环境可跑）
node scripts/spec-check.mjs

# 发布前：验证站点可构建、standalone 产物自带 axp/ 数据
bun run build
node scripts/site-check.mjs
```

站点只有一个用户可见路由 `/`，包含：

- **规范全览**：规范地位 / 为什么 / 包结构 / 清单 / `impl` 七形态 / 六类组件
- **Android 原生能力**：L0–L5 权限阶梯、`gradient` 交互式降级演示、13 个 `axp://` 标准域、UI DSL、热加载状态机
- **宿主与生态**：九步装载流水线、AXP-0…3 一致性等级、M1–M7 路线图
- **示例插件**：4 个官方示例的真实 `axp.json` 与包文件树，一键「验证」按钮在服务端调用**真实校验器 CLI**
- **校验器演练场**：粘贴任意 `axp.json`，服务端写入临时包目录后运行 `validator/src/validate.mjs --json`；内置 8 个「破坏性预设」（gradient 超权、未知权限请求、热加载签名策略、dangerous 未声明、破坏性工具缺确认、UI 动作指向幽灵工具、未签名网络源、id 非反向域名），可定点观察每个错误码
- **文档库**：`spec/` 9 篇 + `docs/` 11 篇 + 参考实现文档，全文渲染、交叉链接互通、可搜索

### 2）规范工具链（`axp/`，零依赖，Node 20+）

```bash
# 校验示例插件（四个全绿）
node axp/cli/bin/axp.mjs validate axp/examples/01-hello

# 打包成 .axp（zip 分发态；发布前需 apksigner --v3 签名）
node axp/cli/bin/axp.mjs pack axp/examples/01-hello -o hello.axp

# 打印组件摘要
node axp/cli/bin/axp.mjs inspect axp/examples/03-hot-reload
```

### 3）仓库自检（push 前建议全绿）

```bash
cd axp

# 四个示例清单校验
for d in examples/*/; do node validator/src/validate.mjs "$d"; done

# 31 条行为用例
node validator/test/run-tests.mjs

# 43 项独立引擎交叉复核（Python jsonschema, draft 2020-12）
python3 validator/test/schema-crosscheck.py

# 30 条参考运行时端到端断言
node runtime/test/smoke.mjs

# 规范一致性 + 构建前数据完整性（零依赖）
node ../scripts/spec-check.mjs
node ../scripts/site-check.mjs --prebuild
```

四套自检数字：**4/4 示例全绿 · 31/31 行为用例 · 43/43 交叉复核 · 30/30 端到端断言**；再加一条 `node scripts/spec-check.mjs`（规范 / schema / 错误码 / 数字 / 断言 ID / 全仓链接自洽，212 项）。CI（`.github/workflows/ci.yml`）对每次 push / PR 执行 `axp-selfcheck` / `spec-consistency` / `web-lint` / `web-build` / `docs-links` 五个 job；链接审计已扩到**全仓** Markdown。构建门禁已随 GitHub Actions `web-build` job（`bun run build` + 产物自检）首次验证通过（E03）；v1.1.1 起 `ignoreBuildErrors: false`、ESLint 质量门禁恢复、字体自托管，类型与 lint 均零错误。

---

## 仓库结构

```
.
├── README.md                  ← 本文件
├── .github/workflows/ci.yml   ← CI：规范自检 + 站点 Lint + 站点构建 + 链接审计
├── LICENSE                    ← MIT（顶层，供 GitHub 识别）
├── SECURITY.md                ← 漏洞披露策略（对应 spec/12）
├── .env.example / Dockerfile / .dockerignore   ← 容器化部署（docs/deployment.md）
├── .github/workflows/release.yml / dependabot.yml  ← 发版与依赖更新
├── scripts/
│   ├── spec-check.mjs         ← 规范一致性自检（零依赖，单一事实源断言）
│   └── site-check.mjs         ← 产物自检（--prebuild / standalone）
├── AUDIT.md                   ← 仓库完成度审计报告（证据 / 评分 / P0–P2 问题）
├── ROADMAP-ALL-TASKS.md       ← 一次性全部任务总账（A–G 七组，含验收标准）
├── PATCHES.md                 ← 本轮改动清单与回滚方法
├── scripts/site-check.mjs     ← 零依赖产物自检（--prebuild / standalone）
├── package.json               ← Next.js 站点（Bun / TypeScript）
├── next.config.ts / tsconfig.json / eslint.config.mjs / tailwind.config.ts
├── src/
│   ├── app/
│   │   ├── page.tsx           ← 唯一用户路由：服务端加载 axp/ 真实数据
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── doc/route.ts   ← GET  /api/doc?path=…        白名单文档读取
│   │       └── validate/route.ts ← POST /api/validate        真实校验器调用
│   ├── components/
│   │   ├── axp/               ← 站点全部组件（章节 / 演练场 / 文档库…）
│   │   ├── ui/                ← shadcn/ui 组件集
│   │   └── theme-provider.tsx
│   ├── lib/
│   │   ├── axp-server.ts      ← 服务端数据层：读 axp/ 的示例、文档、文件树
│   │   ├── tree.ts            ← 纯函数文件树渲染（客户端安全）
│   │   └── utils.ts
│   └── types/                 ← react-syntax-highlighter 模块声明
├── public/
└── axp/                       ← ★ AXP 规范项目（可独立使用，见 axp/README.md）
    ├── README.md              ← 规范项目总览（含文档索引与自检）
    ├── CHANGELOG.md           ← v1.0.0 → v1.1.1 变更记录
    ├── CONTRIBUTING.md / LICENSE
    ├── spec/                  ← 13 篇规范章节（01–13）+ index.json 机器索引
    ├── docs/                  ← 13 篇教程与指南（集成 / 插件 / UI / 热加载 / 域 / 部署 / 发布…）
    ├── conformance/           ← 第三方宿主一致性认证模板与用例骨架
    ├── examples/              ← 01-hello · 02-ui-panel · 03-hot-reload · 04-domains
    ├── validator/             ← 零依赖校验器 + 31 条行为用例 + 43 项 Python 交叉复核
    ├── cli/                   ← axp new / validate / pack / inspect / install
    ├── runtime/               ← ★ 可运行参考宿主（Node，声明 AXP-3）
    ├── sdk/sdk-js/            ← TypeScript 类型定义
    ├── reference-host/        ← Android/Kotlin 真机骨架（源码，未编译验证）
    └── .github/               ← 规范项目独立开仓时的 CI / Issue 模板（本仓库根 CI 在 .github/）
```

> 说明：`axp/` 可以原样拆出作为独立仓库（见 `axp/docs/github-setup.md`）；本仓库把它与文档站点放在一处，站点直接读取其中的真实文件，保证「网站上看到的 = 仓库里的」。

## 规范速览

### 六类组件

| 组件 | 声明键 | 一句话 |
|---|---|---|
| 工具 | `tools[]` | 模型可调用的动作；JSON Schema 输入输出；`gradient` 权限梯度 |
| 数据面 | `surfaces[]` | 可读取/订阅的数据实体，`axp://` URI 寻址，`watchable` 增量流 |
| 知识 | `knowledge[]` | skill / prompt / command / rules；渐进披露；工具白名单 |
| 子代理 | `agents[]` | prompt + 工具白名单 + 轮数上限；`privilege` 权限上限硬约束 |
| 事件 | `events[]` | watchable 流 + filter，或 `lifecycle.*` 生命周期钩子 |
| 界面 | `ui{}` | panel / widget / web / activity / inject + `lifecycle / bind / actions` |

### 统一实现引用 `impl`（实现层开放）

同一组件可同时声明多种实现，宿主按 `native > kotlin > wasm > bin > js > proc > url` 选择：

```jsonc
"impl": { "native": "tools/ocr/libocr.so", "js": "tools/ocr-fallback.js" }
```

### L0–L5 权限阶梯与 gradient

| 层 | 通道 | 用户确认 |
|---|---|---|
| L0 | 沙箱（纯计算） | 不需要 |
| L1 | 标准权限（文件/网络/相机/通知） | 系统弹窗 |
| L2 | AccessibilityService | 必须单独确认 |
| L3 | Shizuku | 必须单独确认 |
| L4 | Root | 必须单独确认 |
| L5 | System / Hook | 仅预装 |

`tools[].gradient` 让同一工具在不同权限层声明不同实现，宿主自动选最高可用层并逐级回退——「无障碍方案 / shell 方案 / root 方案」从代码里的 if-else 变成格式声明。

### 13 个 `axp://` 标准域

`fs` · `screen` · `app` · `notification` · `intent` · `sensor` · `clipboard` · `telephony` · `logcat` · `pm` · `media` · `net` · `sysprop`；插件可注册自定义域（`axp://x/<自身 id>/…`）。完整表见 [`axp/spec/05-domains.md`](axp/spec/05-domains.md)。

### 热加载 `hotReload{}`

组件级替换、`on-every-load` 每次验签、状态迁移、保留 N 代回滚、UI 重建策略、隔离类加载器；`sources` 禁止 `network-unsigned`，热加载不得用于提权。状态机与 Android 类加载器约束见 [`axp/spec/08-hot-reload.md`](axp/spec/08-hot-reload.md)。

### 宿主一致性等级

AXP-0（装载 + tools）→ AXP-1（+ surfaces / knowledge）→ AXP-2（+ agents / events / ui）→ AXP-3（+ L0–L5 梯度 + hotReload 全语义）。Node 参考运行时声明 **AXP-3**。[`axp/spec/11-conformance.md`](axp/spec/11-conformance.md) 把每个等级拆成可验证断言（C-0-* … C-3-*），第三方宿主声明等级前须提交可复现的结果文件。

### 规范体系（v1.1.0 新增）

`01`–`09` 定义格式与组件；`10`–`13` 定义**规范项目与宿主生态**：[`10` 基础设施](axp/spec/10-infrastructure.md)（工具链 / CI / 产物 / 部署 / 发布）、[`11` 一致性认证](axp/spec/11-conformance.md)、[`12` 安全威胁模型](axp/spec/12-security.md)（S1–S12）、[`13` 索引与分发](axp/spec/13-registry.md)（`axp-index/1.0`，M6）。[`spec/index.json`](axp/spec/index.json) 是文档清单、版本、统计、错误码与断言 ID 的机器可读单一事实源。新增章节不改变 `axp: "1.0"`。

## 示例矩阵

| 示例 | 覆盖 | 宿主等级 | 校验 |
|---|---|---|---|
| [`01-hello`](axp/examples/01-hello) | 最小插件：`tools[]` + `entry` + L0 | AXP-0 | 全绿 |
| [`02-ui-panel`](axp/examples/02-ui-panel) | `ui{}` + `bind / actions / lifecycle` + Surface 订阅 | AXP-2 | 全绿 |
| [`03-hot-reload`](axp/examples/03-hot-reload) | 六类组件 + UI + `hotReload{}` + `gradient` | AXP-3 | 全绿 |
| [`04-domains`](axp/examples/04-domains) | 13 个标准域、URI 模板、`anchor`、`watchable`、事件与多域绑定 | AXP-2 | 全绿 |

## 参考实现状态

| 层次 | 状态 |
|---|---|
| 格式规范 / schema / 校验器 / CLI / 文档 / 示例 | ✅ 完成 |
| **Node 参考运行时**（M2 语义验证，声明 AXP-3） | ✅ 可运行，30 条端到端断言全绿 |
| **M3 感知域**（规范 / 示例 / 教程） | ✅ 就位；真机域适配器待补 |
| Android/Kotlin 真机骨架（类加载器隔离、验签、Compose 绑定） | ⚠️ 源码骨架，需在 Android Studio 编译 |
| 真实 APK v3 证书链、无障碍服务、Shizuku 授权 | ⬜ 宿主侧实现，接口已留 |

路线图：M1 ✅ → M2 ✅（Node）/ ⚠️（Android 骨架）→ M2.5 热加载 ✅ → M3 🟡 → M4 🟡（`gradient` 已实现，Shizuku 待接）→ M5 ✅ → M6 ⬜ → M7 ⬜。详见 [`axp/spec/01-format.md`](axp/spec/01-format.md) §12。

完成度逐项评估、问题分级与剩余任务，见 [`AUDIT.md`](AUDIT.md) 与 [`ROADMAP-ALL-TASKS.md`](ROADMAP-ALL-TASKS.md)。

## 变更记录（摘要）

- **v1.1.1**（当前）：站点工程化与质量门禁提升——`ignoreBuildErrors: false`（tsc 零错误）· `reactStrictMode: true` · ESLint 门禁恢复（unused-vars / unreachable / fallthrough 为 error，hooks 依赖为 warn）· `next/font/google` 改自托管 `geist` 包 · 清理 41 个未用依赖与 36 个未用 shadcn/ui 组件（48→12）· 删除 Prisma 模板与死配置 `tailwind.config.ts` · `bun.lock` workspace 名对齐并重生成 · 文档库 ref 缓存 + 锚点深链 `#library&doc=` · 校验报告下载 / CLI 命令复制。**规范语义不变**，`axp` 仍为 `"1.0"`。
- **v1.1.0**：补齐**全部基础设施规范**——新增 `spec/10` 基础设施、`11` 一致性认证、`12` 安全威胁模型、`13` 索引与分发，以及 `spec/index.json` 机器可读单一事实源；交付 `scripts/spec-check.mjs`、Release/Dependabot 工作流、`Dockerfile` / `.env.example` / `SECURITY.md`、部署与发布教程、一致性套件模板。优化主规范：补 §8.2、修正 §9 兼容规则自相矛盾、统一 `axp://screen` 域、明确文档版本与格式版本分离。**格式语义不变**，`axp` 仍为 `"1.0"`。
- **v1.0.4**：完成度审计；修复 standalone 产物不含 `axp/` 数据的部署缺陷（`outputFileTracingIncludes` + `build` 脚本复制）；CI 新增 `web-build` job；新增顶层 `LICENSE`、产物自检脚本、审计报告与任务总账。**规范语义不变**。详见 [`PATCHES.md`](PATCHES.md) 与 [`AUDIT.md`](AUDIT.md)。
- **v1.0.3**（本仓库基线）：修复参考运行时 Surface 背压时序缺陷——`prime()` 的初始 `full` 快照不再占用推送窗口，装载后首个真实 `delta` 不再被误吞；`smoke.mjs` 30/30 稳定全绿。**规范语义不变**。
- **v1.0.2**：M3 感知域示例与教程（`examples/04-domains` + `docs/domains-tutorial.md`）；回归加固；自检数字 31/43/30。
- **v1.0.1**：参考运行时 `runtime/`、双引擎交叉复核、Android 骨架、CI 三 job、文档增强。
- **v1.0.0**：AXP v1.0 主规范定稿。

完整记录见 [`axp/CHANGELOG.md`](axp/CHANGELOG.md)。

## 文档索引

| 类别 | 入口 |
|---|---|
| 规范正文 | [`axp/spec/01-format.md`](axp/spec/01-format.md)（主规范）· [02 schema](axp/spec/02-manifest.schema.json) · [03 impl](axp/spec/03-impl-reference.md) · [04 权限](axp/spec/04-capabilities.md) · [05 域](axp/spec/05-domains.md) · [06 UI](axp/spec/06-ui-vocab.md) · [07 表达映射](axp/spec/07-expression-map.md) · [08 热加载](axp/spec/08-hot-reload.md) · [09 版本](axp/spec/09-versioning.md) |
| 规范 · 基础设施与生态 | [10 基础设施](axp/spec/10-infrastructure.md) · [11 一致性认证](axp/spec/11-conformance.md) · [12 安全威胁模型](axp/spec/12-security.md) · [13 索引与分发](axp/spec/13-registry.md) · [index.json](axp/spec/index.json) |
| 教程 | [插件入门](axp/docs/plugin-tutorial.md) · [UI 教程](axp/docs/ui-tutorial.md) · [热加载教程](axp/docs/hot-reload-tutorial.md) · [感知域教程](axp/docs/domains-tutorial.md) · [宿主集成](axp/docs/integration-guide.md) · [运行时指南](axp/docs/runtime-guide.md) · [CLI 参考](axp/docs/cli-reference.md) · [合规自检表](axp/docs/host-checklist.md) · [FAQ](axp/docs/faq.md) |
| 部署与发布 | [部署指南](axp/docs/deployment.md) · [发布流程](axp/docs/release.md) · [安全策略](SECURITY.md) |
| 参考实现 | [Node 参考运行时](axp/runtime/README.md) · [校验器与错误码](axp/validator/README.md) · [Android 骨架](axp/reference-host/README.md) |
| 工程化 | [贡献指南](axp/CONTRIBUTING.md) · [文档模板](axp/docs/doc-templates.md) · [开仓库指南](axp/docs/github-setup.md) · [一致性套件](axp/conformance/README.md) |

## 常用命令

| 命令 | 说明 |
|---|---|
| `bun run dev` | 启动文档站点（端口 3000） |
| `bun run lint` | ESLint（Next.js 规则） |
| `node axp/validator/src/validate.mjs <dir> [--json] [--strict]` | 校验一个插件包 |
| `node axp/cli/bin/axp.mjs new <id> [-o dir]` | 生成最小插件骨架 |
| `node axp/cli/bin/axp.mjs pack <dir> -o x.axp` | 打包（发布前 `apksigner sign --v3`） |
| `node axp/runtime/test/smoke.mjs` | 参考运行时 30 条端到端断言 |
| `node scripts/site-check.mjs --prebuild` | 构建前 `axp/` 数据完整性（零依赖） |
| `node scripts/spec-check.mjs` | 规范 / schema / 错误码 / 数字 / 全仓链接一致性（零依赖） |
| `node scripts/site-check.mjs` | 构建后 standalone 产物自包含性 |

## 贡献与许可

- 规范字段变更走 spec-change 提案（`.github/ISSUE_TEMPLATE` 见 `axp/.github/`）；提交格式 `<type>(<scope>): <subject>`，详见 [`axp/CONTRIBUTING.md`](axp/CONTRIBUTING.md)。
- MIT License，见 [`LICENSE`](LICENSE)；安全披露见 [`SECURITY.md`](SECURITY.md)。

> 本仓库内容由 AI 辅助生成，仅作为规范草案与工程起点；落地实现前请按 [`axp/docs/host-checklist.md`](axp/docs/host-checklist.md) 逐项验证。
