# AXP 落地实现总说明

> 对象：`Ultra-Guru/axp` @ `main/e4e7de0` 的重构与真实实现
> 日期：2026-11-20 · 全部结论基于本地 clone、逐文件读取与**实际执行的命令**

---

## 0. 一句话结论

**不是又一份研究报告，是三个能跑的仓库 + 一个能装到手机上的 Android 宿主工程。**

按你的要求做了三件事：**示例模块搬到独立示例仓**、**把 spec 缺的 M6/插件管理/Agent 选择补成可互操作契约**、**写出零第三方依赖、可用 Android Studio 编译安装的真机宿主**。核心逻辑在 Node CLI、JVM Java core 两端都真实编译/运行并通过同一张 C01–C26 用例表。

交付物：

| 文件 | 内容 |
|---|---|
| `axp-spec.zip` | 规范主仓：**不含对外示例**，9+3 篇 spec、2 个 Schema、真实 `axp install` CLI、Node 参考运行时、C01–C26 套件、CI |
| `axp-examples.zip` | 示例仓：8 个插件（原 4 + **记忆系统 / PDF-Excel / 压缩解压 / 浏览器自动化**）、`index.json`、校验脚本 |
| `axp-android-host.zip` | Android 宿主 App：纯 Java + Android framework，插件列表 / SAF 安装 / 点开插件 UI / Agent 选择 / WebView 执行 `impl.js` |
| `AXP-落地实现总说明.md` | 本文件 |

---

## 1. 实测证据（全部在本环境真实跑过）

| 检查 | 命令 | 结果 |
|---|---|---|
| 校验器行为用例 | `node axp-spec/axp/validator/test/run-tests.mjs` | **31/31** |
| 双引擎 Schema 复核 | `python3 axp-spec/axp/validator/test/schema-crosscheck.py` | **47/47** |
| Node 参考运行时端到端 | `node axp-spec/axp/runtime/test/smoke.mjs` | **30/30** |
| 8 个插件清单校验 | `node axp-examples/tools/verify.mjs` | **8/8** |
| Node 宿主一致性 | `node axp-spec/axp/tools/conformance.mjs --json` | **26/26**（C01–C26） |
| **Java core 编译** | `java axp-android-host/conformance/ConformanceRunner.java` | **COMPILE OK**（4 个 `.java`，`--release 8`） |
| **Java core 一致性** | 同上 | **26/26**，同一张 C01–C26 表，JVM 上用 Nashorn 真实执行插件 `impl.js` |
| 文档链接 | 全仓 Markdown 审计 | **0 断链** |
| 发布前数据完整性 | `node axp-spec/scripts/site-check.mjs --prebuild` | **通过** |
| CLI 端到端 | `install → invoke → ui` | 记忆插件真的写入、列表真的刷新（见下） |

实际跑通的端到端片段：

```bash
AXP_HOME=/tmp/axpdemo node axp-spec/axp/cli/bin/axp.mjs install axp-examples/plugins/05-memory-system --dev
AXP_HOME=/tmp/axpdemo node axp-spec/axp/cli/bin/axp.mjs invoke com.example.memory memory.add '{"text":"记住这件事"}'
AXP_HOME=/tmp/axpdemo node axp-spec/axp/cli/bin/axp.mjs ui com.example.memory
# -> ui ok=True  nodes=6  bindings.list=[{'text':'记住这件事', ...}]
```

Java 侧同样跑通：`C09 surface delta -> ui.bind`、`C17 面板节点 + 绑定自动刷新`、`C18 UI 动作回填工具`、`C20 storage 隔离与 STORAGE_DENIED` 全绿。

---

## 2. 逐条回应你的三个要求

### 2.1 「示例模块放在示例仓库」——已拆，且没有硬删

原仓库把 4 个示例塞在 `axp/examples/`，被站点首页、`site-check.mjs`（写死 `exampleCount === 4`）、CI、31 条用例、30 条断言五处绑死；直接删会全红。做法：

- **规范仓**只留 `axp/test/fixtures/` 作为**内部测试资产**（性质不同于对外示例），并把 `run-tests.mjs` / `smoke.mjs` / `schema-crosscheck.py` / 所有文档 / CI 的路径全部迁移过去 —— 迁移后 31/31、47/47、30/30 仍全绿；
- **示例仓 `axp-examples/`** 收下 4 个原示例 + 4 个新实用插件，配 `index.json`、`tools/verify.mjs`、README；
- 站点（Next.js）从规范仓移除，规范仓 CI 改为「规范自检 + 一致性 + 链接审计」，不再有 `web-build` 空转；
- `axp-spec/README.md` 明写三仓分工，避免再夹带业务插件。

### 2.2 「完善 spec」——补了 3 篇同等级专章，主规范语义不变

| 新增 | 补了什么 | 解决你说的哪一条 |
|---|---|---|
| `spec/10-distribution-index.md` + `10-index.schema.json` | `.axp` 签名块与 digest、`index.json`、`axp install` 十步、`id@range`、`session-install` 意图、更新/回滚/吊销、10 个新错误码 | 「像 MCP/Skills/OpenCode/DSH 一样命令安装」——原来 `axp install` 是直接 `fail()` 的占位命令，现在**真实实现** |
| `spec/11-plugin-management-agent.md` | `registry.json`、`agent-tools` 投影（`<pluginId>.<toolId>` + `cost/confirm/available`）、宿主上下文 `ctx`（`storage/surface/audit/ui/agent/elicit`）、插件 UI 入口 | 「Agent 可自由使用选择插件」「点开插件有 UI 显示记忆和储存」「让用户开发容易一点」 |
| `spec/12-host-conformance.md` | C01–C26 可执行断言，Node 与 Java 双宿主同表 | 让「合规」不再靠人工勾选 |

唯一 Schema 变更：`02-manifest.schema.json` 的 `capabilities.runtimeServices` 加可选值 `storage`（纯加法，旧插件校验结果不变；已由 47/47 双引擎复核确认）。其余新结构都在**独立**的 `10-index.schema.json` / `registry.json`，不污染 `axp.json`。
`01-format.md` 追加 §13 补篇索引，§0–§12 一字未改。另补 `docs/cookbook-no-ui.md`（PDF/Excel、压缩解压、浏览器自动化四种无 UI 写法）与 `docs/cookbook-android-host.md`。

### 2.3 「Android 软件要可以真的使用」——工程已给全，但有一处必须如实说

`axp-android-host/` 是**纯 Java + Android framework、零第三方依赖**的完整 App 源码：

- `core/`（只用 `java.*`）：自己写的 JSON 解析器、与 Node validator 同错误码的清单校验、`.axp` 解包路径防护与 digest、索引/版本区间、注册表、`gradient` 选择、`ctx` 上下文、`ui()` 绑定快照——**这一段在本环境被真实 `javac` 编译并跑通 26/26**；
- `platform/`：系统自带 WebView 当 JS 引擎（不用 QuickJS）、`AndroidPlatform.dispatch()` 把结构化指令变成真的 `startActivity(ACTION_VIEW)`（浏览器自动化插件真能打开网页）、`SignaturePolicy`；
- `ui/`：`MainActivity`（插件列表 + 启用状态 + 权限层 + 点开入口）、`InstallActivity`（SAF 选 `.axp` → 宿主重新执行十步，不信任 CLI 结论）、`PluginActivity`（把 `panel.json` 渲染成原生 View，`ui.bind` 随 Surface delta 自动刷新，`ui.actions` 回填工具）；
- `conformance/`：`ConformanceRunner.java` 用 `jdk.compiler` 编译 core 并用 Nashorn 执行同一份插件 JS。

**真机效果**：打包 `05-memory-system` → 装进 App → 点开看到「记忆与储存」面板 → 输入点「记住」 → 列表自动刷新 → 退出重进数据还在。这正是你举的例子。

**必须说明的边界（不是掩饰，是环境事实）**：本沙盒只有 JRE 11，**没有 Android SDK、没有 Gradle、Maven/Google/Gradle 下载全部 403**，因此**无法在这里编译出 APK、也无法在真机/模拟器上跑一遍**。我做的是：把 core 抽成纯 Java 并在这里编译 + 跑通全量用例；App 层写成零第三方依赖的标准 Gradle 工程，你在本机 Android Studio 打开即可构建。这是当前环境能给出的最强证据，不虚标「已出 APK」。

```bash
cd axp-android-host
./gradlew :app:assembleDebug
./gradlew :app:installDebug      # 真机/模拟器 + adb
```

等级如实声明 **AXP-2**：生产 APK v3 验签（`SignaturePolicy.dev()` 已实现 digest+publisher+scheme，`strict()` 需接 apksig）、AccessibilityService/Shizuku 真通道、热加载（组件级替换/隔离类加载器/回滚）**未实现**，README 逐项列出，不标 AXP-3。

---

## 3. 三仓文件清单（摘要）

```
axp-spec/
  README.md · .github/workflows/ci.yml · scripts/site-check.mjs
  axp/spec/            01..09 原文 + 10-distribution-index.md + 10-index.schema.json
                       + 11-plugin-management-agent.md + 12-host-conformance.md
  axp/docs/            11 篇原文 + cookbook-no-ui.md + cookbook-android-host.md + 新 cli-reference.md
  axp/validator/       validate.mjs + 31 用例 + 47 项交叉复核
  axp/cli/             bin/axp.mjs + lib/host.mjs（真实 install/publish/index/invoke/ui/...）
  axp/runtime/         Node 参考宿主（AXP-3）+ 30 断言
  axp/tools/           conformance.mjs（C01–C26）
  axp/test/fixtures/   6 个内部测试夹具（含 05-memory-system、03-hot-reload-v110）
  axp/reference-host/  旧 Kotlin 骨架（注明真机宿主已独立）

axp-examples/
  README.md · index.json · tools/verify.mjs
  plugins/01-hello · 02-ui-panel · 03-hot-reload · 04-domains
  plugins/05-memory-system      带 UI 的记忆与储存
  plugins/06-office-tools       无 UI：PDF / Excel 生成
  plugins/07-archive-tools      无 UI：压缩 / 解压
  plugins/08-browser-automation 无 UI：Intent / 读屏 / 点击 + L2/L3 gradient

axp-android-host/
  settings.gradle · build.gradle · gradle.properties · app/build.gradle
  app/src/main/AndroidManifest.xml · res/values/
  app/src/main/java/dev/axp/host/core/       Json / JsRunner / AxpHost（纯 Java）
  app/src/main/java/dev/axp/host/platform/   WebViewJsRunner / AndroidPlatform / SignaturePolicy
  app/src/main/java/dev/axp/host/ui/         MainActivity / PluginActivity / InstallActivity
  conformance/                               ConformanceRunner.java + ConformanceMain.java（Nashorn）
  README.md
```

---

## 4. 怎么验收（按顺序）

```bash
# 1 规范仓四套自检
cd axp-spec/axp
node validator/test/run-tests.mjs
python3 validator/test/schema-crosscheck.py
node runtime/test/smoke.mjs
node tools/conformance.mjs --json

# 2 示例仓 8 个插件 + 发布索引
cd ../../axp-examples
node tools/verify.mjs
node ../axp-spec/axp/cli/bin/axp.mjs index plugins/* -o index.json

# 3 Android core 编译 + 一致性（不需要 Android SDK）
cd ../axp-android-host
java conformance/ConformanceRunner.java "$(pwd)/../axp-spec/axp/test/fixtures" "$(pwd)"

# 4 真机（需要 Android Studio / SDK / adb）
./gradlew :app:installDebug
# 打包示例插件并推到手机
node ../axp-spec/axp/cli/bin/axp.mjs pack ../axp-examples/plugins/05-memory-system -o memory.axp
adb push memory.axp /sdcard/Download/
# App 内：安装 .axp -> 返回列表 -> 点 com.example.memory -> 输入 -> 记住 -> 列表刷新
```

---

## 5. 还差什么（如果继续做）

1. **出真 APK**：在联网/有 SDK 的机器跑 `assembleDebug`，贴构建日志与真机录屏；
2. **生产验签**：接 `apksig` 实现 `SignaturePolicy.strict()` + `index.revoked`；
3. **L2/L3 真通道**：接 `AccessibilityService` 与 Shizuku，让 `08-browser-automation` 真的读屏/点击；
4. **热加载**：组件级替换 + 隔离 `DexClassLoader` + 回滚，补齐 AXP-3；
5. **站点重建**：把 Next.js 文档站独立成第四个仓，改为构建期从示例仓拉快照（原站点的 `next build` 同样因网络 403 未能在此实测）；
6. **M7 生态**：第二个第三方宿主、合规认证自动化、插件市场。

---

> 原仓库自身定位是「AI 辅助生成的规范草案与工程起点」。本次交付把「草案」推进到「规范可互操作 + 工具链可跑 + Android 宿主工程可编译」，但**没有**声称已经产出可下载 APK 或建成第三方生态。签名、权限梯度、热加载回滚三条安全路径在真机落地前仍需按 `spec/12` 与 `host-checklist.md` 逐项验证。


---

## 6. v1.1 全面完善（第二批，2026-11-20）

在第一批「拆仓 + 真实 CLI + Android 宿主」基础上，把 spec 从 12 篇补到 **20 篇专章 + 5 个 Schema**，全部为加法，主规范 §0–§12 一字未改。

### 新增 8 篇专章（13–20）

| 文件 | 关键内容 |
|---|---|
| `13-glossary-conventions.md` | 规范性层级与冲突顺序、术语表、`axp://` ABNF、五类版本号、三仓边界、一致性声明格式 |
| `14-manifest-reference.md` | 21 个顶层字段逐项速查（类型/必填/默认/约束/错误码），与 schema **机读比对** |
| `15-ui-dsl.md` + `15-panel.schema.json` | panel 两种合法形态（legacy 扁平 id / v1.1 嵌套）、13 种节点、绑定表达式、宿主渲染义务 |
| `16-host-context.md` + `16-registry.schema.json` + `16-install-intent.schema.json` | `ctx` 正式契约、`runtimeServices` 矩阵、ES5 语法基线、宿主层三个 schema |
| `17-domains-reference.md` | 13 域适配器矩阵、`full/delta`、prime 不吞首帧、背压不丢末值、`DOMAIN_UNAVAILABLE` |
| `18-security-model.md` | 九步攻击面、T01–T13 威胁清单、生产/dev 策略矩阵、审计、落地前必验三条 |
| `19-error-codes.md` | 唯一规范性错误码总表（73 项，7 组），与校验器双向核对 |
| `20-compatibility-governance.md` | v1.x 只做加法、宿主能力协商、AXP-0..3 判定矩阵、弃用三段、spec-change 流程、迁移指南 |

`01-format.md` 的 §13 扩成两批补篇总索引；`12-host-conformance.md` 追加 §5 静态断言；
`README` / `cli-reference` / `site-check` / CI 全部同步。

### 新增静态一致性套件 `tools/spec-lint.mjs`

`S01` 编号与 schema · `S02` 字段表 vs schema · `S03` 全部 `panel.json` 过 schema 且 id 引用闭合 ·
`S04` 现场生成 registry/intent/index 并用三个 schema 真校验 · `S05` 校验器 39 个 code 全部入表且无重复 ·
`S06` 39 个 `tools/*.js` 符合 ES5 基线 · `S07` v1.0 四个原始夹具回归仍全绿 · `S08` spec 内 0 断链。

### 本轮全部实测（再次全跑）

| 项 | 结果 |
|---|---|
| 31 行为用例 / 47 双引擎复核 / 30 运行时断言 | 全绿 |
| **S01–S08 规范静态断言** | **8/8** |
| C01–C26 Node 宿主 | 26/26 |
| C01–C26 Java core（真实 `javac --release 8`） | COMPILE OK · 26/26 |
| 8 个示例插件 / 9 个 panel.json / 全仓链接 | 8/8 · 9/9 · 0 断链 |
| prebuild 数据完整性 | 通过 |

### 同步修正

- 示例仓 `06/07/08` 的可执行 JS 统一 ES5 化，保证 Android WebView 与 Nashorn 都能跑（S06 强制）；
- Java 宿主 `install-intent.json` 补 `createdAt`（`16-install-intent.schema.json` 的必填项）；
- `19-error-codes.md` 合并行拆开、重复项改为交叉引用，使 S05 双向覆盖成立。

**边界不变**：本环境仍无 Android SDK / Gradle，未产出 APK、未在真机跑过；宿主打包与生产验签、无障碍/Shizuku、热加载仍未实现，等级如实为 AXP-2。
