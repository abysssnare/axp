# 宿主集成教程：把 AXP 接进你的 Android 应用

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本教程面向**宿主开发者**：让一个 Android 应用能够装载、校验、调度 `.axp` 插件，并支持 UI 与热加载。规范依据见 [`../spec/01-format.md`](../spec/01-format.md)，合规自检见 [`host-checklist.md`](host-checklist.md)。

---

## 前置条件

| 项 | 要求 |
|---|---|
| Android | API 26+（`minAndroid` 字段下限） |
| 语言 | Kotlin 1.9+（Java 亦可） |
| JS 引擎 | QuickJS / Hermes 任一，用于 `impl.js` 与 `ui.lifecycle` 回调 |
| 签名 | APK Signature Scheme v3 校验能力 |
| 依赖 | `axp-validator`（CI 侧）、`kotlinx-serialization`、`androidx.compose`（UI 等级 AXP-2+） |
| 权限 | 按插件 `capabilities.requests` 动态申请，见步骤 2 |

> 你**不需要**实现任何外部插件协议、握手或方法表。AXP 只定义声明；通信方式完全由你决定。

---

## 步骤 1 · 引入依赖

```kotlin
// build.gradle.kts (app)
dependencies {
    implementation("androidx.compose.ui:ui:1.6.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
    implementation("com.github.axp:axp-runtime:1.0.0")   // 参考实现，或按本教程自建
}
```

CI 侧把仓库的 `validator/` 作为校验步骤：

```yaml
# .github/workflows/validate-plugins.yml
- run: node validator/src/validate.mjs path/to/plugin
```

---

## 步骤 2 · 声明权限（AndroidManifest）

只声明宿主自身可能用到的最大集合，实际授予由插件清单驱动：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<service
    android:name=".AxpAccessibilityService"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
    android:exported="false">
    <intent-filter>
        <action android:name="android.accessibilityservice.AccessibilityService" />
    </intent-filter>
    <meta-data
        android:name="android.accessibilityservice"
        android:resource="@xml/axp_accessibility_config" />
</service>
```

L3（Shizuku）、L4（root）、L5（系统注入）按需接入，**不要在未授权时提前初始化**。

---

## 步骤 3 · 实现 `HostBridge`

宿主与格式之间的唯一接缝。你只需要实现这 6 个方法：

```kotlin
interface HostBridge {
    /** 1. 读取并解析 axp.json */
    fun readManifest(bundle: AxpBundle): AxpManifest

    /** 2. 校验签名并返回发布者指纹；热加载时每次调用 */
    fun verifySignature(bundle: AxpBundle, expected: String): VerifyResult

    /** 3. 当前已获授权的层集合，如 setOf(L0, L1, L2) */
    fun grantedPrivileges(): Set<Privilege>

    /** 4. 按 impl 选择一个可用实现体（见 spec/03） */
    fun selectImpl(impl: Impl, privilege: Privilege): ImplHandle?

    /** 5. 反向通道：sampling / elicitation / ui.push / audit.read */
    fun runtimeService(name: String, request: JsonObject): JsonElement

    /** 6. Surface 订阅与 UI 挂载 */
    fun surface(uri: String): SurfaceStream
    fun mountUi(manifest: AxpManifest, panel: PanelNode): UiHandle
}
```

**关键点**：`HostBridge` 里没有任何外部协议类型。进程怎么通信、消息怎么序列化，是你自己的实现细节。

---

## 步骤 4 · 装载流水线（9 步）

```kotlin
fun load(bundle: AxpBundle): Result<LoadedPlugin> = runCatching {
    val m = bridge.readManifest(bundle)                       // 1 解析
    SchemaValidator.validate(m, schemaV1)                    // 2 结构校验
    require(bridge.verifySignature(bundle, m.distribution.publisher).ok)  // 3 验签
    ReferenceChecker.check(bundle, m)                        // 4 引用完整性
    AbiChecker.check(bundle, m.abis)                         // 5 abis 一致性
    DependencyResolver.resolve(m.requires)                   // 6 依赖闭包
    PrivilegeGate.check(m, bridge.grantedPrivileges())       // 7 权限校验
    val registry = ComponentRegistry.register(m)             // 8 注册组件
    m.ui?.let { bridge.mountUi(m, UiParser.parse(it.panel)) } // 9 UI 挂载
    if (m.hotReload?.enabled == true) HotReloadAgent.prepare(m.hotReload)
    LoadedPlugin(m, registry)
}
```

任一步失败 `MUST` 整包拒绝，`MUST NOT` 部分注册。错误码见 [`../validator/README.md`](../validator/README.md)。

时序：

```
App ──▶ load(bundle)
          ├─ readManifest ─▶ verifySignature ─▶ schema ─▶ refs ─▶ abis
          ├─ deps ─▶ privilegeGate ─▶ register
          ├─ mountUi ─▶ ui.lifecycle.onLoad
          └─ HotReloadAgent.prepare  (隔离类加载器 + 快照)
```

---

## 步骤 5 · 工具调度与确认

```kotlin
fun invoke(toolId: String, args: JsonObject): JsonObject {
    val tool = registry.tool(toolId) ?: error("TOOL_NOT_FOUND")
    val impl = gradientOrImpl(tool, bridge.grantedPrivileges())  // 见步骤 7
        ?: return JsonObject(mapOf("unavailable" to JsonPrimitive(true)))

    if (tool.confirm || tool.sideEffects == SideEffects.DESTRUCTIVE) {
        require(userConfirm(tool)) { "USER_REJECTED" }
    }
    audit.record(toolId, impl, args)
    return bridge.selectImpl(impl, currentPrivilege)!!.call(args)
}
```

`sideEffects = destructive` 时 `confirm` 强制为 `true`（校验器也会检查）。

---

## 步骤 6 · Surface 订阅与事件

```kotlin
m.surfaces.filter { it.watchable }.forEach { s ->
    bridge.surface(s.uri).collect { delta ->
        m.events.filter { it.on == s.uri && match(it.filter, delta) }
                .forEach { runImpl(it.run) }
        m.ui?.bind?.filter { it.from == s.uri }
                ?.forEach { uiHandle.update(it.to, delta) }
    }
}
```

`ui.bind` 让界面自动刷新，不需要插件自己写刷新逻辑。

---

## 步骤 7 · 权限梯度选择（核心算法）

```kotlin
fun gradientOrImpl(tool: Tool, granted: Set<Privilege>): Impl? {
    val ceiling = minOf(m.capabilities.privilege, granted.maxOrNull() ?: L0)
    for (l in ceiling downTo L0) {
        tool.gradient[l.toString()]?.impl
            ?.let { bridge.selectImpl(it, l)?.let { return it.impl } }
    }
    return tool.impl?.takeIf { bridge.selectImpl(it, ceiling) != null }
}
```

宿主 `MUST` 把每次选用结果写进审计日志。无可用路径时工具标记 `unavailable`，**不要崩**。

---

## 步骤 8 · UI 挂载与数据绑定

```kotlin
val panel = UiParser.parse(m.ui.panel.entry)      // spec/06 节点词汇
val handle = bridge.mountUi(m, panel)

m.ui.bind.forEach { b ->
    require(panel.resolve(b.to) != null) { "UI_BIND_TARGET_MISSING: ${b.to}" }
}
m.ui.actions.forEach { a ->
    require(registry.hasTool(a.tool)) { "UI_ACTION_TOOL_MISSING: ${a.tool}" }
}
m.ui.lifecycle?.onLoad?.let { runScript(it, mapOf("state" to panel.state)) }
```

`ui.actions[].tool` `MUST` 指向本包 `tools[].id`，否则装载失败。

---

## 步骤 9 · 接入热加载

```kotlin
fun applyHotReplace(newBundle: AxpBundle) {
    val cfg = m.hotReload ?: error("HOT_DISABLED")
    require(cfg.enabled) { "HOT_DISABLED" }
    require(cfg.signature == ON_EVERY_LOAD) { "HOT_SIGNATURE_POLICY" }

    // 1 每次替换重新验签（不可复用安装时结果）
    val v = bridge.verifySignature(newBundle, m.distribution.publisher)
    require(v.ok && v.publisher == m.distribution.publisher) { "HOT_SIGNATURE_FAILED" }

    // 2 不得提权、不得新增组件 id
    val nm = bridge.readManifest(newBundle)
    require(nm.id == m.id && nm.capabilities.privilege <= m.capabilities.privilege) {
        "HOT_PRIVILEGE_ESCALATION"
    }
    require(nm.componentIds().all { it in m.componentIds() }) { "HOT_NEW_COMPONENT" }
    require(cfg.targets.any { t -> nm.changedComponents(m).all { c -> c.matches(t) } }) {
        "HOT_TARGET_MISMATCH"
    }

    // 3 隔离类加载器 + 状态迁移
    val loader = IsolatedClassLoader(newBundle)   // 每代一个新实例，旧代可回收
    val state = StateMigrator.migrate(panel.state, cfg.state)

    // 4 卸载旧界面 → 切换 → 重建
    m.ui?.lifecycle?.onUnload?.let { runScript(it, mapOf("state" to panel.state)) }
    registry.swap(nm, loader)
    when (cfg.uiRebuild) {
        RECOMPOSE          -> handle.recompose(UiParser.parse(nm.ui?.panel?.entry), state)
        RECREATE_ACTIVITY  -> activity.recreate(state)
        RESTART_HOST       -> scheduleRestart(state)
    }
    m.ui?.lifecycle?.onReload?.let { runScript(it, mapOf("oldState" to panel.state, "newState" to state)) }

    // 5 失败回滚（回滚同样验签）
}.onFailure { e ->
    if (m.hotReload?.rollback?.onError == true) HotReloadAgent.rollback()
    audit.record("hot-reload", e)
}
```

完整状态机与约束见 [`../spec/08-hot-reload.md`](../spec/08-hot-reload.md)，端到端教程见 [`hot-reload-tutorial.md`](hot-reload-tutorial.md)。

> **边界提醒**：`runtime.allowDynamicCode: false` **不是**拒绝热加载的理由。它禁止的是「网络未签名代码」，热加载是「可信源已签名实现体替换」。校验器 `MUST` 按 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) §5 实现。

---

## 步骤 10 · 接入 CI

```yaml
- name: Validate plugin manifests
  run: |
    for d in plugins/*/; do
      node vendor/axp/validator/src/validate.mjs "$d"
    done
```

发布前用 `axp pack` 生成 `.axp` 并签名：

```bash
node cli/bin/axp.mjs pack plugins/my-plugin -o my-plugin.axp
apksigner sign --v3 --ks release.jks my-plugin.axp
```

---

## 验证

| 检查 | 期望 |
|---|---|
| `node validator/src/validate.mjs test/fixtures/01-hello` | 全绿 |
| 装载 `test/fixtures/02-ui-panel` | 面板出现，`ui.bind` 数据刷新 |
| 装载 `test/fixtures/03-hot-reload` 并执行替换 | 界面更新、state 保留、不重启进程 |
| `node validator/src/validate.mjs test/fixtures/04-domains` | 全绿，8 个标准域 / 5 条 `ui.bind` |
| 故意把 `gradient` 键写成 `L4` 而 `privilege: L2` | 校验失败 `GRADIENT_EXCEEDS_PRIVILEGE` |
| 把 `hotReload.signature` 改成 `on-install` | 校验失败 `HOT_SIGNATURE_POLICY` |

逐项勾选表见 [`host-checklist.md`](host-checklist.md)。

---

## 常见错误

| 现象 | 原因 | 处理 |
|---|---|---|
| 校验报 `CAP_UNKNOWN_REQUEST` | `requests` 用了词汇表外的名字 | 查 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) |
| 热加载后旧 dex 仍占内存 | 用了 `classloader: "shared"` | 改 `isolated`，每代新 `DexClassLoader` |
| `ui.bind` 不刷新 | `from` 指向的 Surface 未 `watchable: true` | 打开 `watchable` |
| 工具在某些机型直接 unavailable | 只有 `native` 实现且 `abis` 不含该架构 | 补 `js` 降级实现 |
| 校验器误杀热加载 | 把 `allowDynamicCode:false` 当成一刀切 | 按 §9 修正判定逻辑 |
| 想直接装载别的格式插件 | 定位误解 | AXP 宿主只装载 `.axp` 包，见 [`faq.md`](faq.md) |


---

## 2026-11 补：直接可用的真机工程

本教程是**规范层**的宿主集成说明（Kotlin/Compose 写法）。
如果你要的是「现在就能 `./gradlew installDebug` 装到手机上」的完整 App，见独立仓 `axp-android-host/`
与 [`cookbook-android-host.md`](cookbook-android-host.md)：纯 Java + Android framework，零第三方依赖，
已实现 AXP-0/1/2 的装载、安装、插件界面、Agent 工具集与 `ctx.storage`。
