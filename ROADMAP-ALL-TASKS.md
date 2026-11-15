# AXP · 一次性全部任务总账

> 状态：Stable
> 适用：`abysssnare/axp` @ `main` · v1.1.1
> 说明：**这一份列全整个项目的所有任务**，包含已完成的、进行中的、还没开始的；不再分批补。状态以 2026-11-15 审计结果为准（v1.1.1 增量见文末）。
> 图例：✅ 已完成并验证　🟡 部分完成　⬜ 未开始　⚠️ 有风险 / 待实测　🔒 本轮刻意未动

## 状态速查

| 分组 | ✅ | 🟡 | ⬜ | ⚠️ | 🔒 |
|---|---|---|---|---|---|
| A 规范与格式 | 12 | 0 | 0 | 0 | 0 |
| B 工具链与验证 | 11 | 0 | 0 | 0 | 0 |
| C 文档与教程 | 9 | 0 | 0 | 0 | 0 |
| D 交互式文档站点 | 11 | 3 | 2 | 1 | 0 |
| E CI / 构建 / 部署 | 4 | 1 | 2 | 2 | 0 |
| F 真机与生态 | 2 | 3 | 4 | 1 | 0 |
| G 治理与清理 | 3 | 1 | 3 | 0 | 3 |

**当前唯一 P0 未知数：E03（一次真实 `next build`）尚未实测。**

---

## A · 规范与格式（全部完成）

| ID | 任务 | 状态 | 验收标准 | 落点 |
|---|---|---|---|---|
| A01 | 确立「同级独立格式」定位，表达力覆盖移出正文 | ✅ | 正文不借用外部格式字段名 | `axp/spec/01-format.md` §0 / `07-expression-map.md` |
| A02 | 包结构与 `axp.json` 顶层字段表 | ✅ | schema + 文档一致 | `01-format.md` §2–3 |
| A03 | 完整 JSON Schema（draft 2020-12，严格模式） | ✅ | Python `jsonschema` 校验自身元语法通过 | `axp/spec/02-manifest.schema.json` |
| A04 | 统一实现引用 `impl` 七形态 + 选择算法 | ✅ | 规范/校验器/站点表述一致 | `03-impl-reference.md` |
| A05 | L0–L5 权限阶梯 + `requests` 词汇表 + `gradient` | ✅ | 越权用例被 `GRADIENT_EXCEEDS_PRIVILEGE` 捕获 | `04-capabilities.md` |
| A06 | 13 个 `axp://` 标准域 + 自定义域注册 | ✅ | 域表与示例一致 | `05-domains.md` / `examples/04-domains` |
| A07 | UI DSL 节点词汇表 + 绑定 + 生命周期 | ✅ | `panel.json` 可解析 | `06-ui-vocab.md` |
| A08 | `hotReload{}` 全字段 + 状态机 + 每次验签 | ✅ | 6 类热加载负面用例全被捕获 | `08-hot-reload.md` |
| A09 | `allowDynamicCode: false` 边界澄清 | ✅ | 合法热加载不被误杀 | `04-capabilities.md` §5 |
| A10 | 分发改 Android 会话安装 + APK v3 | ✅ | `distribution.channel` 枚举无通用仓库措辞 | `01-format.md` §9 |
| A11 | 版本语义 / 兼容 / 弃用流程 | ✅ | `spec-v1.x.y` 发布物定义 | `09-versioning.md` |
| A12 | M1–M7 路线图与 AXP-0…3 一致性等级 | ✅ | 站点与 README 口径一致（见 D14） | `01-format.md` §11–12 |

## B · 工具链与验证（全部完成且实跑通过）

| ID | 任务 | 状态 | 验收标准 | 落点 |
|---|---|---|---|---|
| B01 | 零依赖离线校验器（schema + 安全规则 + 引用完整性） | ✅ | 无 npm 依赖可跑 | `axp/validator/src/validate.mjs` |
| B02 | 精简 JSON Schema 引擎与标准引擎语义对齐 | ✅ | 43/43 交叉复核 | `axp/validator/test/schema-crosscheck.py` |
| B03 | 31 条行为固化用例（含边界用例） | ✅ | 31/31 | `axp/validator/test/run-tests.mjs` |
| B04 | CLI `new / validate / pack / inspect / install` | ✅ | `pack` 产物含 `axp.json` | `axp/cli/bin/axp.mjs` |
| B05 | Node 参考运行时（AXP-3，9 步装载 / gradient / Surface / UI / 热加载） | ✅ | 30/30 端到端断言 | `axp/runtime/` |
| B06 | Surface 背压时序修复（v1.0.3） | ✅ | 首个真实 delta 不被误吞 | `axp/runtime/src/surfaces.mjs` |
| B07 | dev / strict 双签名策略 | ✅ | strict 拒绝证书不匹配 | `axp/runtime/src/signature.mjs` |
| B08 | TypeScript 类型定义 | ✅ | 与 schema 字段对应 | `axp/sdk/sdk-js/index.d.ts` |
| B09 | 4 个官方示例插件 | ✅ | 4/4 校验全绿 | `axp/examples/01…04` |
| B10 | M3 感知域示例（8 域 / URI 模板 / 多域绑定 / 双触发源） | ✅ | `04-domains` 全绿 | `axp/examples/04-domains` |
| B11 | 错误码表与校验器实现一一对应 | ✅ | 25 个业务码有对应用例 | `axp/validator/README.md` |

## C · 文档与教程（全部完成）

| ID | 任务 | 状态 | 说明 |
|---|---|---|---|
| C01 | 规范正文 9 篇 | ✅ | `axp/spec/01`–`09` |
| C02 | 教程与指南 11 篇 | ✅ | 插件 / UI / 热加载 / 感知域 / 集成 / 运行时 / CLI / 自检表 / FAQ / 模板 / 开仓库 |
| C03 | 宿主集成教程（10 步 Kotlin + 装载流水线 + 热加载接入） | ✅ | `axp/docs/integration-guide.md` |
| C04 | 文档格式模板（教程四节 / 插件 README / spec 变更提案） | ✅ | `axp/docs/doc-templates.md` |
| C05 | 开仓库指南（初始化 / OWNER / CI / tag / Release） | ✅ | `axp/docs/github-setup.md` |
| C06 | 全仓 Markdown 链接审计 | ✅ | 39 文件 / 197 链接 / 0 断链 |
| C07 | 贡献指南 + PR / Issue 模板 | ✅ | `axp/CONTRIBUTING.md` / `axp/.github/` |
| C08 | CHANGELOG v1.0.0 → v1.0.3 | ✅ | 本轮补 v1.0.4 |
| C09 | **审计报告 / 任务总账 / 改动清单** | ✅ | 本轮新增 `AUDIT.md` / 本文件 / `PATCHES.md` |

## D · 交互式文档站点

| ID | 任务 | 状态 | 优先级 | 验收标准 | 落点 |
|---|---|---|---|---|---|
| D01 | Next.js 16 App Router 单页站点骨架 | ✅ | — | `/` 可渲染 | `src/app/` |
| D02 | 服务端数据层直接读 `axp/` 真实文件 | ✅ | — | 站点数据 = 仓库数据 | `src/lib/axp-server.ts` |
| D03 | 16 个内容章节（格式 / Android / 宿主 / 动手） | ✅ | — | 导航与章节 id 对应 | `src/components/axp/sections-*.tsx` |
| D04 | 4 个示例真实 `axp.json` + 文件树 + 一键验证 | ✅ | — | 调用 `/api/validate` 返回全绿 | `examples-section.tsx` |
| D05 | 校验器演练场 + 8 个破坏性预设 | ✅ | — | 每个预设命中对应错误码 | `playground-section.tsx` |
| D06 | 文档库全文渲染 / 搜索 / 相对链接互通 | ✅ | — | `/api/doc` 白名单返回原文 | `library-section.tsx` / `markdown.tsx` |
| D07 | `/api/doc` 白名单 + 路径前缀校验 | ✅ | — | 任意路径返回 404 | `src/app/api/doc/route.ts` |
| D08 | `/api/validate` 临时目录 + 占位文件 + 超时 + 清理 | ✅ | — | 不执行实现体、无残留 | `src/app/api/validate/route.ts` |
| D09 | 暗色主题 / 响应式 / 代码高亮 / 元数据与 SEO | ✅ | — | `layout.tsx` / `globals.css` | — |
| D10 | 静态 import 图与导出符号闭合 | ✅ | — | 128 本地引用 0 缺失 | 全 `src/` |
| D11 | **standalone 产物自带 `axp/` 数据** | ✅ | P0 | `.next/standalone/axp/spec/01-format.md` 存在 | `next.config.ts` + `package.json` |
| D12 | 构建产物自检脚本 | ✅ | P0 | `node scripts/site-check.mjs` 退出码 0 | `scripts/site-check.mjs` |
| D13 | `readDocContent` 前缀校验加固 | ✅ | P1 | 用 `path.sep` 判断 | `src/lib/axp-server.ts` |
| D14 | 路线图口径统一（M2 的 Node ✅ / Android ⚠️） | 🟡 | P1 | 站点 `ROADMAP` 与 README 一致 | `src/components/axp/data.ts` |
| D15 | 站点硬统计改为从 `axp/` 自动推导 | 🟡 | P1 | 测试数 / 文档数变化后无需手改 | `axp-server.ts` / `data.ts` |
| D16 | `library-section` 消除 `fetchDoc` 无效重建 | 🟡 | P2 | 用 ref 缓存已加载内容，去掉 `content` 依赖 | `library-section.tsx` |
| D17 | 文档库支持锚点深链（`#library&doc=…` 已起步） | ⬜ | P2 | 刷新后仍定位到同一文档 | `axp-site.tsx` / `library-section.tsx` |
| D18 | 校验器演练场支持「下载校验报告 / 复制命令」 | ⬜ | P3 | 一键导出 JSON 结果 | `playground-section.tsx` |
| D19 | `next/font/google` 改本地或自托管字体 | ⚠️ | P1 | 断网环境 `next build` 仍成功 | `src/app/layout.tsx` |

## E · CI / 构建 / 部署

| ID | 任务 | 状态 | 优先级 | 验收标准 | 落点 |
|---|---|---|---|---|---|
| E01 | `axp-selfcheck` job（schema / 4 示例 / 31 / 43 / 30 / pack） | ✅ | — | 当前 CI 已通过 | `.github/workflows/ci.yml` |
| E02 | `docs-links` job（`axp/` 内部断链检查） | ✅ | — | 39 文件 0 断链 | 同上 |
| E03 | **一次真实 `bun run build` 实测** | ⚠️ | **P0** | 在有 Bun/联网环境跑通并留日志 | 本地 / CI |
| E04 | `web-build` job（build + 产物自检） | ✅ | P0 | 本轮新增，随 E03 一起验证 | `.github/workflows/ci.yml` |
| E05 | `web-lint` job | ✅ | — | `bun install --frozen-lockfile` + lint 通过 | 同上 |
| E06 | `docs-links` 扩展到全仓（含顶层 README / AUDIT / 任务总账） | ⬜ | P1 | 扫描根目录 `.md`，不进 `node_modules` | 同上 |
| E07 | `typescript.ignoreBuildErrors` 置 `false` | ⬜ | P1 | 先跑 `tsc --noEmit` 修完类型错误再改 | `next.config.ts` |
| E08 | ESLint 至少恢复 `no-undef` / `no-unused-vars` / `react-hooks/exhaustive-deps` | ⬜ | P2 | lint 仍绿且能挡真实问题 | `eslint.config.mjs` |
| E09 | `reactStrictMode` 置 `true` | ⬜ | P2 | dev 下无 hydration 报错 | `next.config.ts` |
| E10 | 部署文档（Vercel / standalone 容器 / 环境变量 / 缓存） | ⬜ | P1 | 按文档可复现一次部署 | 新增 `docs/deployment.md` |

## F · 真机与生态（路线图 M3 / M4 / M6 / M7）

| ID | 任务 | 状态 | 优先级 | 验收标准 | 落点 |
|---|---|---|---|---|---|
| F01 | M2 `runtime/` 参考宿主跑通 | ✅ | — | 30/30 | `axp/runtime/` |
| F02 | M2.5 热加载状态机 / 回滚 / 每次验签 | ✅ | — | 断言全绿 | `axp/runtime/src/hotreload.mjs` |
| F03 | M3 感知域规范 + 示例 + 教程 | ✅ | — | `04-domains` 全绿 | `axp/spec/05` / `examples/04` |
| F04 | **M3 真机 `HostBridge.surface()` 13 域适配器** | 🟡 | P1 | 真机上屏幕树 / 通知 / 传感器 / 剪贴板 / 网络能刷新面板 | `reference-host/android/` |
| F05 | M4 Shizuku L3 通道 + 审计 UI | 🟡 | P1 | 同一 tool 在 L2/L3 自动切实现 | `reference-host/android/` |
| F06 | `reference-host/android/` 在 Android Studio 编译 + 单元测试 | ⚠️ | P1 | `:host:testDebugUnitTest` 通过 | 同上 |
| F07 | M6 真实 APK v3 证书链 / `strict` 签名 / 会话安装 | ⬜ | P1 | 换证书的热替换被拒 | `axp/runtime/src/signature.mjs` + 宿主 |
| F08 | 示例插件 `publisher` 换成真实指纹 | ⬜ | P2 | 无 64 个 `0` 的占位值 | `axp/examples/*/axp.json` |
| F09 | T2–T7 实现体在真机执行（dex / so / wasm / bin / proc / url） | ⬜ | P2 | 至少 T2 dex + T5 bin 跑通 | 宿主 |
| F10 | M7 宿主合规认证 + 第三方示例库 | ⬜ | P3 | ≥2 个第三方宿主达 AXP-2 | 生态 |

## G · 治理与清理

| ID | 任务 | 状态 | 优先级 | 验收标准 | 落点 |
|---|---|---|---|---|---|
| G01 | 顶层 `LICENSE`（MIT） | ✅ | P1 | GitHub 识别许可证 | `LICENSE` |
| G02 | 移除 `allowedDevOrigins` 生成环境残留 | ✅ | P2 | 配置中无第三方域名 | `next.config.ts` |
| G03 | 完整审计报告 + 任务总账 + 改动清单 | ✅ | — | 三份文档互相链接可达 | `AUDIT.md` / 本文件 / `PATCHES.md` |
| G04 | `bun.lock` workspace name 改为 `axp` | 🟡 | P2 | 与 `package.json` 一致（当前 CI 已通过，仅观感） | `bun.lock` |
| G05 | **清理 21 个未使用依赖并重生成 `bun.lock`** | 🔒 | P1 | 删除后 `bun install --frozen-lockfile` 仍通过 | `package.json` + `bun.lock` |
| G06 | 删除 32 个未使用 shadcn 组件 | 🔒 | P2 | 站点渲染不变、lint 通过 | `src/components/ui/` |
| G07 | 删除 Prisma 模板（`schema.prisma` + `src/lib/db.ts` + db 脚本） | 🔒 | P1 | 无 `DATABASE_URL` 依赖 | `prisma/` / `src/lib/db.ts` / `package.json` |
| G08 | 依赖清理后重新生成并复核 lockfile | ⬜ | P1 | 与 G05–G07 同批完成 | `bun.lock` |
| G09 | `axp/` 作为独立仓库拆出的可复现流程 | ⬜ | P3 | 按 `github-setup.md` 拆出后自检全绿 | `axp/docs/github-setup.md` |
| G10 | 发 `spec-v1.0.0` tag 与 Release 产物 | ⬜ | P2 | `axp-spec-<version>.zip` 可下载 | GitHub Releases |

> 🔒 = 本轮**刻意未动**：改 `package.json` 依赖必须同步重生成 `bun.lock`，否则 CI 的 `--frozen-lockfile` 会失败；本环境无 Bun，贸然修改等于把仓库弄红。G05–G08 必须在有 Bun 的机器上作为**一批**完成。

---

## 建议执行顺序（一次排完，不用再问）

1. **E03 / E04**：在有 Bun 的机器跑 `bun install --frozen-lockfile && bun run build && node scripts/site-check.mjs`，把构建日志贴回来；若首次失败，按日志修类型/字体，再动 `ignoreBuildErrors`
2. **E06 / E07 / E08 / E09**：把质量门禁补齐，让 lint 与 build 真正能挡问题
3. **G05 → G07 → G08**：一批清理模板残留，`bun install` 重生成 lock，确认 CI 仍绿
4. **D14 / D15 / D16**：消除站点硬编码与无效渲染，让数据从 `axp/` 自动推导
5. **F04 / F05 / F06**：真机适配器与 Android 骨架编译，这是从「格式规范」走向「能用的 Android 生态」的关键一跳
6. **F07 / F08 / E10 / G10**：签名信任链、部署文档、Release 产物，然后对外发布

对应路线图：M1 ✅ → M2 ✅ / ⚠️ → M2.5 ✅ → M3 🟡 → M4 🟡 → M5 ✅ → M6 ⬜ → M7 ⬜。

---

## v1.1.0 增量与状态更新（2026-11-15）

> 上方「状态速查」表统计的是 v1.0.4 基线；本节记录本轮完成项与新增任务，不回改基线数字。图例沿用。

### 本轮完成（v1.0.4 遗留任务）

| 任务 ID | 状态 | 落点 |
|---|---|---|
| C09 审计 / 任务总账 / 改动清单 | ✅ 已交付并追加 v1.1 复核 | `AUDIT.md` §7 · 本文件 · `PATCHES.md` §7 |
| D11 standalone 自带 `axp/` | ✅ 且升级为规范条款 | `spec/10-infrastructure.md` §6.3 |
| D12 产物自检脚本 | ✅ 且文档清单动态化 | `scripts/site-check.mjs` |
| D14 路线图口径统一 | ✅ M2 改 partial（Node ✅ / Android ⚠️） | `src/components/axp/data.ts` |
| D15 站点硬统计漂移 | ✅ `loadSiteData()` 从 `spec/index.json` 派生 | `src/lib/axp-server.ts` |
| D13 路径前缀校验加固 | ✅ v1.0.4 已完成，v1.1 纳入 `spec-check` 断言 | — |
| E04 `web-build` job | ✅ 已随 v1.0.4 合入远端 | `.github/workflows/ci.yml` |
| E06 `docs-links` 扩到全仓 | ✅ 根目录 md 一并扫描 | 同上 |
| E10 部署文档 | ✅ 文档 + Dockerfile + .env.example | `axp/docs/deployment.md` |
| G01 / G02 / G03 | ✅ 顶层 LICENSE / 清理残留 / 三份治理文档 | — |
| G10 Release 产物 | ✅ workflow 就位（`spec-v*` tag 自动打包 + SHA256SUMS） | `.github/workflows/release.yml` |

### 本轮新增任务（已随交付完成，登记以便追溯）

| 新 ID | 任务 | 状态 | 验收 |
|---|---|---|---|
| H01 | 补齐基础设施规范 4 章（工具链 / CI / 产物 / 部署 / 发布） | ✅ | `spec/10-infrastructure.md` + `spec-check` 断言 |
| H02 | 一致性等级可验证化（26 条断言 + 结果格式 + 认证流程） | ✅ | `spec/11-conformance.md` + `axp/conformance/` |
| H03 | 安全威胁模型编号化（S1–S12 映射错误码） | ✅ | `spec/12-security.md` + `SECURITY.md` |
| H04 | M6 索引与分发格式定义（`axp-index/1.0`） | ✅ | `spec/13-registry.md` |
| H05 | 规范机器可读单一事实源 | ✅ | `spec/index.json`；站点统计改为派生 |
| H06 | 零依赖规范一致性自检 | ✅ | `node scripts/spec-check.mjs` 212 项全绿 |
| H07 | 主规范编辑性优化（§8.2 / §0.4 / 兼容表 / 版本分离） | ✅ | 章节编号连续，`axp` 仍为 `"1.0"` |
| H08 | URI 域归一化（`axp://vision/screen` → `axp://screen`） | ✅ | 全仓零遗留写法，30/30 冒烟仍绿 |
| H09 | 文档 / 教程补齐部署与发布 | ✅ | `axp/docs/deployment.md` / `release.md` |
| H10 | 容器化部署基线 | ✅ | `Dockerfile` 构建期断言 + HEALTHCHECK 命中 `/api/doc` |
| H11 | 依赖更新自动化 | ✅ | `.github/dependabot.yml` |
| H12 | 安全披露策略 | ✅ | `SECURITY.md` |
| H13 | CI 新增 `spec-consistency` job | ✅ | 五 job 门禁，`spec-check` 先于打包 |

### 仍未完成（优先级不变）

| 任务 ID | 说明 | 阻塞条件 |
|---|---|---|
| **E03** | 一次真实 `bun run build` 实测 | 需要 Bun + 联网环境；当前唯一 P0 未知数 |
| E07 / E08 / E09 | `ignoreBuildErrors` 置 false / 恢复 ESLint 规则 / `reactStrictMode` | 依赖 E03 先跑通并修完类型错误 |
| D19 | `next/font/google` 本地化 | 离线构建会失败 |
| G05 → G07 → G08 | 清理 21 个未用依赖 / 32 个 shadcn 组件 / Prisma 模板，并重生成 `bun.lock` | **必须一批做**，否则 `--frozen-lockfile` 会红 |
| G04 | `bun.lock` workspace name 改为 `axp` | 与 G08 同批 |
| F04 / F05 / F06 / F07 | 真机域适配器 / Shizuku L3 / Android 骨架编译 / 真实 APK v3 证书链 | 需要 Android SDK 与设备 |
| F08 / F09 / F10 | 真实指纹 / T2–T7 实现体 / 第三方生态 | 宿主侧 |
| D16 / D17 / D18 | 文档库 hooks / 锚点深链 / 报告导出 | 低优先级 |
| H14 | `conformance/cases/` 实际用例 | 需第三方宿主实现者参与 |

### 建议执行顺序（更新版）

1. **E03** → 贴回构建日志；若失败先修类型 / 字体
2. **E07 / E08 / E09 / D19** → 把质量门禁补齐
3. **G05 → G07 → G08 → G04** → 一批清理并重生成 lockfile
4. **F04 / F05 / F06 / F07** → 真机最后一公里
5. **D16–D18 / H14 / G09 / G10 复跑** → 发布 `spec-v1.1.0` tag

对应路线图：M1 ✅ → M2 ✅ / ⚠️ → M2.5 ✅ → M3 🟡 → M4 🟡 → M5 ✅ → M6 **规范 ✅ / 实现 ⬜** → M7 **认证流程 ✅ / 用例 ⬜**。

---

## v1.1.1 增量与状态更新（2026-11-15）

> 上方基线表统计口径不变；本节记录 v1.1.1 工程化提升轮的完成项。规范正文与工具链（`axp/`）零改动，仅 `spec/index.json` 版本 / 构建门禁状态字段与 `axp/docs/deployment.md` 的两处现状描述同步更新。

### 本轮完成（v1.1.0 遗留任务）

| 任务 ID | 状态 | 说明 |
|---|---|---|
| **E03** 一次真实 `next build` | ✅ | GitHub Actions `web-build` job（`bun run build` + `node scripts/site-check.mjs`）在 v1.1.0 基线推送上通过，standalone 产物自包含验证留闸 |
| **E07** `ignoreBuildErrors` 置 `false` | ✅ | 前置 `bunx tsc --noEmit` 零错误（含修复 `playground-section.tsx` 两处 `possibly undefined`）；`tsconfig exclude` 对齐沙箱目录 |
| **E08** ESLint 规则恢复 | ✅ | `src/**`：unused-vars / unreachable / redeclare / useless-escape / fallthrough = error；`react-hooks/exhaustive-deps` = warn；`axp/**` 不叠加前端规则；清理 7 处未用导入；`bun run lint` 零错误零警告 |
| **E09** `reactStrictMode` 置 `true` | ✅ | 开发期实测无 hydration 报错 |
| **D16** 文档库无效重拉取 | ✅ | `fetchDoc` ref 缓存 + 稳定回调，每篇文档每页仅一次请求 |
| **D17** 锚点深链 | ✅ | `#library&doc=<path>` 刷新仍定位；不影响章节锚点导航 |
| **D18** 报告导出 / 命令复制 | ✅ | 「下载校验报告」（JSON）·「复制 CLI 命令」·「复制当前清单」 |
| **D19** 字体本地化 | ✅ | `next/font/google` → npm 包 `geist`（自托管 woff2，构建期零外网） |
| **G04** `bun.lock` workspace 名 | ✅ | 对齐 `axp`，`bun install --frozen-lockfile` 通过 |
| **G05** 清理未使用依赖 | ✅ | 41 个移除（含 Prisma 全套、`z-ai-web-dev-sdk`、`next-auth`、`sharp` 等），`package.json` 依赖 68→21 |
| **G06** 删除未用 shadcn 组件 | ✅ | 48→12，站点渲染 / lint / tsc 不变 |
| **G07** 删除 Prisma 模板 | ✅ | `prisma/` + `src/lib/db.ts` + db:* 脚本移除；`.env.example` 同步 |
| **G08** lockfile 重生成复核 | ✅ | 与 G05–G07 同批完成，frozen 安装通过 |

### 本轮其他改动

- 修复 `scripts/spec-check.mjs` 全仓 md 扫描误入不入库目录（沙箱 `skills/` 等）的问题：目录跳过名单与 `.gitignore` 对齐
- 删除死配置 `tailwind.config.ts`（v4 CSS-first：`globals.css` 无 `@config` 引用，JS 配置从未生效）
- 仓库自 `Ultra-Guru/axp` 迁至 `abysssnare/axp`（`git push origin main`，CI 五 job 首跑全绿）

### 仍未完成（优先级不变）

| 任务 ID | 说明 | 阻塞条件 |
|---|---|---|
| F04 / F05 / F06 / F07 | 真机域适配器 / Shizuku L3 / Android 骨架编译 / 真实 APK v3 证书链 | 需要 Android SDK 与设备 |
| F08 / F09 / F10 | 真实指纹 / T2–T7 实现体 / 第三方生态 | 宿主侧 |
| H14 | `conformance/cases/` 实际用例 | 需第三方宿主实现者参与 |
| G09 / G10 | `axp/` 独立拆仓流程复跑 / `spec-v1.1.1` tag 与 Release | 发布窗口 |

### 建议执行顺序（v1.1.2 起步）

1. **G10** → 打 `spec-v1.1.1` tag 触发 Release 产物（SHA256SUMS）
2. **F04 / F05 / F06 / F07** → 真机最后一公里
3. **H14 / F10** → 一致性用例与第三方生态
4. **G09** → 规范项目独立开仓复跑

对应路线图不变：M1 ✅ → M2 ✅ / ⚠️ → M2.5 ✅ → M3 🟡 → M4 🟡 → M5 ✅ → M6 **规范 ✅ / 实现 ⬜** → M7 **认证流程 ✅ / 用例 ⬜**。
