# Cookbook · 把 AXP 宿主装到真机并真的用起来

> 配套工程：`axp-android-host/`（独立仓库，纯 Java + Android framework，**零第三方依赖**）。
> 本文件是「从 0 到点开插件 UI」的最短路径。

## 1. 构建

```
Android Studio (Ladybug+) / JDK 17 / Android SDK Platform 35 / Build Tools 35
minSdk 26 · targetSdk 35
```

```bash
git clone <axp-android-host>
cd axp-android-host
# 用 Android Studio 打开根目录，或命令行：
./gradlew :app:assembleDebug
./gradlew :app:installDebug        # 真机或模拟器需 adb 可用
```

工程只用 `android.*` / `java.*` / `org.json`（Android 内置）与 `WebView`，**不需要** Compose、kotlinx-serialization、QuickJS、Shizuku 依赖即可跑通 AXP-0/1/2。
JS 实现体由 `WebView.evaluateJavascript` 执行（Android 自带 JS 引擎），插件 UI 由 `panel.json` 渲染成原生 View。

## 2. 导入插件（session-install）

1. 在示例仓生成分发包：`axp pack plugins/05-memory-system -o memory.axp`（或用 `axp publish` 写进 `index.json`）。
2. 把 `.axp` 拷到手机（adb push / 文件管理器 / 浏览器下载均可）。
3. App 首页点 **「安装插件」** → SAF 选择该文件。
4. App 重新执行：解包路径校验 → 摘要 → `validator` → 权限确认页 → 写注册表。
   **不信任 CLI 的结论**（`spec/10` §5）。

也可让 CLI 投递：`axp install <dir> --home ~/.axp-host` 会生成 `inbox/<id>.install-intent.json`，宿主扫描 inbox 后走同一流程。

## 3. 点开插件 UI

首页列表里带 `UI` 标记的插件可点开 → `PluginActivity`：

- 解析 `ui/panel.json` 的 `Scaffold/Column/Text/Button/Input/List` 节点；
- 建立 `ui.bind`：`axp://x/<id>/…` 的 delta 自动刷新绑定节点；
- `ui.actions` 的按钮点击直接调用本包 `tools[].id`；
- `lifecycle.onLoad/onReload/onUnload` 按时机执行。

以 `05-memory-system` 为例：输入文字 → 点「记住」 → `memory.add` 写 `ctx.storage` → 发布 `axp://x/com.example.memory/entries` delta → 列表**自动刷新**，退出重进数据仍在（存储在 `filesDir/axp/storage/<id>.json`）。

## 4. Agent 选择插件

宿主 `AgentBroker.visibleTools()` 把已启用插件的工具投影成 `name=<pluginId>.<toolId>` 的扁平清单（含 `description/cost/sideEffects/confirm/available`）。
接入模型时把这份清单作为 function-calling 的 tools 传入；选中后按 `name` 反查插件并调用 `ToolDispatcher.invoke()`。
本工程默认附带一个**本地规则选择器**（按 description 关键字匹配，无需联网/模型），证明链路可用；换成模型只改 `AgentBroker.choose()` 一处。

## 5. 等级与未实现项（如实声明）

| 项 | 状态 |
|---|---|
| 9 步装载 / 校验 / 注册表 / 索引 / session-install | ✅ AXP-0/1 |
| Surface 订阅 / `ui.bind` / `ui.actions` / 插件 UI 页 / `agent-tools` / `ctx.storage` | ✅ AXP-2 |
| `gradient` 选择 | ✅（实现体按层选择） |
| 真机 AccessibilityService / Shizuku L3 | ⚠️ 接口已留，`AndroidPlatform` 返回结构化指令，需接系统服务 |
| 生产 APK v3 验签 / 证书吊销 | ⚠️ `SignaturePolicy.dev()` 已实现（digest + publisher），`strict()` 需接 apksig |
| 热加载（组件级替换 / 隔离类加载器 / 回滚） | ⬜ 未实现，故声明 **AXP-2**，不虚标 AXP-3 |
| T2–T7 实现体 | `js` ✅ · `bin/proc` 由宿主映射 · `dex/so/wasm/url` 标记 `unavailable` |

## 6. 自检

```bash
# 规范侧（Node，任何机器）
cd axp-spec/axp && node tools/conformance.mjs --json

# Android core 侧（纯 JVM，不需要 Android SDK）
cd axp-android-host && java conformance/ConformanceRunner.java
```

两个套件跑的是 `spec/12` 同一张用例表；全绿才能声明对应等级。
