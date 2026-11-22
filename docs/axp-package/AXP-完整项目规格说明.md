# AXP 仓库完整规格说明与实证研究

> 研究对象：`Ultra-Guru/axp`，分支 `main`，commit `e4e7de0`（2026-11-15，`chore(site): standalone axp data, build gate, audit & task ledger`）
> 研究方式：完整 clone 后在本地逐文件读取，并实际执行仓库自带的全部零依赖自检
> 研究日期：2026-11-20
> 配套交付：`AXP-v1.0-规范全文合订.md`（9 篇规范正文 + Schema + 错误码表原文）、`AXP-spec-原始文件包.zip`（`axp/spec/` + `axp/docs/` 原始文件）

---

## 0. 结论速览

**这个仓库是「AXP 格式的规范 + 工具链 + 交互式文档站」，不是插件、不是插件市场、不是 Android 宿主 App。**

它把「一个 Android 插件长什么样」写成了 9 篇规范 + 一份严格 JSON Schema，配了零依赖校验器、CLI、一个**用来验证规范语义的 Node 参考运行时**、一份**未编译的 Kotlin 真机骨架**、4 个官方示例插件，以及一个把这些内容全部搬到浏览器里的 Next.js 文档站。

你描述的 7 条里：**格式能力层面大部分成立，工程与生态层面大部分还没落地**。最关键的三处落差是：

1. 目前**没有真正的「命令安装」链路**——`axp install` 是占位命令，规范只声明了三种分发渠道，M6（签名信任链 + 会话安装 + 索引格式）仍是 `⬜ 未开始`；
2. 目前**没有「专属生态」**——0 个第三方宿主、0 个第三方插件、M7 未启动，仓库 0 stars / 0 forks（单提交者、3 次提交）；
3. 仓库**现在就包含 4 个示例插件，而且删不掉**——站点页面、`scripts/site-check.mjs`、CI、31 条行为用例、30 条运行时断言全部依赖它们。若坚持「不能包含示例插件」，正确做法是拆仓，不是删目录。

---

## 1. 实证基线与实测结果

### 1.1 仓库真实构成（clone 后 `git ls-files`，212 个受版本控制的文件）

| 顶层 | 文件数 | 实际内容 |
|---|---:|---|
| `axp/` | 121 | 规范项目本体：9 篇 spec、11 篇 docs、54 个示例文件、17 个 Kotlin 骨架文件、12 个 Node 运行时文件、6 个校验器文件、2 个 CLI、2 个 TS SDK、独立 CI/Issue 模板 |
| `src/` | 72 | Next.js 16 App Router 站点：单页 `/`、`/api/doc`、`/api/validate`、16 个 AXP 章节组件、48 个 shadcn/ui 组件、服务端数据层 |
| 根级文档 | 6 | `README.md` / `AUDIT.md` / `ROADMAP-ALL-TASKS.md` / `PATCHES.md` / `LICENSE` / `.gitignore` |
| 站点配置与脚本 | 11 | `package.json` / `next.config.ts` / `tailwind.config.ts` / `tsconfig.json` / `eslint.config.mjs` / `components.json` / `postcss.config.mjs` / `bun.lock` / `scripts/site-check.mjs` / `.github/workflows/ci.yml` / `prisma/schema.prisma`（模板残留） |
| `public/` | 2 | `logo.svg` / `robots.txt` |

`axp/` 内部再拆一层：

```
axp/spec/        9   01-format 主规范 · 02 schema.json · 03 impl · 04 权限 · 05 域
                      · 06 UI 词汇 · 07 表达映射(验收材料) · 08 热加载 · 09 版本
axp/docs/        11  集成 / 插件入门 / UI / 热加载 / 感知域 / 运行时 / CLI / 自检表
                      / FAQ / 文档模板 / 开仓库指南
axp/examples/    54  01-hello · 02-ui-panel · 03-hot-reload · 04-domains
axp/validator/    6  零依赖 validate.mjs + 31 条行为用例 + 43 项 Python 交叉复核
axp/cli/          2  axp.mjs + package.json
axp/runtime/     12  Node 参考宿主（声明 AXP-3）+ 30 条 smoke 断言
axp/sdk/sdk-js/   2  index.d.ts + package.json
axp/reference-host/ 17  Kotlin/Gradle 真机骨架（源码，未编译验证）
```

### 1.2 我实际跑过的检查（全部在 clone 副本上执行）

| 检查 | 命令 | 结果 |
|---|---|---|
| 4 个示例清单校验 | `node axp/validator/src/validate.mjs axp/examples/*/` | **4/4 全绿** |
| 行为用例 | `node axp/validator/test/run-tests.mjs` | **31/31 passed** |
| 独立引擎交叉复核 | `python3 axp/validator/test/schema-crosscheck.py` | **43/43 passed**（Python jsonschema, draft 2020-12） |
| 参考运行时端到端 | `node axp/runtime/test/smoke.mjs` | **30/30 assertions passed** |
| 站点构建前数据完整性 | `node scripts/site-check.mjs --prebuild` | **22 项通过，0 失败** |

README 徽章 `31+43+30+4` **没有虚标**。规范、Schema、校验器、参考运行时这一层是实打实能跑的，这是全仓最健康的部分。

### 1.3 唯一没能替你确认的一项（必须如实说明）

`AUDIT.md` 把「一次真实 `next build`」列为 P0 未验证项（E03）。我尝试补上这一刀，但**依赖安装被网络策略挡住**：

- `bun install --frozen-lockfile` → `registry.npmjs.com` 大量包返回 **403**（`next@16.1.3`、`react@19.2.3`、`lucide-react`、SWC/oxide 原生包等）；
- 换 `npm install --registry=https://registry.npmmirror.com` → 同样 **403**；
- 因此 `bun run build` 报 `next: command not found`，`node scripts/site-check.mjs`（standalone 自检）报「未找到 `.next/standalone/`」。

所以：**代码里已经补齐了构建门禁**（`next.config.ts` 的 `outputFileTracingIncludes`、`build` 脚本 `cp -r axp .next/standalone/`、CI 新增 `web-build` job），但「站点一定能构建」仍属于**未被实测的推断**。你需要在能联网的机器或 GitHub Actions 上跑一次并留日志：

```bash
bun install --frozen-lockfile
bun run build
node scripts/site-check.mjs
```

顺带提示：`next.config.ts` 目前 `typescript.ignoreBuildErrors: true`、`reactStrictMode: false`，ESLint 多项规则关闭；`layout.tsx` 用 `next/font/google` 拉 Geist 字体，离线构建会失败。这四项都在任务总账里（E07 / E08 / E09 / D19）。

---

## 2. 逐条核对你说的 7 点

| # | 你的说法 | 判定 | 证据与缺口 |
|---|---|---|---|
| 1 | 可以像 MCP / Claude Skills / OpenCode / DSH 一样命令安装等多种方式 | **⚠️ 规范有设想，工程没实现** | 规范只定义 `distribution.channel` 三枚举：`session-install` / `trusted-channel` / `preinstall`（`01-format.md` §9、`02-manifest.schema.json`）。CLI 的 `axp install` 是**占位**：`axp/cli/bin/axp.mjs` 第 116 行直接 `fail('install is performed by the Android host (session-install)')`；`cli-reference.md` 也写明「本仓库不含 Android 运行时」。真实可跑的只有 `new / validate / pack / inspect`。对照：MCP 走 `npx -y` / `uvx` / `claude mcp add`，Claude Skills 走 `/plugin install` 或 `~/.claude/skills/` 目录，OpenCode 走 `opencode.json` 的 `plugin` 数组 + Bun 启动时自动安装，DSH 走 profile 配置叠加。AXP 的「命令安装」属于 M6，任务总账 F07 标 `⬜`。 |
| 2 | 独立于 MCP / Skills / OpenCode 生态，拥有专属生态 | **✅ 定位成立 / ❌ 生态尚不存在** | `01-format.md` §0 明确「同级独立规范」：不导入、不转译、不代理、不导出，`07-expression-map.md` 只作为**外部验收材料**证明表达能力覆盖，规范正文不借用外部字段名。「能表达 ≠ 能装载」写进 FAQ。但生态侧：M7「宿主合规认证 + 示例库」`⬜ 未开始`，验收标准是「≥2 个第三方宿主达 AXP-2」；仓库 0 stars / 0 forks / 1 contributor / 3 commits。**目前是「一套格式」，还不是「一个生态」。** |
| 3 | AXP 是 Android 专属，其他平台用不了 | **✅ 规范定位成立，但有一个必须说清的例外** | 强制字段：`minAndroid >= 26`、`abis`（4 种 Android ABI）、`distribution.signatureScheme` 固定 `apk-v3`、L0–L5 通道含 AccessibilityService / Shizuku / Root / 系统签名、13 个 `axp://` 域（screen / notification / logcat / pm / sysprop…）。但仓库里的 **Node 参考运行时不是 Android 应用**，`runtime/README.md` 自己写「不是 Android 应用，不能跑在手机上」，它是「规范的可执行注释」。另外格式本身**没有条款禁止**别人写非 Android 宿主，只是所有原生语义都是 Android 的——所以准确说法是「**为 Android 设计，只有 Android 宿主才用得上全部能力**」。 |
| 4 | 插件点开后有 UI 页面，例如独立成记忆系统，点开显示记忆和储存 | **✅ 格式支持 / ⚠️ 无现成实现** | `ui{}` 是一等组件：`panel` / `widget` / `web` / `activity` / `inject` 五种形态，配 `lifecycle`（onLoad/onReload/onUnload）、`bind`（Surface→UI 节点自动刷新）、`actions`（UI 动作→本包 tool），见 `01-format.md` §5.6 与 `06-ui-vocab.md`。`02-ui-panel` 就是活例子（屏幕节点树绑定到 `ui.panel.tree`）。但：① `ui` **非必填**；② 仓库里**没有记忆系统插件**，也没有 `axp://x/<id>/memory` 这类自定义域示例；③ 真要落地需要宿主实现 Compose UI Runtime（`reference-host/android/UiRuntime.kt` 只是骨架，未编译），且宿主需达 **AXP-2** 才要求 UI 全语义。 |
| 5 | 让用户开发容易一点，多一些文档 | **✅ 这一条做得最足，但还差「真机那一层」** | 已有：9 篇规范 + 11 篇教程（集成 10 步 Kotlin / 插件入门 / UI / 热加载 / 感知域 / 运行时 / CLI / 自检表 / FAQ / 文档模板 / 开仓库）+ 交互式文档站（全文渲染、搜索、交叉链接）+ 校验器演练场（8 个破坏性预设，服务端调真实校验器）+ `axp new` 脚手架 + TS 类型定义 `index.d.ts`。缺口：真机 cookbook（Android Studio 从 0 到装上一个 `.axp`）、可复制的插件 starter 仓库、`impl` T2–T7 的实现示例、错误码排障手册、部署文档（E10）、SDK 只有 `.d.ts` 没有运行时库。 |
| 6 | Agent 可自由使用选择插件 | **⚠️ 只提供了「被选择」的素材，没有选择机制** | 格式侧给了：`tools[].description` / `tools[].cost: fast\|slow`（站点注释明写「供模型做工具选择」）、`knowledge[].progressive` 三级渐进披露、`knowledge[].allowedTools` 激活期白名单、`agents[].tools` 白名单 + `privilege` 上限、`gradient` 按权限自动降级。但**没有**插件发现 / 启用停用 / 优先级 / 自动挑选的注册表与策略字段——这被规范明确划为「宿主实现细节」（`01-format.md` §0.1「不是运行时」、§5.7「调用方式由宿主运行时决定」）。参考运行时里也只有 `registry` 注册 + `invoke(toolId)`，**没有 Agent 决策层**。要落地得在宿主仓补：已装插件清单 → 工具描述注入 → 模型选择 → 权限/确认 → 审计。 |
| 7 | 插件可以不带 UI，纯功能：PDF / Excel 制作、解压压缩、浏览器自动化 | **✅ 格式完全成立 / ⚠️ 仓库无对应实现** | Schema 的 `required` 只有 `axp/id/name/version/minAndroid/abis/capabilities/distribution`，`ui` 不在其中；`01-hello` 就是无 `ui` 的纯 `tools[]` 插件（L0 沙箱 echo）。`impl` 七形态（js / kotlin dex / so / wasm / bin / url / proc）+ `fs.read:<scope>` / `fs.write:<scope>` / `network.egress:<host>` 权限词，足以表达：文件生成类用 `tools + fs.write + bin/proc`（如打包一个 PDF/Excel 生成器二进制），压缩解压用 `tools + fs.read/fs.write + js/bin`，浏览器自动化用 `axp://screen` / `axp://intent` + `proc` 或 `ui.web`。但：① 4 个官方示例**没有一个**是这些场景；② Node 参考运行时**只执行 T1 `impl.js`**，T2–T7 一律 `unsupported` → `unavailable`（`runtime/README.md` §实现体边界）；③ 真机 13 域适配器（F04）未实现。也就是说「能声明」，但「本仓库里跑不起来」。 |

**一句话**：你说的 7 条，是**这套格式想成为的样子**；仓库交付的是**让这套格式可被定义、可被校验、可被教学的地基**。中间缺的是 Android 宿主、分发链路和第三方插件三块。

---

## 3. 「这个仓库到底包含什么」/「不能包含示例插件」

### 3.1 一句话边界

**包含**：格式规范、机器可读 Schema、校验器、CLI、参考运行时（Node）、真机骨架（Kotlin，未编译）、文档、文档站、CI/审计/任务总账、4 个官方示例。
**不包含**：可安装的 Android APK、可执行的 Android 宿主、插件市场/索引服务、真实 APK v3 证书链、任何第三方插件、QuickJS/Hermes/Shizuku/无障碍服务的实际集成、`axp install` 的真实实现。

`README.md` 自己加了一行很重要的免责：「本仓库内容由 AI 辅助生成，仅作为**规范草案与工程起点**；落地实现前请按 `axp/docs/host-checklist.md` 逐项验证。」

### 3.2 关于「不能包含示例插件」——现状是**必须包含**

我逐个查了依赖，示例插件不是可删的装饰，而是被 5 处硬编码绑住：

| 依赖方 | 具体绑定 |
|---|---|
| `src/lib/axp-server.ts` / `examples-section.tsx` | 站点首页「示例插件」章节直接读 `axp/examples/*/axp.json` 与文件树，并提供「一键验证」 |
| `scripts/site-check.mjs` | `--prebuild` 里 `if (exampleCount !== 4) errors.push(...)`；standalone 自检还硬查 `axp/examples/01-hello/axp.json`、`04-domains/axp.json` |
| `.github/workflows/ci.yml` | `for d in examples/*/; do node validator/src/validate.mjs "$d"; done` + `pack examples/01-hello` |
| `axp/validator/test/run-tests.mjs` | 4 条 positive 用例就是 4 个示例目录（31 条的开头） |
| `axp/runtime/test/smoke.mjs` | 装载 `01-hello` / `02-ui-panel` / `03-hot-reload`，热替换用 `03-hot-reload-v110` |

**直接删 `axp/examples/`：站点示例章节空白、prebuild 自检红、CI 红、31 条用例少 4 条、30 条断言直接崩。**

如果你的意图是「规范仓不该夹带业务插件」，正确做法是**拆仓 + 改名**，而不是删除：

1. 规范仓保留极小的 `test/fixtures/`（1 个最小合法清单 + 若干故意非法的负例），把 31 条 positive 用例改为指向 fixtures；
2. 4 个官方示例整体迁到独立 `axp-examples` 仓，作为「官方示例库」，M7 的「示例库」正好落在这里；
3. 文档站改为构建期从示例仓拉取快照（或 submodule），`site-check.mjs` 的 `exampleCount !== 4` 改成对快照校验；
4. CI 的 `pack` 烟雾测试改用 fixture；
5. `README` / 站点 `data.ts` 里写死的「4 个示例」「31/43/30」改为从 `axp/` 自动推导（任务总账 D15 已经列了这条）。

拆完之后，本仓才干净地等于「**AXP 格式规范 + 参考实现 + 文档**」，而「插件」全部住在别的仓库里——这也正好回答了下一节。

---

## 4. 完整规格摘要（全文见配套《规范全文合订》）

> 以下是 9 篇规范正文的压缩规格；**逐条原文、Schema 全文、错误码表**在 `AXP-v1.0-规范全文合订.md`，原始文件在 `AXP-spec-原始文件包.zip`。

**地位**：独立插件**描述格式**（不是协议、不是桥、不是元格式、不是运行时）。一个插件 = 一个 `.axp` 包（目录态开发 / zip 态分发）+ 包根 `axp.json` 唯一事实源；**未在清单声明的文件一律不执行**。

**清单必填**：`axp:"1.0"`、反向域名 `id`、多语言 `name`、语义化 `version`、`minAndroid>=26`、`abis[]`、`capabilities{privilege,requests}`、`distribution{channel,publisher:sha256:<64hex>,signatureScheme:"apk-v3"}`。`additionalProperties: false`（严格模式，未知字段即拒）。

**六类组件**（全部可选、数组可空）：
`tools[]`（JSON Schema 输入输出 / `sideEffects` / `confirm` / `cost` / `gradient`）· `surfaces[]`（`axp://` URI / `views` / `anchor` / `watchable` / `auth`）· `knowledge[]`（skill/prompt/command/rules + `progressive` + `allowedTools`）· `agents[]`（prompt + 工具白名单 + `maxTurns` + `privilege` 上限）· `events[]`（watchable 流 + filter，或 `lifecycle.*`）· `ui{}`（panel/widget/web/activity/inject + lifecycle/bind/actions）。

**实现层开放**：`impl` 七形态 `js / kotlin(dex#Class) / native(so) / wasm / bin / url / proc`；宿主选择序 `native > kotlin > wasm > bin > js > proc > url`，按 `abis` 与 `requests` 过滤，全不可用则 `unavailable` 不崩。`proc` 只声明「有个进程、怎么拉起」，**不假定任何协议**——这是保持「同级独立」的关键设计。

**Android 原生**：L0 沙箱 → L1 标准权限 → L2 AccessibilityService → L3 Shizuku → L4 Root → L5 系统/仅预装；`gradient` 让同一工具按权限层声明多实现并自动选最高可用层逐级回退；13 个标准域 `fs / screen / app / notification / intent / sensor / clipboard / telephony / logcat / pm / media / net / sysprop`，自定义域前缀 `axp://x/<id>/`；`requests` 为封闭词汇表（含 `fs.read:<scope>` / `fs.write:<scope>` / `network.egress:<host>`，禁止通配符）。

**热加载**：`hotReload{enabled, unit, targets, strategy, signature, sources, state, rollback, uiRebuild, classloader}`；启用时强制 `signature:"on-every-load"`、`classloader:"isolated"`、禁止 `network-unsigned`、不得提权/不得新增组件 id；状态机 `ACTIVE→VERIFYING→STAGING→MIGRATE→SWAPPED`，失败回滚且回滚同样验签。`allowDynamicCode:false` 只禁未签名网络代码，**不误杀**合法热加载。

**装载 9 步**（任一步失败整包拒绝、不部分注册）：解析 → 签名 → 引用完整性 → abis → 依赖闭包 → 权限校验 → 注册组件 → UI 挂载 → 热加载就绪。

**分发**：zip 分发态 + APK Signature Scheme v3 + `distribution.publisher` 发布者指纹；三渠道 `session-install`（默认）/ `trusted-channel` / `preinstall`；**禁止**「任意 URL 拉未签名包即执行」；索引与信任链由宿主实现，不属于格式。

**一致性等级**：AXP-0（tools）→ AXP-1（+surfaces/knowledge）→ AXP-2（+agents/events/ui）→ AXP-3（+L0–L5 梯度 + hotReload 全语义）。Node 参考运行时声明 AXP-3；`docs/host-checklist.md` 是逐项勾选表。

**路线图**：M1 ✅ → M2 ✅（Node）/ ⚠️（Android 骨架未编译）→ M2.5 ✅ → M3 🟡（真机域适配器待补）→ M4 🟡（Shizuku 待接）→ M5 ✅ → **M6 ⬜（分发/签名/索引）** → **M7 ⬜（生态/合规认证）**。

---

## 5. 除了做这个仓库，还要做什么

把「格式」变成「能用的生态」，缺的是下面 5 个仓/产物。按依赖顺序排：

### 5.1 规范仓收尾（本仓内，先做）
- **E03**：在能联网的机器跑一次 `bun install --frozen-lockfile && bun run build && node scripts/site-check.mjs`，贴日志；若失败按日志修类型/字体；
- **E07/E08/E09**：`ignoreBuildErrors` 置 false、恢复 ESLint 关键规则、`reactStrictMode` 置 true；
- **D19**：`next/font/google` 改本地自托管字体，保证断网可构建；
- **G05–G08**：一批清掉 21 个未使用依赖、32 个未用 shadcn 组件、Prisma 模板残留，并**同步重生成 `bun.lock`**（否则 `--frozen-lockfile` 会红）；
- **D14/D15/D16**：站点硬编码统计改自动推导、路线图口径统一、文档库消除无效重渲染；
- **E10 / G10**：补部署文档，打 `spec-v1.0.0` tag 与 Release 产物 `axp-spec-<version>.zip`；
- **拆示例**（见 §3.2）：`examples/` → `test/fixtures/` + 独立示例仓。

### 5.2 Android 宿主仓（**最关键，目前完全缺可运行版本**）
`reference-host/android/` 只有未编译的 Kotlin 骨架，需要补齐成一个真 App：
- 9 步装载流水线接真实 Schema 校验；`HostBridge.verifySignature()` 接 **APK v3 真证书链**（当前 `runtime/` 的 `dev` 策略只校验 publisher 格式，示例指纹还是 64 个 `0`）；
- QuickJS / Hermes 执行 `impl.js` 与 `ui.lifecycle`；`IsolatedLoader` 每代一个新 `InMemoryDexClassLoader` 保证可卸载；
- Compose UI Runtime：解析 `panel.json`、跑 `ui.bind` / `ui.actions` / 三个 lifecycle 回调；
- 13 个 `axp://` 域适配器（F04）、AccessibilityService L2、Shizuku L3、审计日志（F05）；
- T2–T7 实现体至少跑通 `dex` + `bin`（F09）；
- **插件管理页**：安装 / 启用停用 / 权限逐项确认 / 升级回滚 / 插件 UI 入口（你第 4 条「点开插件」就落在这里）；
- **Agent 选择层**：已装插件 → 工具描述 + `cost` + 渐进披露注入 → 模型选择 → `confirm` → 审计（你第 6 条落在这里）；
- 用 `:host:testDebugUnitTest` + `host-checklist.md` 逐项勾到 AXP-2 / AXP-3，并对外声明等级。

### 5.3 分发与信任仓（M6，决定「命令安装」能否成立）
- `session-install` 的真实宿主接口（现在 `axp install` 只是 `fail()` 提示）；
- **插件索引格式**（规范明说「索引与信任链由宿主实现，不属于格式」）——版本、依赖 `requires[].range`、证书指纹、兼容性 `minHost` / `minAndroid` / `abis`；
- 签名/验签服务、证书吊销、更新通道、回滚通道；
- 把 `axp` CLI 发布到 npm / bun，让 `axp new|validate|pack` 变成全局命令；补 `axp install <pkg>`、`axp publish`、`axp update`；
- 插件目录 / 市场（浏览、搜索、安装、评分、安全扫描）；对照 MCP Registry、Claude plugin marketplace、OpenCode ecosystem 的做法。

### 5.4 开发者工具与 starter 仓（对应你第 5 条「开发容易一点」）
- 5 个可复制的插件 starter：**记忆系统**（`ui.panel` + 自定义 `axp://x/<id>/memory` + `fs.write` + `surfaces.watchable`）、**PDF/Excel 生成**、**压缩解压**、**浏览器自动化**（`axp://screen/intent` + `proc`）、**纯工具无 UI 模板**；
- `axp new` 模板从「1 个 echo 工具」升级为按场景生成（带/不带 UI、带/不带热加载、带/不带 gradient）；
- 真机 cookbook、错误码排障手册、T2–T7 实现体示例、Playground 支持下载校验报告（D18）；
- 把 `sdk/sdk-js` 从「只有 `.d.ts`」补成可用的开发库 + 本地模拟器。

### 5.5 第三方插件仓与生态运营（M7）
- 官方示例库独立成仓（§3.2），再引 2 个以上第三方宿主达 AXP-2；
- 宿主合规认证套件（把 `host-checklist.md` 自动化成可跑的 conformance test）；
- spec-change 提案流程真正跑起来（模板已在 `axp/.github/ISSUE_TEMPLATE/spec-change.md`）、版本化文档站、CHANGELOG 与迁移指南。

### 5.6 最小可发布路径（如果只想先跑通闭环）
1. 本仓：`build` 实测 + 清模板残留 + 打 tag/Release；
2. 宿主仓：先做到 **AXP-0/1**（装一个无 UI 的 `.axp`、Agent 能调它的 tool），再补 UI 到 AXP-2；
3. 分发仓：`axp pack` → 真签名 → `session-install` 一条命令装进宿主；
4. 然后才谈记忆系统、PDF/Excel 这类业务插件与「专属生态」。

---

## 6. 证据索引（本仓内可直接查）

| 想确认什么 | 看哪个文件 |
|---|---|
| 定位/边界 | `axp/spec/01-format.md` §0、`axp/docs/faq.md` |
| 清单字段与必填 | `axp/spec/01-format.md` §3、`axp/spec/02-manifest.schema.json` |
| UI 是否可选 | Schema `required` 数组（无 `ui`）；`axp/examples/01-hello/axp.json`（无 ui） |
| 命令安装真相 | `axp/cli/bin/axp.mjs:116`、`axp/docs/cli-reference.md` §`axp install` |
| 表达能力 vs 可装载 | `axp/spec/07-expression-map.md` §0 |
| 权限/文件能力词汇表 | `axp/spec/04-capabilities.md` §2 |
| 实现体只跑 T1 | `axp/runtime/README.md` §实现体边界、`axp/reference-host/README.md` §明确边界 |
| 示例被硬依赖 | `scripts/site-check.mjs`、`src/lib/axp-server.ts`、`.github/workflows/ci.yml`、`axp/validator/test/run-tests.mjs` |
| 完成度与剩余任务 | `AUDIT.md`（P0–P2）、`ROADMAP-ALL-TASKS.md`（A–G 七组） |
| 落地前逐项验证 | `axp/docs/host-checklist.md` |

---

> 本说明基于 clone 到的 `e4e7de0` 与本地实跑结果；站点真实构建因依赖下载受限未能实测，这一项请以你本机 / CI 的 `bun run build` 日志为准。仓库自身定位为「AI 辅助生成的规范草案与工程起点」，生产落地前请按 `host-checklist.md` 逐项验证，尤其是签名、权限梯度、热加载回滚三条安全路径。


---

## 7. 后续演进记录（2026-11-20）

本报告基于原仓库 `e4e7de0` 的**实证结论不变**（它是「规范 + 工具链 + 文档站」，不是插件/市场/宿主 App；`axp install` 是占位；M6/M7 未开始；4 个示例被五处硬绑定）。
按用户后续要求，该基线已推进为三个可跑仓库，规范文档版本升级到 **v1.1.0**：

| 原报告指出的缺口 | 现状 |
|---|---|
| 「不能包含示例插件」 | 已拆仓：规范仓只留 `test/fixtures/`，对外 8 个示例在 `axp-examples/` |
| `axp install` 占位、M6 ⬜ | `spec/10` + 真实 CLI 十步安装、`index.json`、`session-install` 意图 → **M6 ✅** |
| 缺 Android 宿主 | `axp-android-host/`（纯 Java 零依赖 App）→ **AXP-2**，Java core 编译 + 26/26 |
| Agent 选择 / 插件 UI / 储存无契约 | `spec/11` + `spec/16` 补齐注册表、`agent-tools`、`ctx.storage`、UI 入口 |
| 合规靠人工勾选 | `spec/12` C01–C26（Node + Java 双跑）+ `spec/12 §5` S01–S08 静态断言 |
| 文档不够 | 新增 11 篇专章 + 4 个附属 schema + 2 篇 cookbook + 字段全参考 + 错误码总表 + 安全模型 + 治理 |

**唯一未能替你实测的项仍是真实 `next build`**（依赖下载 403），且原始文档站已从规范仓移除，改为规范/示例/宿主三仓；
Android APK 也因本环境无 SDK/Gradle 未能产出，但宿主 core 已真实 `javac` 编译并跑通全量用例。这两点在 `AXP-落地实现总说明.md` 与总索引里如实标注。

详见本套交付的 `README-总索引.md` 与 `AXP-v1.1-规范全文合订.md`。
