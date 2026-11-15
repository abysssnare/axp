# AXP 参考实现总入口

> 状态：Stable（`runtime/`）/ Draft（`android/`）
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本仓库把「规范能不能跑」和「真机怎么落地」分成两处，**单一实现，不重复**：

| 目录 | 是什么 | 状态 |
|---|---|---|
| [`../runtime/`](../runtime/) | **可运行的 Node 参考宿主**（声明等级 AXP-3）：9 步装载、`gradient` 降级、Surface 订阅/背压、UI 绑定、热加载状态机与回滚、dev/strict 签名策略、结构化审计 | ✅ `node runtime/test/smoke.mjs` 30 条端到端断言全绿 |
| [`android/`](android/) | **Kotlin / Gradle 真机骨架**：`HostBridge`、`InMemoryDexClassLoader` 隔离、Compose 绑定示意、`HotReloadAgent` 状态机、纯逻辑单元测试 | ⚠️ 源码骨架，**未在 Android Studio 编译验证**（本仓库环境无 Android SDK / Gradle） |

## 为什么分成两处

`runtime/` 是「规范的可执行注释」——用最少代码把 `spec/01-format.md` 的字段语义跑一遍，让宿主开发者照着实现真机版本；`android/` 是那些语义在 Android 上的落点，重点处理 Node 里不存在的三个硬问题：

1. **dex 一旦进了宿主 `PathClassLoader` 就卸不掉** → `IsolatedLoader.kt` 每代一个新 `InMemoryDexClassLoader`，保留 `rollback.keep` 代快照
2. **生产必须真验签** → `HostBridge.verifySignature()` 接 APK Signature Scheme v3；`runtime/` 的 `dev` 策略只是本地占位
3. **L1/L2 权限是真实系统授权** → `AxpAccessibilityService.kt`、通知监听、Shizuku 通道

对照表见 [`../docs/runtime-guide.md`](../docs/runtime-guide.md) 步骤 4，接入步骤见 [`../docs/integration-guide.md`](../docs/integration-guide.md)，合规自检见 [`../docs/host-checklist.md`](../docs/host-checklist.md)。

## 快速开始

```bash
# 1. 先跑规范语义
node validator/test/run-tests.mjs
python3 validator/test/schema-crosscheck.py
node runtime/test/smoke.mjs

# 2. 再打开真机骨架（需自备 Android Studio / JDK 17）
cd reference-host/android
./gradlew :host:testDebugUnitTest      # 纯逻辑单元测试，不依赖设备
```

## 明确边界

- 两处都**不含**可安装 APK，也不含 QuickJS / apksig / Compose 的二进制依赖。
- `runtime/` 只执行 T1 `impl.js`；T2–T7（`kotlin` / `native` / `wasm` / `bin` / `url` / `proc`）登记为 `unsupported`，按 [`../spec/03-impl-reference.md`](../spec/03-impl-reference.md) §2 降级或标记 `unavailable`。这是规范行为，不是缺陷。
- `runtime/` 的签名是策略级（`dev` 校验 publisher 格式与未提权）；生产 `MUST` 用 `strict` + 真实证书指纹。示例插件的 `publisher` 是 64 个 `0` 的占位值。
- 13 个 `axp://` 标准域的规范定义在 [`../spec/05-domains.md`](../spec/05-domains.md)，用法示例见 [`../examples/04-domains/`](../examples/04-domains/) 与 [`../docs/domains-tutorial.md`](../docs/domains-tutorial.md)；真机域适配器仍待 M3 实现。

## 路线图对应

| 里程碑 | 状态 |
|---|---|
| M2 最小宿主 | ✅ `runtime/` 跑通；`android/` 骨架就位 |
| M2.5 热加载 | ✅ 状态机 / 回滚 / 每次验签在两处都有落点 |
| M3 感知域 | 🟡 规范 + 示例 + 教程就位，真机域适配器待补 |
| M4 提权 | 🟡 `gradient` 选择算法已实现，Shizuku L3 通道待接 |
| M5 全组件 | ✅ `runtime/` 六类组件齐全 |
| M6 分发 | ⬜ 真实签名信任链待接 |
