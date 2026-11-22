# AXP Android Reference Host（骨架）

> 状态：Draft · 未编译验证
> 适用：AXP v1.x · Android API 26+ · 目标等级 AXP-3
> 最后更新：2026-11-14

## 这是什么

一个 **Kotlin / Gradle 源码骨架**，给出 AXP 宿主在 Android 上的接入形状：9 步装载流水线、`HostBridge` 接缝、权限梯度选择、隔离类加载器、每次替换验签、状态迁移、回滚、Compose 绑定示意。

## 这不是什么

| 不是 | 说明 |
|---|---|
| 可直接运行的 App | 没有 Gradle wrapper，未生成 `local.properties`，也没有签名密钥 |
| 已编译验证的代码 | 本仓库构建环境无 Android SDK / `kotlinc`，CI 不编译此目录 |
| 完整运行时 | 只留接口与关键路径；QuickJS/Hermes 接入、无障碍服务、Shizuku、真实 APK v3 验签需宿主自行实现 |
| 规范的一部分 | 格式规范在 [`../../spec/01-format.md`](../../spec/01-format.md)，本目录只是实现示例 |

## 跑起来需要做什么

```bash
cd reference-host/android
# 1. 用 Android Studio 打开本目录，让它生成 gradle/wrapper/ 与 local.properties
# 2. 确认 SDK 里装了 API 34 + Build-Tools
# 3. ./gradlew :host:testDebugUnitTest
# 4. 按 docs/integration-guide.md 步骤 2 补齐 AndroidManifest 权限与无障碍服务配置
```

## 目录

```
android/
├── settings.gradle.kts / build.gradle.kts / gradle.properties
└── host/
    ├── build.gradle.kts
    └── src/
        ├── main/AndroidManifest.xml
        ├── main/kotlin/dev/axp/host/
        │   ├── AxpModels.kt        清单数据类（与 02-manifest.schema.json 对齐）
        │   ├── AxpHost.kt          HostBridge 接口 + 9 步装载 + gradient 调度
        │   ├── IsolatedLoader.kt   每代一个 InMemoryDexClassLoader，旧代可回收
        │   ├── UiRuntime.kt        panel.json → Compose 绑定 / actions / lifecycle
        │   └── HotReloadAgent.kt   VERIFYING→…→SWAPPED 状态机 + 回滚
        └── test/kotlin/dev/axp/host/AxpHostTest.kt
```

## 与 Node 参考运行时的对应关系

| 规范语义 | Node（可运行） | Android（骨架） |
|---|---|---|
| 9 步装载 | `runtime/src/loader.mjs` | `AxpHost.load()` |
| 组件注册 + gradient | `runtime/src/registry.mjs` | `AxpHost.invoke()` |
| Surface 订阅 | `runtime/src/surfaces.mjs` | `HostBridge.surface()` |
| UI 绑定 / 生命周期 | `runtime/src/ui.mjs` | `UiRuntime` |
| 热加载状态机 | `runtime/src/hotreload.mjs` | `HotReloadAgent` |
| 隔离类加载器 | 不适用（Node vm） | `IsolatedLoader` ★ Android 特有 |
| 签名策略 | `runtime/src/signature.mjs` | `HostBridge.verifySignature()` ★ 需接真 APK v3 |

## 重点看三处

1. **`IsolatedLoader.kt`** —— `hotReload.classloader: "isolated"` 在 Android 上不是可选项：把插件 dex 注入宿主 `PathClassLoader` 就永远卸不掉。每代新 `InMemoryDexClassLoader`，旧代无强引用后 GC 回收。
2. **`HotReloadAgent.kt` §verify** —— 每次替换重新验签，且 `id` / `privilege` / `requests` / 组件 id 集合都不得扩大。热加载**不得用来提权**。
3. **`UiRuntime.kt` §onReload** —— 顺序固定：`state.migrate` → `onUnload` → 组件换 → `uiRebuild` → `onReload` → 界面可见。顺序错了状态就会丢。

详见 [`../../spec/08-hot-reload.md`](../../spec/08-hot-reload.md)、[`../../docs/integration-guide.md`](../../docs/integration-guide.md) 步骤 9。
