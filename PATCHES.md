# v1.0.4 · 本轮改动清单与回滚方法

> 状态：Stable
> 基线：`Ultra-Guru/axp` @ `2baeba7`（v1.0.3）
> 本轮性质：**审计 + 低风险工程化修复**。`axp/` 内的规范正文、JSON Schema、校验器、CLI、参考运行时、示例插件**逐字节未改动**（仅 CHANGELOG 追加 1.0.4 段）。

## 1. 改了什么

| # | 文件 | 改动 | 为什么 |
|---|---|---|---|
| 1 | `next.config.ts` | 新增 `outputFileTracingIncludes: { "/**": ["./axp/**/*"] }`；移除 `allowedDevOrigins` 生成环境残留；补注释 | Next.js output file tracing 无法静态追踪 `path.join(process.cwd(), "axp")` 拼接出的运行时路径，standalone 产物默认不含 `axp/` |
| 2 | `package.json` | `build` 脚本末尾追加 `cp -r axp .next/standalone/`；`version` → `1.0.4` | 双保险：把整套规范数据复制进 standalone 部署根，容器化部署时 `/api/doc` 与 `/api/validate` 才能工作 |
| 3 | `.github/workflows/ci.yml` | 新增 `web-build` job：`bun install --frozen-lockfile` → `bun run build` → `node scripts/site-check.mjs` | 此前 CI 从未构建过站点；配合 `ignoreBuildErrors: true` 与近乎全关的 ESLint 规则，质量门禁形同虚设 |
| 4 | `scripts/site-check.mjs` | 新增零依赖产物自检（`--prebuild` / 默认两种模式） | 让「standalone 是否自带 axp/」变成可自动断言的事实，而不是靠人记 |
| 5 | `LICENSE` | 新增顶层 MIT 许可证 | 此前只有 `axp/LICENSE`，GitHub 不识别仓库许可证 |
| 6 | `src/lib/axp-server.ts` | `readDocContent` 前缀校验改为 `abs === AXP_ROOT \|\| abs.startsWith(AXP_ROOT + path.sep)` | 避免 `axp-evil/…` 这类同前缀路径绕过字符串前缀判断（白名单已挡，属纵深防御） |
| 7 | `AUDIT.md` | 新增完成度审计报告 | 逐项给出证据、评分与 P0/P1/P2 问题 |
| 8 | `ROADMAP-ALL-TASKS.md` | 新增一次性全部任务总账 | 全项目任务一次列全，含状态 / 优先级 / 验收标准 / 落点 |
| 9 | `PATCHES.md` | 本文件 | 改动可追溯、可回滚 |
| 10 | `README.md` | 快速开始补 `--prebuild` 与 build 验证；结构树补 `scripts/` / `LICENSE` / 三份新文档；变更记录补 v1.0.4；参考实现状态补审计说明 | 文档与仓库实际一致 |
| 11 | `axp/CHANGELOG.md` | 追加 `[1.0.4]` 段 | 记录站点侧修复，注明规范语义不变 |

## 2. 刻意没改什么（重要）

| 项 | 原因 |
|---|---|
| `package.json` 的 `dependencies` / `bun.lock` | 21 个依赖从未被引用、Prisma 是模板残留，但**任何依赖变更都必须同步重生成 `bun.lock`**，否则 CI 的 `bun install --frozen-lockfile` 会失败。本环境无 Bun，贸然删除等于把仓库弄红。见 `ROADMAP-ALL-TASKS.md` 的 G05–G08。 |
| `typescript.ignoreBuildErrors: true` → `false` | 在没跑过一次真实 `tsc` / `next build` 前改它，可能直接让构建失败。正确顺序：先 build → 修类型错误 → 再置 `false`（任务 E07）。 |
| `eslint.config.mjs` 的规则开关 | 同上，恢复规则前需先修完代码；见任务 E08。 |
| `src/components/ui/` 的 32 个未使用组件 | 删除前需确认 `components.json` / `globals.css` / 动态引用，属于独立清理批次（G06）。 |
| `library-section.tsx` 的 hooks 依赖 | `fetchDoc` 依赖整个 `content` 对象导致无效重建，但涉及 React 运行时行为，未实测不引入改动（D16）。 |
| `axp/` 内的一切 | 全仓最健康的部分，与 v1.0.2 基准逐文件比对仅 2 处有意的 v1.0.3 改动，保持不动。 |

## 3. 未验证项（必须知道）

**本轮没有跑成一次真实的 `next build`。** 本环境不具备 Bun 与完整前端依赖安装条件。因此：

- `web-build` job 是**新增的门禁**，其首次运行结果尚未观测
- `outputFileTracingIncludes` 在 Next.js 16 的顶层配置写法需由首次 build 确认（Next 15.3+ 已从 `experimental` 毕业为顶层配置）
- `layout.tsx` 的 `next/font/google` 在构建时需要访问 `fonts.googleapis.com`；离线环境可能失败（任务 D19）

在有 Bun / 联网的机器上执行以下命令，即可把未知数清零：

```bash
bun install --frozen-lockfile
bun run build
node scripts/site-check.mjs
```

## 4. 怎么应用

本 zip 解压后**已经是修复后的完整仓库**，直接提交即可：

```bash
cd <解压目录>
node scripts/site-check.mjs --prebuild       # 零依赖，应先全绿
node axp/validator/test/run-tests.mjs        # 31/31
python3 axp/validator/test/schema-crosscheck.py   # 43/43
node axp/runtime/test/smoke.mjs             # 30/30

git add -A
git commit -m "chore(site): standalone axp data, build gate, audit & task ledger"
git push origin main
```

> 我没有向你的 GitHub 仓库写入任何内容；push 需要在你自己的账号下完成。

## 5. 怎么回滚

按改动编号单独回滚，互不影响：

| 想撤掉 | 做法 |
|---|---|
| 3（build job） | 删除 `.github/workflows/ci.yml` 中 `web-build:` 整个 job；其余两 job 不变 |
| 2（cp axp） | 把 `package.json` 的 `build` 末尾 ` && cp -r axp .next/standalone/` 去掉；`version` 改回 `1.0.3` |
| 1（file tracing） | 删除 `next.config.ts` 的 `outputFileTracingIncludes` 块；`allowedDevOrigins` 按需恢复 |
| 4 / 5 / 7 / 8 / 9 | 直接删除 `scripts/site-check.mjs` / `LICENSE` / `AUDIT.md` / `ROADMAP-ALL-TASKS.md` / `PATCHES.md`；注意 CI 的 `web-build` job 引用了 `site-check.mjs`，需同时撤掉 3 |
| 6（前缀校验） | 把 `src/lib/axp-server.ts` 的 `readDocContent` 判断改回 `if (!abs.startsWith(AXP_ROOT)) return null;` |
| 10 / 11（文档） | `README.md` / `axp/CHANGELOG.md` 按 diff 回退对应段落 |

完整基线可直接从 GitHub 取回：

```bash
git fetch origin 2baeba72ba150d02854527ab7c2f0a6da32560da
git checkout 2baeba72 -- .
```

## 6. 验证本轮改动是否生效

| 检查 | 期望 |
|---|---|
| `node scripts/site-check.mjs --prebuild` | `PREBUILD CHECK PASSED` |
| `grep -n "outputFileTracingIncludes" next.config.ts` | 有输出 |
| `grep -n "cp -r axp" package.json` | 有输出 |
| `grep -n "web-build" .github/workflows/ci.yml` | 有输出 |
| `git diff --stat axp/` | 只有 `axp/CHANGELOG.md` 一处变化 |
| `bun run build && node scripts/site-check.mjs` | `STANDALONE CHECK PASSED`（待 E03 实测） |

---

## 7. v1.1.0 改动清单与回滚（2026-11-15）

> 基线：远端 `main` 最新快照（已含 v1.0.4）。本轮性质：**完整克隆后的规范补全 + 主规范编辑性优化 + 基础设施实体落地**。
> **格式语义不变**：`axp` 仍为 `"1.0"`，`02-manifest.schema.json` 逐字节未改，4 个示例的清单结构未改（仅 URI 取值归一化）。

### 7.1 新增文件

| 类别 | 文件 |
|---|---|
| 规范章节 | `axp/spec/10-infrastructure.md`、`11-conformance.md`、`12-security.md`、`13-registry.md`、`index.json` |
| 一致性套件 | `axp/conformance/README.md`、`axp/conformance/axp-conformance.template.json` |
| 脚本 | `scripts/spec-check.mjs` |
| 文档 | `axp/docs/deployment.md`、`axp/docs/release.md`、`SECURITY.md` |
| 部署 | `Dockerfile`、`.dockerignore`、`.env.example` |
| CI | `.github/workflows/release.yml`、`.github/dependabot.yml` |

### 7.2 修改文件

| 文件 | 改动 |
|---|---|
| `axp/spec/01-format.md` | 头部状态 / 版本；新增 §0.4 文档体系；§3.1 措辞；§5.2 / §5.6 URI；新增 §8.2；§9 / §11 / §12 / 附录 A 挂接新章节；进度更新到 1.1.0 |
| `axp/spec/05-domains.md` | 新增 §6 v1.1 域归一化勘误 |
| `axp/spec/06-ui-vocab.md` | URI 示例归一化 |
| `axp/spec/09-versioning.md` | §2 兼容规则勘误；§6 发布物补 tag 约束；新增 §7 文档版本与格式版本分离 |
| `axp/examples/03-hot-reload/{axp.json,README.md,ui/panel.json}` | `axp://vision/screen` → `axp://screen` |
| `axp/runtime/{README.md,test/smoke.mjs}` | 同上（4 处 publish + 1 处断言） |
| `src/components/axp/data.ts` | 同上（2 处）；M2 状态改 partial；TOOLCHAIN 新增 `conformance/` 与 `index.json` |
| `src/lib/axp-server.ts` | DOC_META 新增 8 条；`loadSiteData()` 统计改为从 `spec/index.json` 派生 |
| `src/components/axp/sections-format.tsx` | 统计标签「规范正文文件」→「规范文件」 |
| `scripts/site-check.mjs` | DATA_FILES 补 9 项；DOC_PATHS 改为动态扫描 `axp/spec/` |
| `.github/workflows/ci.yml` | 新增 `spec-consistency` job；`docs-links` 扩到全仓并输出链接数 |
| `axp/docs/host-checklist.md` | 新增「规范引用」小节 |
| `package.json` | `version` → `1.1.0` |
| `README.md` / `axp/README.md` | 徽章、结构树、文档索引、自检命令、变更记录、参考实现状态同步 |
| `axp/CHANGELOG.md` | 新增 `[1.1.0]` 段 |
| `AUDIT.md` / `ROADMAP-ALL-TASKS.md` / 本文件 | 追加 v1.1.0 复核 / 增量 / 改动清单 |

### 7.3 刻意未动（与 v1.0.4 相同）

- `package.json` 的 `dependencies` 与 `bun.lock`：任何依赖变更必须同步重生成 lockfile，否则 CI 的 `--frozen-lockfile` 失败。见任务 G05–G08。
- `typescript.ignoreBuildErrors: true`：未跑过真实 `tsc` / `next build` 前不改，见 E03 / E07。
- `eslint.config.mjs` 规则开关、`reactStrictMode: false`：同上。
- `src/components/ui/` 的 32 个未使用组件、`prisma/` 模板、`src/lib/db.ts`：独立清理批次。
- `library-section.tsx` 的 hooks 依赖：涉及 React 运行时行为，未实测不引入改动。
- `02-manifest.schema.json`：**逐字节未改**，schema 语义零变化，43 项双引擎复核仍全绿。

### 7.4 验证结果

| 检查 | 结果 |
|---|---|
| `node scripts/spec-check.mjs` | **212 项通过 / 0 失败** |
| `node scripts/site-check.mjs --prebuild` | 30 项通过，PREBUILD CHECK PASSED |
| 4 个示例 `axp validate` | 4/4 全绿 |
| `run-tests.mjs` | 31/31 |
| `schema-crosscheck.py` | 43/43 |
| `runtime/test/smoke.mjs` | 30/30（URI 归一化后仍全绿） |
| 全仓 Markdown 本地链接 | 0 断链 |

### 7.5 未验证项

**一次真实 `next build` 仍未跑成**：本环境无 Bun 与完整前端依赖安装条件。`web-build` job 首次运行结果需在有 Bun 的机器观测；`spec/index.json` 的 `buildGateStatus.nextBuildVerified` 如实为 `false`。

### 7.6 怎么应用

本 zip 解压后已是修复后的完整仓库：

```bash
cd <解压目录>
node scripts/spec-check.mjs                 # 应先全绿
node scripts/site-check.mjs --prebuild
node axp/validator/test/run-tests.mjs
python3 axp/validator/test/schema-crosscheck.py
node axp/runtime/test/smoke.mjs

git add -A && git commit -m "docs(spec): v1.1.0 infrastructure, conformance, security, registry specs"
git push origin main

# 发版（CI 自动打包 spec zip + SHA256SUMS）
git tag spec-v1.1.0 && git push origin spec-v1.1.0
```

> 我没有向你的 GitHub 仓库写入任何内容；push 与打 tag 需在你自己的账号下完成。

### 7.7 怎么回滚

| 想撤掉 | 做法 |
|---|---|
| 全部 v1.1.0 改动 | 从远端取回 v1.0.4 基线：`git fetch origin e4e7de0 && git checkout e4e7de0 -- .`；或只删除 §7.1 列出的新增文件并回退 §7.2 列出的修改 |
| 仅新增规范章节 | 删除 `axp/spec/10–13-*.md` 与 `spec/index.json`；同时删除 `scripts/spec-check.mjs`，否则 CI 的 `spec-consistency` job 会因缺文件失败 |
| 仅 URI 归一化 | 把 `axp://screen` 在 `01` / `06` / `03-hot-reload` / `runtime` / `data.ts` 中改回 `axp://vision/screen`，并删除 `05-domains.md` §6 与 `spec-check.mjs` 的 URI 回归断言 |
| 仅站点统计派生 | `axp-server.ts` 的 `loadSiteData()` 改回字面量 stats 对象；`sections-format.tsx` 标签改回原文案 |
| 仅 CI 新增 job | 删除 `ci.yml` 中 `spec-consistency:` 整个块；`docs-links` 的 `root` 改回 `axp` |

> 注意：单独回滚 `index.json` 会同时让 `spec-check.mjs`、`axp-server.ts`、Release workflow 失效，需成组回滚。

---

## 8. v1.1.1 改动清单与回滚（2026-11-15）

> 本轮为**站点工程化与质量门禁**专项：规范正文、schema、校验器、CLI、runtime、示例（`axp/`）零改动；仅 `spec/index.json` 的版本 / 构建门禁字段、`axp/CHANGELOG.md`、`axp/docs/deployment.md` 两处现状描述同步更新。仓库迁至 `abysssnare/axp`。

### 8.1 新增

| 文件 | 说明 |
|---|---|
| 依赖 `geist@^1.9.2` | 自托管 Geist Sans / Mono（woff2 随依赖分发），取代 `next/font/google` |

### 8.2 修改

| 文件 | 改动 |
|---|---|
| `src/app/layout.tsx` | 字体导入改 `geist/font/sans` + `geist/font/mono`（D19） |
| `next.config.ts` | `ignoreBuildErrors: false`（E07）· `reactStrictMode: true`（E09） |
| `eslint.config.mjs` | 恢复质量门禁：全局宽松基线 + `src/**` 严格块 + 沙箱目录 ignores（E08） |
| `tsconfig.json` | `exclude` 对齐 `.gitignore`（沙箱目录不入类型检查） |
| `package.json` | 版本 → 1.1.1；移除 41 个未用依赖与 `db:*` 脚本；`build` 脚本不变 |
| `bun.lock` | 重生成；workspace name `nextjs_tailwind_shadcn_ts` → `axp`（G04/G08） |
| `src/components/axp/library-section.tsx` | D16 ref 缓存 + D17 `#library&doc=` 深链 |
| `src/components/axp/examples-section.tsx` | D18 结果面板：下载报告 / 复制 CLI 命令（`cliCommand` prop） |
| `src/components/axp/playground-section.tsx` | D18 复制当前清单；修复 2 处 `possibly undefined` 类型错误（E07 前置） |
| `src/components/axp/axp-site.tsx` / `markdown.tsx` / `sections-android.tsx` | 清理未用导入（E08） |
| `src/hooks/use-toast.ts` | `actionTypes` 改为判别式字面量联合（E08：原写法"只作类型使用"） |
| `scripts/spec-check.mjs` | md 扫描跳过名单与 `.gitignore` 对齐（沙箱目录误报修复） |
| `.env.example` | 移除 `DATABASE_URL` 残留说明，补 `NEXT_TELEMETRY_DISABLED` |
| `axp/spec/index.json` | `specVersion` → 1.1.1；`buildGateStatus`：`nextBuildVerified: true`（CI web-build 留闸）、`ignoreBuildErrors: false` |
| `axp/CHANGELOG.md` / 顶层 `README.md` / `ROADMAP-ALL-TASKS.md` | v1.1.1 条目与状态 |
| `axp/docs/deployment.md` | §5 环境变量（无数据库）、§6 字体自托管现状 |

### 8.3 删除

| 文件 | 说明 |
|---|---|
| `prisma/schema.prisma` · `src/lib/db.ts` | Prisma 模板残留（G07） |
| `tailwind.config.ts` | 死配置：v4 CSS-first 且无 `@config` 引用，从未生效 |
| `src/hooks/use-mobile.ts` | 唯一引用者 `ui/sidebar.tsx` 已删 |
| 36 个 `src/components/ui/*.tsx` | 未被引用的 shadcn 组件（48→12，G06）：alert / alert-dialog / aspect-ratio / avatar / breadcrumb / calendar / carousel / chart / checkbox / command / context-menu / dialog / drawer / dropdown-menu / form / hover-card / input-otp / menubar / navigation-menu / pagination / popover / progress / radio-group / resizable / scroll-area / select / separator / sidebar / skeleton / slider / sonner / table / tabs / textarea / toggle / toggle-group |

### 8.4 验证

```bash
bunx tsc --noEmit        # 0 错误
bun run lint             # 0 错误 0 警告
bun install --frozen-lockfile   # 通过
node scripts/spec-check.mjs      # 212/212
node scripts/site-check.mjs --prebuild   # 30/30
node axp/validator/test/run-tests.mjs    # 31/31
python3 axp/validator/test/schema-crosscheck.py  # 43/43
node axp/runtime/test/smoke.mjs          # 30/30
# GitHub Actions：CI 五 job（含 web-build 真实 next build）首跑全绿
```

### 8.5 怎么回滚

| 想撤掉 | 做法 |
|---|---|
| 全部 v1.1.1 | `git revert` 对应提交，或 `git checkout <v1.1.0-commit> -- .` |
| 依赖清理 | 恢复 `package.json` 旧依赖清单后**必须** `bun install` 重生成 `bun.lock`（否则 `--frozen-lockfile` 红）；恢复被删的 `src/components/ui/*` 与 `prisma/` |
| 质量门禁 | `next.config.ts` 两开关回 true/false；`eslint.config.mjs` 回宽松版 |
| 字体 | `layout.tsx` 改回 `next/font/google` 并移除 `geist` 依赖 |
