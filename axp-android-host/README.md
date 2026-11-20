# AXP Android 宿主（axp-android-host）

> **一个真的能装到手机上用的 AXP 宿主 App**：插件列表 → 选 `.axp` 安装 → 权限确认 → 点开插件看到界面 → 输入内容、点按钮、列表自动刷新 → Agent 可选工具。
> 纯 Java + Android framework，**零第三方依赖**（不用 Compose / kotlinx-serialization / QuickJS / Shizuku 也能跑通 AXP-0/1/2）。

## 1. 构建与安装（真机/模拟器）

```
Android Studio Ladybug+ · JDK 17 · Android SDK Platform 35 · minSdk 26
```

```bash
./gradlew :app:assembleDebug
./gradlew :app:installDebug     # adb 可用时
```

工程只用 `android.*` / `java.*` / `org.json`（系统内置）与 `WebView`。
插件 JS 由系统 WebView 的 JS 引擎执行（`WebViewJsRunner`），插件 UI 由 `panel.json` 渲染为原生 View。

## 2. 端到端使用

```bash
# 在示例仓打包（会写 META-INF 摘要 + dev 签名块）
node ../axp-spec/axp/cli/bin/axp.mjs pack ../axp-examples/plugins/05-memory-system -o memory.axp
adb push memory.axp /sdcard/Download/
```

App 内：首页「安装 .axp 插件」→ 选 `memory.axp` → 看到安装结果 → 返回列表 → 点 `com.example.memory` →
**出现「记忆与储存」面板**：输入文字 → 点「记住」 → `memory.add` 写 `ctx.storage` → 发布 `axp://x/com.example.memory/entries` delta → 列表自动刷新；退出重进数据仍在。

`08-browser-automation` 的 `browser.open` 返回结构化 Intent 指令，`AndroidPlatform.dispatch()` 会真的 `startActivity(ACTION_VIEW)` 打开浏览器。

## 3. 架构

| 层 | 目录 | 依赖 | 作用 |
|---|---|---|---|
| **core（纯 Java）** | `app/src/main/java/dev/axp/host/core/` | 仅 `java.*` | JSON、清单校验（与 Node validator 同错误码）、`.axp` 解包与摘要、索引/版本区间、注册表、Agent 工具集、`gradient` 选择、`ctx` 上下文、`ui()` 绑定快照 |
| **platform** | `.../platform/` | `android.*` | WebView JS 引擎、系统 Intent/无障碍桥、验签策略 |
| **ui** | `.../ui/` | `android.*` | 插件列表页、SAF 安装页、插件界面页 |
| **conformance** | `conformance/` | `javax.script`（Nashorn） | 同一张 `spec/12` 用例表在 JVM 上真实编译并运行 |

`core/` 被 Android App 与 `conformance/` **同时编译**，保证「文档说的 = 手机里跑的 = 测试断言的」。

## 4. 一致性自检（不需要 Android SDK）

```bash
cd axp-android-host
java conformance/ConformanceRunner.java \
  "$(pwd)/../axp-spec/axp/test/fixtures" "$(pwd)"
```

`ConformanceRunner` 用 `jdk.compiler` 编译 `core/*.java` + `ConformanceMain.java`（`--release 8`），
再用 Nashorn 执行同一份插件 `impl.js`，跑 C01–C26。输出 `passed/failed` JSON，失败退出码非 0。
Node 侧对应 `node ../axp-spec/axp/tools/conformance.mjs --json`。

## 5. 如实声明的等级与未实现项

| 项 | 状态 |
|---|---|
| 9 步装载 / 校验 / 解包防护 / 摘要 / 注册表 / `session-install` | ✅ AXP-0/1 |
| Surface 订阅 / `ui.bind` 自动刷新 / `ui.actions` / 插件 UI 页 / `agent-tools` / `ctx.storage` 隔离 | ✅ AXP-2 |
| `gradient` 按权限层选实现 | ✅ |
| 真打开网页（结构化 Intent → `ACTION_VIEW`） | ✅ |
| 生产 APK v3 验签 / 证书吊销 | ⚠️ `SignaturePolicy.dev()` 已实现（publisher + digest + scheme）；`strict()` 需接 apksig |
| AccessibilityService L2 / Shizuku L3 真实通道 | ⚠️ `AndroidPlatform.AccessibilityBridge` 接口已留，接入系统服务后 `tap`/`screenText` 生效 |
| 热加载（组件级替换 / 隔离类加载器 / 回滚） | ⬜ 未实现 → **声明 AXP-2，不虚标 AXP-3** |
| T2–T7 实现体 | `js` ✅（WebView）；`bin/proc` 由宿主映射；`dex/so/wasm/url` 标 `unavailable` |

## 6. 三仓关系

`axp-spec/`（规范 + CLI + fixtures） · `axp-examples/`（8 个示例插件 + index.json） · **本仓**（真机宿主）。
规范仓 `docs/cookbook-android-host.md` 有更细的操作说明。
