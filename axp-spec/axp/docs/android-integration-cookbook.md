# Cookbook · 把已有 Android App 接成 AXP 宿主（I0 半天版）

> 配套 [`21-android-host-integration.md`](../spec/21-android-host-integration.md)。
> 目标：**不重写业务、不发新插件版宿主**，半天跑通「SAF 选一个无 UI 的 `.axp` → 不重启 App 装好 → `agent-tools` 里能看见 → 能调用」。

## 0. 前提

- Android API 26+，已有 App 模块 `:app`；
- 把 `axp-android-host/app/src/main/java/dev/axp/host/core/` 整个拷进你的 `core/` 包（纯 Java、零第三方依赖、不引用任何 Android 类之外的东西）；
- 本档只做 `impl.js`，执行器用 `WebView`（或一个 Rhino/Nashorn 封装），**不需要 dex/so/Shizuku**。

## 1. 加三行 Gradle（其实零依赖）

```gradle
android {
    defaultConfig { minSdk 26 }
    // 若用 R8，加：
    // keep 'dev.axp.host.core.** { *; }'
}
```
`core` 是纯 Java，不引入任何 AAR；`WebView` 是 framework 自带。

## 2. 目录（第一次启动建好）

```kotlin
val axpDir = File(filesDir, "axp").apply {
    File(this, "plugins").mkdirs()
    File(this, "inbox").mkdirs()
    File(this, "storage").mkdirs()
}
val registry = File(axpDir, "registry.json")
val audit    = File(axpDir, "audit.jsonl")     // append-only
```

## 3. 收 `.axp`（H1）

```kotlin
// 与 axp-android-host 同款入口：AxpHost.install(File, dev) 自带解包与 10 §3 十步
val host = AxpApplication.HOST          // 或自建：AxpHost(File(filesDir, "axp"), WebViewJsRunner(this))
val pick = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
    uri ?: return@registerForActivityResult
    val tmp = File(cacheDir, "incoming.axp")
    contentResolver.openInputStream(uri)!!.use { input ->
        tmp.outputStream().use { input.copyTo(it) }
    }
    lifecycleScope.launch(Dispatchers.IO) {
        val r = host.install(tmp, /* dev = */ true)   // .axp 文件直接给 install：内部解包
        withContext(Dispatchers.Main) { showResult(r) }   // 只刷新 UI，不在这跑 impl
    }
}
pick.launch(arrayOf("application/zip", "*/*"))
```

`AxpHost.install`（`dev.axp.host.core.AxpHost`，`app/src/main/java/.../core/AxpHost.java`）内部 `MUST` 跑完 `10 §3` 十步：解包（拒 `..`/绝对路径）→ 复算 digest → publisher 绑定 → 清单严格校验 → abis → 依赖 → **逐项确认 L2+/dangerous** → 写 `registry.json`。任一步失败不写注册表。

> **`dev = true` 只用于开发与 CI**：它跳过 AXP-SIG.json 的生产验签。对来源不明的
> `.axp`（聊天工具传来的、网盘下载的）`MUST NOT` 开 dev；本参考宿主的 strict 路径
> 需接 `apksig` 后才可放开 —— 未接入前生产路径一律 `INSTALL_SIGNATURE_FAILED`
> 拒绝（见 `axp-android-host/README.md` 与 18 §4）。

## 4. 执行一个工具（H3，独立线程）

```kotlin
lifecycleScope.launch(Dispatchers.IO) {
    val ctx = AxpContext(
        storage = NamespacedStorage(File(axpDir, "storage"), pluginId),  // 按 id 隔离
        surface = SurfaceBus, audit = AuditLog(audit), confirm = userConfirmed
    )
    val out = AxpHost.invoke(pluginId, "demo.echo", mapOf("text" to "hi"), ctx)
    withContext(Dispatchers.Main) { render(out) }
}
```

`MUST` 剥离 `export ` 前缀、`MUST` 用 ES5 语法跑、`MUST` 捕获异常转 `IMPL_ERROR`、设超时转 `IMPL_TIMEOUT`。**不要**把这段放 `Dispatchers.Main`。

## 5. 让 Agent 看得见（H5）

```kotlin
val tools = AxpHost.agentTools(registry)   // [{name:"com.example.hello.demo.echo", cost:"fast", available:true}, ...]
```
把 `tools` 喂给模型的工具列表即可。`enabled:false` 的插件不进投影；`implKinds` 里没声明的形态标 `available:false`（别静默丢）。

## 6. 随 APK 发布 `host.json`

把 `assets/axp/host.json` 放进去（`21 §5` 的最小示例，改 `appId` 为你的 applicationId）：

```jsonc
{ "axpHost":"1.0", "appId":"com.mycompany.app", "hostLevel":"AXP-0",
  "hostVersion":"1.0.0", "minAndroid":26, "supportedAbis":["arm64-v8a"],
  "implKinds":["js"], "uiForms":[], "channels":["session-install"],
  "domains":[], "services":{"storage":true,"ui.push":false,"sampling":false,
  "elicitation":false,"audit.read":true}, "signaturePolicy":"dev",
  "ctx":["storage","surface","audit"],
  "conformance":{"suite":"axp-conformance/1.0","passed":0,"failed":0,
                 "notImplemented":["ui.panel","hotReload","apk-v3-strict"]} }
```

`domains:[]` 表示 13 个域都不提供 → 一律回 `DOMAIN_UNAVAILABLE`，**不要**回空字符串。

## 7. 半天验收（I0 退出条件）

```bash
# 在规范仓侧生成插件
node axp/cli/bin/axp.mjs new com.example.hello -o /tmp/hello
node axp/cli/bin/axp.mjs pack /tmp/hello -o hello.axp
node axp/cli/bin/axp.mjs publish /tmp/hello -o index.json
```
1. `adb push hello.axp /sdcard/Download/`；
2. App 里 SAF 选它 → 列表出现 `com.example.hello`，**没重启**；
3. 调 `com.example.hello.demo.echo` 返回回显；
4. 装第二个不同 `id` 的插件，读不到第一个的 `storage`；
5. `kill` 进程再打开 → 插件还在（从 `registry.json` 重建）；
6. 跑 `node axp/tools/spec-lint.mjs --json` → S09 校验的是**参考宿主自带的** `axp-android-host/app/src/main/assets/axp/host.json`；你自己的 App 需另建 host.json 并用同一 schema 单独校验（21 §5.2）。

过了这 6 条，就是合格的 **I0 / AXP-0** 接入。之后按 `21 §12` 第 5–8 步逐级加 surfaces、UI、gradient，宿主 APK **不需要因为加插件再发版**。

## 8. 三条最常见的翻车

- 把 `hello.axp` 放进 `assets/` 打进 APK —— 那就不是热安装了；
- `ctx.storage` 用 `getSharedPreferences("axp", ...)` 全局一份 —— 两个插件串仓；
- `host.json` 写 `hostLevel:"AXP-3"` 但 `notImplemented` 空着 —— S09 / I01 直接打回。
