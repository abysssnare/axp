# AXP 仓库完成度审计报告

> 状态：Stable
> 审计对象：`Ultra-Guru/axp`，分支 `main`，commit `2baeba7`（2026-11-14）
> 审计日期：2026-11-15
> 结论一句话：**规范项目本体做得很扎实，站点内容也完整；真正没做完的是「站点能不能被构建、能不能自包含部署」这一层工程化。**

---

## 0. 总评

| 维度 | 评分 | 判断 |
|---|---|---|
| 规范与工具链（`axp/`） | **A** | 与 v1.0.2 基准逐文件比对，仅 2 处有意的 v1.0.3 改动；四套自检真实跑通 |
| 文档与教程 | **A** | 39 篇 Markdown、197 个本地链接零断链；站点文档库覆盖 9 篇规范 + 11 篇教程 + 参考实现 |
| 交互式站点内容 | **A−** | 16 个章节、4 个示例、8 个破坏性预设、真实校验器 API；代码组织干净 |
| CI / 构建 / 部署 | **C** | CI 当前绿灯，但**从未执行过一次 `next build`**；standalone 产物不含 `axp/` 数据 |
| 依赖与模板清理 | **C+** | 68 个依赖中 21 个从未被引用，48 个 shadcn 组件只用了 16 个，Prisma 模板残留 |
| 真机落地与生态 | **进行中** | M3/M4/M6/M7 规范侧齐备，真机适配器与签名信任链仍待实现 |

**一句话**：你把「写规范」这件事做完了，把「让规范可被验证」也做完了；还差「让站点在任何环境都能被可靠地构建和部署」以及「真机侧最后一公里」。

---

## 1. 审计口径

基于 `main` 分支的完整文件树（207 个文件 / 72 个目录）与仓库归档快照，做了四件事：

1. 把 `axp/` 与上一版交付的 v1.0.2 逐文件比对，确认有没有被改坏
2. 在仓库副本上真实执行四套自检与 CLI
3. 静态分析站点的 import 图、导出符号、依赖使用、API 路由与服务端数据层
4. 查询 GitHub Actions 最近运行记录，核实 CI 是否真的通过

> 未能完成的部分：本环境不具备 Bun 与完整的前端依赖安装条件，**没有跑成一次真实的 `next build`**。因此下文所有"站点可构建性"结论均为静态分析的确定性推断，不是构建实测。这一点已单独列为 P0 任务。

---

## 2. 硬证据：确实做完了的部分

### 2.1 `axp/` 未被改坏

与 v1.0.2 基准 `diff -rq` 结果只有两处：

| 文件 | 变化 | 判断 |
|---|---|---|
| `axp/CHANGELOG.md` | 新增 `[1.0.3]` 段 | 合理 |
| `axp/runtime/src/surfaces.mjs` | `prime()` 发出初始 `full` 快照后把 `streams.get(uri).lastAt = 0` | **真实修复**，解决装载后首个 delta 被背压窗口误吞 |

其余 119 个文件逐字节一致。也就是说：规范正文、JSON Schema、校验器、CLI、参考运行时、Android 骨架、4 个示例、11 篇教程全部完整保留，没有出现"为了做站点把规范改歪"的情况——这是最容易踩的坑，你避开了。

### 2.2 四套自检真的绿（在仓库副本上实跑）

| 检查 | 结果 |
|---|---|
| 4 个示例 `axp validate` | 4/4 全绿 |
| `validator/test/run-tests.mjs` | **31/31** |
| `validator/test/schema-crosscheck.py`（Python `jsonschema` draft 2020-12） | **43/43** |
| `runtime/test/smoke.mjs` | **30/30** |
| `axp inspect examples/03-hot-reload` | 输出正常 |

README 徽章 `31+43+30+4` 与实际一致，没有虚标。

### 2.3 链接与引用

- 全仓 39 个 Markdown、197 个本地链接，**0 断链**（含顶层 README 的 `axp/...` 相对链接）
- 站点 71 个源文件、128 个本地 import（103 个 `@/` 别名 + 25 个相对），**0 个指向不存在的文件**
- 关键导出符号（`AxpSite` / `ValidateResponse` / `ValidateResultPanel` / `Markdown` / `Section` …）全部存在，跨组件引用闭合

### 2.4 CI 现状

最近两次 Actions 运行：

| 时间 | 结论 | 提交 |
|---|---|---|
| 15:50 | ❌ failure | `feat: AXP v1.0.3 …` |
| 15:54 | ✅ success | `fix(ci): 修正 .gitignore 误排除 test 目录` |

当前 `main` 的 CI 是绿的，三个 job（`axp-selfcheck` / `web-lint` / `docs-links`）都能过。第一次失败原因已自行修掉，处理正确。

### 2.5 站点设计做对的地方

- `src/lib/axp-server.ts` 直接读 `axp/` 真实文件，站点展示的示例清单、文档原文、文件树都来自仓库，不是复制粘贴的第二份内容——「网站上看到的 = 仓库里的」这个约束成立
- `/api/doc` 用 `DOC_META` 白名单 + 路径前缀校验，不接受任意路径
- `/api/validate` 在临时目录写 `axp.json` + 引用占位文件，调用**同一个零依赖校验器 CLI**，20 秒超时、`finally` 清理临时目录，不会执行插件实现体
- 演练场的 8 个破坏性预设（`GRADIENT_EXCEEDS_PRIVILEGE` / `CAP_UNKNOWN_REQUEST` / `HOT_SIGNATURE_POLICY` / `DANGEROUS_NOT_REQUESTED` / `TOOL_CONFIRM_REQUIRED` / `UI_ACTION_TOOL_MISSING` / `HOT_UNSIGNED_SOURCE` / `ID_INVALID`）与校验器错误码一一对应，是"可教学的验证"而不只是 UI 装饰

---

## 3. 问题清单（按优先级）

### P0 · 会被部署直接打脸的

**P0-1　standalone 产物不含 `axp/`，文档库与演练场在自包含部署下会挂**

`src/lib/axp-server.ts` 里 `AXP_ROOT = path.join(process.cwd(), "axp")` 是运行时拼接的字符串，Next.js 的 output file tracing 无法静态追踪到 `axp/` 目录。而 `package.json` 的 `build` 只复制了 `.next/static` 和 `public`：

```
next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
```

按 Next.js 官方推荐的 standalone 部署方式（把 `.next/standalone/` 整个目录作为容器工作目录运行 `server.js`），`axp/` 不在产物里：

- `/api/doc?path=…` → 读不到文件，文档库全文空白
- `/api/validate` → `VALIDATOR_RUN_FAILED`，演练场失效
- 首页若在 build 期被静态化，示例数据变成构建时快照，之后更新 `axp/` 不会反映到站点

本地 `bun run dev` 不受影响（cwd 是仓库根），所以这个问题只在发布时暴露——**最容易被漏掉的一类**。

> 修复：本轮已在 `next.config.ts` 加 `outputFileTracingIncludes`，并在 `build` 脚本追加 `cp -r axp .next/standalone/`，双保险。

**P0-2　CI 从未构建过站点**

`web-lint` job 只有 `bun install --frozen-lockfile` + `bun run lint`，没有 `bun run build`。配合 `next.config.ts` 的 `typescript.ignoreBuildErrors: true` 和 `eslint.config.mjs` 中几乎全部规则被关掉（`no-unused-vars` / `no-undef` / `react-hooks/exhaustive-deps` / `@next/next/*` 全 off），当前质量门禁基本只能挡语法错误，挡不住类型错误、运行时错误和构建失败。

> 修复：本轮新增 `web-build` job（`bun run build` + 产物自检），并保留 lint job。

**P0-3　「站点能 build」目前是未验证状态**

本轮尝试安装完整前端依赖做一次真实构建，环境不具备条件（包管理器全局配置 + 镜像限制），未能完成。因此 P0-2 新增的 build job 首次运行可能暴露出此前被 `ignoreBuildErrors` 掩盖的问题。**这是当前仓库最大的未知数**，需要在有 Bun / npm 的机器上跑一次：

```bash
bun install --frozen-lockfile
bun run build
node scripts/site-check.mjs
```

### P1 · 工程整洁度与长期可维护性

| # | 问题 | 证据 | 影响 |
|---|---|---|---|
| P1-1 | 模板残留 | `bun.lock` 的 workspace name 是 `nextjs_tailwind_shadcn_ts`，`package.json` 是 `axp` | 观感问题；CI 的 `--frozen-lockfile` 实测已通过，不影响构建 |
| P1-2 | Prisma 全是死代码 | `prisma/schema.prisma` 是模板的 `User` / `Post`；`src/lib/db.ts` 无任何引用者；无 `.env.example` / `DATABASE_URL` | 增加安装体积、供应链面与认知负担 |
| P1-3 | 21 个依赖从未被 import | `@dnd-kit/*`、`@mdxeditor/editor`、`next-auth`、`next-intl`、`@tanstack/react-query`、`recharts` 系、`zod`、`zustand`、`z-ai-web-dev-sdk`、`prisma`、`sharp` 等 | 安装慢、依赖面大；清理时**必须同步重生成 `bun.lock`**，否则 `--frozen-lockfile` 会红 |
| P1-4 | 48 个 shadcn 组件只用了 16 个 | 32 个未引用：`alert-dialog` / `calendar` / `carousel` / `chart` / `command` / `sidebar` / `table` / `tabs` … | 仓库噪声；删除前需确认 `components.json` 与 `globals.css` 无隐式依赖 |
| P1-5 | 生成环境残留配置 | `next.config.ts` 的 `allowedDevOrigins: ["https://*.space-z.ai"]`、`reactStrictMode: false` | 前者与项目无关；后者掩盖并发/副作用问题 |
| P1-6 | 构建依赖外网字体 | `layout.tsx` 用 `next/font/google` 的 Geist / Geist_Mono，`next build` 需访问 `fonts.googleapis.com` | 离线或受限网络下构建失败；可改本地字体或自托管 |
| P1-7 | 顶层无 `LICENSE` | 只有 `axp/LICENSE` | GitHub 不识别仓库许可证，影响开源可复用性 |
| P1-8 | 路径前缀校验不够严 | `readDocContent` 用 `abs.startsWith(AXP_ROOT)`，未带路径分隔符 | 白名单已挡住，风险低，但应写成 `abs === AXP_ROOT \|\| abs.startsWith(AXP_ROOT + path.sep)` |
| P1-9 | 文档库有无效重渲染 | `library-section.tsx` 的 `fetchDoc` 依赖整个 `content` 对象，每次拉取后回调链重建并重复触发 `useEffect` | 不致命，但列表长时会有多余请求与渲染 |
| P1-10 | 硬编码数字会漂移 | `src/components/axp/data.ts` 里 `validatorTests: 31` / `crossCheck: 43` / `specFiles: 9` 等写死；`axp-server.ts` 的 stats 同样写死 | 规范或测试数量变化后，站点数字和文档库清单不会自动同步 |
| P1-11 | 路线图口径不一致 | 站点 `ROADMAP` 把 M2 标 `done`，顶层 README 写 "M2 ✅（Node）/ ⚠️（Android 骨架）" | 对外表述应统一 |

### P2 · 规范项目与真机侧剩余（不是缺陷，是路线图）

| # | 任务 | 现状 |
|---|---|---|
| P2-1 | M3 真机 `axp://` 域适配器 | 规范 + `04-domains` 示例 + 教程齐备，`HostBridge.surface()` 真机实现待补 |
| P2-2 | M4 Shizuku L3 通道 | `gradient` 选择算法已在 `runtime/` 实现，真实提权通道待接 |
| P2-3 | M6 真实 APK v3 证书链 | `runtime/` 的 `dev` 策略只校验 publisher 格式；`strict` 需真实证书，示例指纹仍是 64 个 `0` |
| P2-4 | Android/Kotlin 骨架编译验证 | `reference-host/android/` 为源码骨架，本环境无 Android SDK / Gradle |
| P2-5 | T2–T7 实现体执行 | `runtime/` 只执行 T1 `impl.js`，其余按规范降级为 `unsupported` / `unavailable`（规范行为，不是缺陷） |
| P2-6 | M7 宿主合规认证与第三方生态 | 未启动 |

---

## 4. 本轮已修 / 未修

### 已修（低风险、可静态验证）

| 改动 | 文件 |
|---|---|
| `outputFileTracingIncludes` 把 `axp/**/*` 纳入 standalone 追踪 | `next.config.ts` |
| `build` 脚本追加 `cp -r axp .next/standalone/`，版本号 → `1.0.4` | `package.json` |
| 新增 `web-build` job：`bun run build` + 产物自检 `node scripts/site-check.mjs` | `.github/workflows/ci.yml` |
| 新增零依赖产物自检脚本 | `scripts/site-check.mjs` |
| 顶层 `LICENSE`（MIT） | `LICENSE` |
| `readDocContent` 路径前缀校验加固 | `src/lib/axp-server.ts` |
| 移除 `allowedDevOrigins` 残留、补注释 | `next.config.ts` |
| 文档：`AUDIT.md` / `ROADMAP-ALL-TASKS.md` / `PATCHES.md`，顶层 README 与 CHANGELOG 同步 | 多处 |

### 明确**没有**动的部分及原因

- **没有删依赖 / 没删 shadcn 组件 / 没删 Prisma**：任何 `package.json` 依赖变更都必须同步重生成 `bun.lock`，否则 CI 的 `--frozen-lockfile` 会失败。本环境无 Bun，贸然修改等于把用户 CI 弄红。列在任务清单里作为一个独立、需重新生成 lock 的任务。
- **没有把 `ignoreBuildErrors` 改成 `false`**：在没有跑过一次真实 `tsc` / `next build` 的前提下改它，可能直接让构建失败。列在 P0-3 的后续动作里：先 build → 修类型错误 → 再置 `false`。
- **没有动 `axp/` 内任何规范、schema、校验器与示例**：那部分是全仓最健康的部分，逐字节保持（仅 CHANGELOG 加 1.0.4 记录）。
- **没有改 `library-section.tsx` 的 hooks 依赖**：涉及 React 运行时行为，未做实测不引入未验证改动。

---

## 5. 你现在该做的三件事

```bash
# 1. 解压本 zip，进入仓库，先跑零依赖自检（应全绿）
node axp/validator/test/run-tests.mjs
python3 axp/validator/test/schema-crosscheck.py
node axp/runtime/test/smoke.mjs
node scripts/site-check.mjs --prebuild

# 2. 在有 Bun 的环境验证站点构建（当前唯一未验证项）
bun install --frozen-lockfile
bun run build
node scripts/site-check.mjs
bun .next/standalone/server.js      # 另开终端 curl /api/doc?path=spec/01-format.md

# 3. 确认无误后提交
git add -A && git commit -m "chore(site): standalone axp data, build gate, audit & task ledger"
git push origin main
```

完整的「一次性全部任务」见 [`ROADMAP-ALL-TASKS.md`](ROADMAP-ALL-TASKS.md)；本轮改动与回滚方法见 [`PATCHES.md`](PATCHES.md)。

---

## 6. 最后一句实话

这不是一个"半成品"仓库：规范、校验器、参考运行时、文档、示例、CI 自检都是真能跑的，v1.0.3 的背压修复也是真修复。扣分几乎全部集中在**站点从"本地能开"到"任何机器都能构建部署"**这一段，以及模板脚手架带来的依赖噪声。把 P0-3 那次真实 build 跑通、再按 `ROADMAP-ALL-TASKS.md` 清一遍依赖，这个仓库就可以对外发布了。

---

## 7. v1.1.0 复核（2026-11-15）

> 基线：远端 `main` 最新快照（已含 v1.0.4，212 个文件）。本轮是**完整克隆后的规范与基础设施补全**，不是对 v1.0.4 审计结论的推翻。
> 克隆方式说明：`git clone` 在本环境返回 403，改用 GitHub 官方 `zipball/main` 归档取得完整快照；远端 HEAD 内容与 v1.0.4 工作副本逐文件一致。

### 7.1 从「工程修补」升级为「规范条款」

| 新增规范性文件 | 解决的原问题 |
|---|---|
| [`axp/spec/10-infrastructure.md`](axp/spec/10-infrastructure.md) | P0-1 standalone 不含 `axp/`、P0-2 CI 不构建 —— 现在写成 §6.3 双保险条款与 §5 五个 job 门禁，并由 `spec-check.mjs` 断言 |
| [`axp/spec/11-conformance.md`](axp/spec/11-conformance.md) | 原「AXP-0…3 只是 README 里一句话」→ 26 条可验证断言、`axp-conformance/1.0` 结果格式、第三方认证流程 |
| [`axp/spec/12-security.md`](axp/spec/12-security.md) | 安全要求散落在 01/04/08 → 编号 S1–S12，逐条映射到校验器错误码 |
| [`axp/spec/13-registry.md`](axp/spec/13-registry.md) | M6「索引格式」只有路线图一句话 → `axp-index/1.0` 完整定义 + session-install 状态机 |
| [`axp/spec/index.json`](axp/spec/index.json) | P1-10 硬编码数字漂移 → 文档清单 / 版本 / 统计 / 错误码 / 断言 ID 的机器可读单一事实源 |
| [`scripts/spec-check.mjs`](scripts/spec-check.mjs) | 上述一切从「文档里写了」变成「一条命令可断言」：212 项检查 |

### 7.2 主规范优化（编辑性，格式语义不变）

| 问题 | 处理 |
|---|---|
| `01-format.md` §8 子章节编号从 8.1 跳到 8.3 | 补 §8.2「校验器与规范的一致性」 |
| 主规范示例用 `axp://vision/screen`，但 13 个标准域里没有 `vision`，也不符合自定义域 `axp://x/<id>/` 格式 | 规范 / `06-ui-vocab` / `03-hot-reload` 示例 / `runtime` 冒烟 / 站点 `data.ts` 统一为 `axp://screen`；`05-domains.md` 新增 §6 归一化勘误；`spec-check` 断言遗留写法零出现 |
| `09-versioning.md` §2 把「新增可选字段」同时标成「向后兼容」和「旧宿主 MUST 拒绝」 | 修正为「格式层不兼容」（严格 `additionalProperties: false` 下旧 schema 必然拒绝）；新增 §7 明确 `specVersion` 与 `formatVersion` 分离 |
| `01` 无文档体系说明，新增 4 章容易被误读为向 `axp.json` 加字段 | 新增 §0.4，明确 `10`–`13` 规定的是规范项目与宿主生态，**不是插件清单字段** |
| §3.1 字段表把 5 个数组写成「六类组件」 | 改为「五类数组组件 + `ui{}` 第六类」 |

### 7.3 基础设施实体落地

| 交付 | 对应任务 |
|---|---|
| [`scripts/spec-check.mjs`](scripts/spec-check.mjs) | 新增一致性门禁（CI `spec-consistency` job） |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) · [`dependabot.yml`](.github/dependabot.yml) | G10 发版、依赖供应链 |
| [`Dockerfile`](Dockerfile) · [`.dockerignore`](.dockerignore) · [`.env.example`](.env.example) | E10 部署文档的代码化部分；构建期断言 `axp/spec/index.json` 存在 |
| [`SECURITY.md`](SECURITY.md) | 漏洞披露策略（对应 S 规则） |
| [`axp/docs/deployment.md`](axp/docs/deployment.md) · [`release.md`](axp/docs/release.md) | E10 / 发布流程 |
| [`axp/conformance/`](axp/conformance/README.md) | 一致性结果模板与用例骨架 |
| CI `docs-links` 扩到全仓、`axp-server.ts` 统计改从 `index.json` 派生 | E06 / D15 |

### 7.4 复核后的状态变化

| 原评级 | 现在 | 理由 |
|---|---|---|
| CI / 构建 / 部署 **C** | **B** | 规范条款 + 5 个 CI job + Dockerfile + 部署/发布文档齐备；**仍扣在 E03 未实测** |
| 依赖与模板清理 **C+** | **C+**（未变） | 刻意未动：改依赖必须重生成 `bun.lock`，本轮无 Bun，见 G05–G08 |
| 文档与教程 **A** | **A** | 13 篇规范章节 + 13 篇教程，全部纳入 `index.json` 与站点文档库 |
| 真机与生态 **进行中** | **进行中（规范侧完成）** | M6/M7 的规范与认证流程已定义，真机实现仍待 F04–F10 |

### 7.5 仍然没做完的（不粉饰）

1. **E03 一次真实 `next build` 依然未跑通** —— 本环境无 Bun 与完整前端依赖。`index.json.buildGateStatus.nextBuildVerified` 如实为 `false`。
2. **G05–G08 依赖清理仍锁着** —— 21 个未使用依赖、32 个未使用 shadcn 组件、Prisma 模板与 `bun.lock` 的 workspace name 都还在；必须在有 Bun 的机器上作为一批处理。
3. **F04 / F05 / F06 / F07** —— 真机域适配器、Shizuku L3、Android 骨架编译、真实 APK v3 证书链。
4. **`conformance/cases/` 用例为空** —— 断言 ID 与结果模板就位，实际用例需第三方宿主实现者补齐。
5. **D16 / D17 / D18 / D19** —— 站点 hooks 优化、锚点深链、报告导出、字体本地化。

完整任务状态见 [`ROADMAP-ALL-TASKS.md`](ROADMAP-ALL-TASKS.md) 末尾的 v1.1.0 增量节。

---

## 8. v1.1.1 复核（2026-11-15）

> 基线：本仓库 v1.1.0（212 文件）解压重放后完整重验。本轮为**站点工程化专项**：`axp/` 规范与工具链零改动，全部扣分项按 [`ROADMAP-ALL-TASKS.md`](ROADMAP-ALL-TASKS.md) §8.1 执行。仓库已迁至 `abysssnare/axp` 并推送，CI 五 job 首跑全绿。

### 8.1 评级变化

| 维度 | v1.1.0 | v1.1.1 | 依据 |
|---|---|---|---|
| CI / 构建 / 部署 | B（E03 未实测） | **A−** | E03 ✅：GitHub Actions `web-build` 真实 `next build` + 产物自检通过；E07/E08/E09 全部落闸（tsc 零错误、lint 零错误零警告、strictMode 实测无 hydration 报错）；扣 A 的原因：`next build` 在本地环境未复跑（由 CI 承担），Android 真机链路仍未动 |
| 依赖与模板清理 | C+ | **A** | G05–G08 ✅：41 依赖移除（68→21）、36 组件删除（48→12）、Prisma / 死配置 `tailwind.config.ts` / `use-mobile` 残留移除、`bun.lock` 重生成且 workspace 名对齐、`--frozen-lockfile` 通过 |
| 交互式站点内容 | A− | **A** | D16 ref 缓存（每文档一次请求）· D17 锚点深链 · D18 报告导出与命令复制；演练场 / 文档库 / 示例验证全链路浏览器实测通过 |

### 8.2 证据

- `bunx tsc --noEmit`：0 错误；`bun run lint`：0 错误 0 警告（恢复 unused-vars / unreachable / fallthrough 等 error 级门禁后首次全绿）
- 自检套件重跑：spec-check 212/212 · site-check 30/30 · validator 31/31 · crosscheck 43/43 · runtime smoke 30/30 · 示例 4/4
- GitHub Actions：首次推送（v1.1.0 基线）CI `success`——`web-build` 内含 `bun run build` 与 standalone 产物自检
- 浏览器端到端（agent-browser）：`/` 渲染 · 示例「验证」按钮返回 `ALL CHECKS PASSED` · 演练场 gradient 预设命中 `GRADIENT_EXCEEDS_PRIVILEGE` · 文档库打开 `spec/01-format.md` 全文渲染 · 无 console / hydration 错误

### 8.3 仍然没做完的（不粉饰）

1. **F04 / F05 / F06 / F07**：真机域适配器、Shizuku L3、Android 骨架编译、真实 APK v3 证书链——需要 Android SDK 与真机。
2. **H14**：`conformance/cases/` 实际用例仍为空。
3. **F08**：示例 `publisher` 仍是 64 个 `0` 的占位指纹。
4. **本地未跑 `next build`**：按沙箱约束本机不执行生产构建，构建验证由 CI `web-build` job 承担（已通过）；`buildGateStatus.nextBuildVerified: true` 即以此为据。

完整任务状态见 [`ROADMAP-ALL-TASKS.md`](ROADMAP-ALL-TASKS.md) §v1.1.1 增量节。
