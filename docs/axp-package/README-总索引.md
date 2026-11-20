# AXP — Agent eXtension Package v1.1.0 · 全套交付（仓内版）

> 交付日期：2026-11-20 · 规范文档版本 **v1.1.0** · 基线 `Ultra-Guru/axp` @ `main/e4e7de0`
> 本目录与其平级的三个仓内目录（`axp-spec/`、`axp-examples/`、`axp-android-host/`）
> 构成 **AXP — Agent eXtension Package**（Android 专属插件描述格式）的完整可运行交付。
> 与仓库现行主树「智能体扩展协议（Agent eXtension Protocol）」是两条并行演进的 AXP 线，见根 `README.md` 的「仓库沿革」。

---

## 1. 先读哪个

| 优先级 | 文件 | 作用 |
|---|---|---|
| 1 | **`AXP-v1.1-规范全文合订.md`** | **规范全文**：`spec/01`–`21` 全量 + 6 个 Schema + 错误码实现说明 + 合规自检表 + 教程 + 3 篇 cookbook，共 43 个文件合订 |
| 2 | **`README-总索引.md`**（本文件） | 交付物地图、验收命令、实测数字、边界说明 |
| 3 | `AXP-落地实现总说明.md` | 三仓怎么来的、怎么真跑、Android 宿主怎么用 |
| 4 | `AXP-完整项目规格说明.md` | 对**原仓库**的实证研究（7 条说法逐条核对、仓库边界、待办清单），含 §7 演进记录 |
| 5 | `AXP-v1.0-规范全文合订.md` | 原仓库 9 篇 spec + 11 篇 docs 的历史原文，留作对照 |
| 6 | `AXP-21-Android接入规范.md` | 21 章单篇（可直接发 Android 团队） |

三个可运行目录（与独立仓库同构，验收命令按仓库根相对路径书写）：

| 目录 | 内容 |
|---|---|
| `/axp-spec/` | 规范主仓（**不含对外示例**）：20 篇 spec 正文 + 6 个 Schema、校验器、真实 CLI、Node 参考运行时、C01–C26 + S01–S09、CI |
| `/axp-examples/` | 独立示例仓：8 个插件（含记忆系统 / PDF-Excel / 压缩解压 / 浏览器自动化）、`index.json`、校验脚本 |
| `/axp-android-host/` | Android 宿主 App（纯 Java 零第三方依赖）：插件列表 / 安装 / 点开 UI / Agent 选择 / WebView 执行 |

> 原交付压缩包中的 `AXP-spec-原始文件包.zip` 与 `AXP-spec-v1.1-仅规范.zip` 两个二进制快照未入仓：
> 前者全文已由 `AXP-v1.0-规范全文合订.md` 覆盖，后者是 `/axp-spec/axp/spec/` 的子集，均可在仓内直接查阅。

---

## 2. 规范结构（v1.1）

```
01-format.md                 唯一规范性正文（§0–§12 未改，§13 为补篇总索引）
02-manifest.schema.json      axp.json 严格 Schema（draft 2020-12）
03 .. 09                     impl / 权限 / 域 / UI 词汇 / 表达映射 / 热加载 / 版本
10-distribution-index.md     .axp 签名块 · index.json · 十步 install · session-install · 吊销   [M6]
11-plugin-management-agent   registry.json · agent-tools 投影 · ctx · 插件 UI 入口
12-host-conformance.md       C01–C26 运行时断言 + S01–S09 静态断言
13-glossary-conventions      规范性层级 · 术语 · axp:// ABNF · 五类版本号 · 一致性声明
14-manifest-reference        21 个顶层字段速查（与 schema 机读比对）
15-ui-dsl.md                 panel 两种形态 · 13 种节点 · 绑定表达式 · 渲染义务
16-host-context.md           ctx 正式契约 · runtimeServices 矩阵 · ES5 基线
17-domains-reference         13 域适配器矩阵 · full/delta · 背压
18-security-model.md         九步攻击面 · T01–T13 · 生产/dev 矩阵 · 审计
19-error-codes.md            唯一规范性错误码总表（73 项 / 7 组）
20-compatibility-governance  v1.x 只做加法 · 宿主协商 · AXP-0..3 矩阵 · 治理
21-android-host-integration  第三方 Android App 接入：五挂钩点 · I0–I3 · host.json · 平台映射 · I01–I10
+ 21-host-capabilities.schema.json（宿主能力声明）
+ 10-index / 15-panel / 16-registry / 16-install-intent / 21-host-capabilities 共 5 个附属 schema
```

**唯一 schema 变更**：`capabilities.runtimeServices` 增加可选值 `storage`（纯加法）。
v1.0 的 4 个原始夹具在当前校验器下仍全部合法（S07 回归断言）。

---

## 3. 全部实测数字

以下检查在 2026-11-20 的准备环境（Node 24 / Python 3.12 / JDK 21）本地真实执行（CI 结果以 PR 检查为准）：

| 检查 | 结果 |
|---|---|
| 校验器行为用例 | **31/31** |
| Python jsonschema 双引擎交叉复核 | **47/47** |
| Node 参考运行时端到端 | **30/30** |
| **规范静态一致性 S01–S09** | **9/9** |
| 分发/安装/Agent/UI/存储 C01–C26（Node） | **26/26** |
| **C01–C26（Java core，`javac --release 8`）** | **26/26**（完整 JDK；裁剪版 JDK 自动回退平台级编译，见 `axp-android-host/conformance/ConformanceRunner.java`） |
| 8 个示例插件清单校验 | **8/8** |
| 全部 `panel.json` 过 `15-panel.schema.json` + id 引用闭合 | **9/9** |
| 全仓 Markdown 相对链接 | **0 断链** |
| 发布前数据完整性 prebuild | **通过** |
| M6 链路 `publish → index → install id@^1.0.0 → agent-tools` | **10 步全通过** |
| `.axp` 打包 → 解包验签 → 安装 | **通过** |
| 记忆系统端到端 `install → invoke → ui` | **写入成功、绑定列表真刷新** |

---

## 4. 怎么验收（在本仓库根执行）

```bash
# ① 规范仓五套自检（零依赖，Node 20+ / Python 3）
cd axp-spec/axp
node validator/test/run-tests.mjs                 # 31/31
python3 validator/test/schema-crosscheck.py       # 47/47（需 pip install jsonschema）
node runtime/test/smoke.mjs                       # 30/30
node tools/conformance.mjs --json                 # 26/26
node tools/spec-lint.mjs --json                   # 9/9
cd ../..

# ② 示例仓
cd axp-examples
node tools/verify.mjs                             # 8/8
cd ..

# ③ Android 宿主 core（不需要 Android SDK；JDK 11+）
java axp-android-host/conformance/ConformanceRunner.java \
  "$(pwd)/axp-spec/axp/test/fixtures" "$(pwd)/axp-android-host"
# -> COMPILE OK / 26 passed / 0 failed
# 注：JDK 15+ 移除了内置 Nashorn，需在 classpath 提供独立实现，例如：
# java -cp "nashorn-core-15.4.jar:asm-9.6.jar:asm-analysis-9.6.jar:asm-commons-9.6.jar:asm-tree-9.6.jar:asm-util-9.6.jar" \
#   axp-android-host/conformance/ConformanceRunner.java <fixtures> <host>
# CI 中该任务固定使用 JDK 11（内置 Nashorn + 完整 --release 8 支持）。

# ④ 真机（需要 Android Studio + SDK + adb）
cd axp-android-host
./gradlew :app:assembleDebug && ./gradlew :app:installDebug
node ../axp-spec/axp/cli/bin/axp.mjs pack ../axp-examples/plugins/05-memory-system -o memory.axp
adb push memory.axp /sdcard/Download/
# App 内：安装 .axp → 返回列表 → 点 com.example.memory → 输入 → 记住 → 列表自动刷新
```

CLI 端到端（本地宿主目录）：

```bash
AXP_HOME=/tmp/axpdemo node axp-spec/axp/cli/bin/axp.mjs install axp-examples/plugins/05-memory-system --dev
AXP_HOME=/tmp/axpdemo node axp-spec/axp/cli/bin/axp.mjs invoke com.example.memory memory.add '{"text":"记住这件事"}'
AXP_HOME=/tmp/axpdemo node axp-spec/axp/cli/bin/axp.mjs ui com.example.memory
# -> ok=true · panel.nodes=6 · bindings.list 含刚写入的条目
```

---

## 5. 三个必须说清的边界

1. **没有产出 APK**。准备环境无 Android SDK / Gradle。
   已做的是把宿主核心抽成纯 Java 并**真实编译跑完 C01–C26**；App 层是零第三方依赖的标准 Gradle 工程，在 Android Studio 打开即可构建。
2. **原始 Next.js 文档站未随本交付入库**。规范/示例/宿主改为三目录交付；本仓库现行树已另有「智能体扩展协议」站点，两者互不影响。
3. **Android 宿主如实声明 AXP-2**，不是 AXP-3。未实现项：生产 APK v3 严格验签（`SignaturePolicy.strict()` 需接 apksig）、AccessibilityService / Shizuku 真通道、热加载（组件级替换 / 隔离类加载器 / 回滚）、T2–T7 中的 `dex/so/wasm/url`。全部列在 `axp-android-host/README.md`，不虚标。

原仓库自身定位是「AI 辅助生成的规范草案与工程起点」；本套把它推进到「规范可互操作 + 工具链可跑 + Android 宿主工程可编译」，但**没有**声称已建成第三方生态或产出可下载 APK。
生产落地前请按 `axp-spec/axp/spec/12` 与 `axp-spec/axp/docs/host-checklist.md` 验证签名、权限梯度、热加载回滚三条安全路径（见 `18-security-model.md` §6）。

---

## 6. 文件清单

```
docs/axp-package/
  README-总索引.md                本文件（按仓内路径适配）
  AXP-v1.1-规范全文合订.md         43 个文件合订（规范全文，含 21 章）
  AXP-21-Android接入规范.md        21 章单篇（直接发 Android 团队）
  AXP-v1.0-规范全文合订.md         原始 9 篇 spec + 附页（历史对照）
  AXP-完整项目规格说明.md           原仓库实证研究 + §7 演进记录
  AXP-落地实现总说明.md             三仓实现说明 + §6 v1.1 + §7 接入契约
axp-spec/                          规范主仓（可运行）
axp-examples/                      示例仓（8 插件）
axp-android-host/                  Android 宿主 App（纯 Java）
```

---

## 7. 第三批增补（21 章 · Android App 接入）

- `21-android-host-integration.md`：五种接入姿态、五个挂钩点、I0–I3 接入档、`host.json` 能力声明、Android 平台映射表、进程/生命周期约束、I01–I10 接入断言、接入步骤清单、反模式。
- `21-host-capabilities.schema.json`：宿主能力声明的机器可读形式（与 `registry.json` 运行态、`axp.json` 插件态严格分离）。
- `docs/android-integration-cookbook.md`：已有 App 半天接成 I0 的可抄 Kotlin 代码。
- 参考宿主已带 `assets/axp/host.json`（AXP-2 如实声明），由 `spec-lint` 的 **S09** 现场校验。

**APK 再澄清一次**：APK 是宿主 App 的安装包（`.apk`，装一次）；插件永远叫 `.axp`（装很多次、可热加载回滚）。
`signatureScheme:"apk-v3"` 只是**借用了 APK Signature Scheme v3 的签名方案名**，不表示插件是 APK；校验 `.axp` 的是宿主 `SignaturePolicy`，不是 `PackageManager`。
