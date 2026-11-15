# 参考运行时指南：把规范跑起来，再搬到 Android

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本指南面向**宿主开发者**：先用 [`../runtime`](../runtime) 这个可运行的 Node 参考宿主把规范语义跑一遍，再按 [`integration-guide.md`](integration-guide.md) 与 [`../reference-host/android`](../reference-host/android) 把同样的语义搬到真机。

## 前置条件

| 项 | 要求 |
|---|---|
| Node.js | 18+（参考运行时、校验器、CLI） |
| Python | 3.x + `jsonschema>=4.18`（仅交叉复核用） |
| Android Studio | 仅当你要编译 `reference-host/android` |

不需要 npm install：运行时工具链零依赖。

## 步骤 1 · 一键跑通

```bash
node validator/test/run-tests.mjs            # 31 条：4 个正面示例 + 25 条负面规则 + 边界用例
python3 validator/test/schema-crosscheck.py  # 43 项：Python jsonschema 独立交叉复核（区分 schema 层 / 业务层）
node runtime/test/smoke.mjs                 # 30 条：端到端断言
```

`smoke.mjs` 会真实装载 `examples/` 下三个插件，依次验证：装载 → 工具调用与权限梯度 → Surface 增量与 UI 绑定 → UI 动作 → 热替换 → 拒绝越权 → 回滚 → 严格签名。全部断言通过后输出 `ALL 30 ASSERTIONS PASSED`。

## 步骤 2 · 读懂每段测试对应规范哪一条

| 测试段 | 验证的字段 | 规范位置 |
|---|---|---|
| `[1] load` | `axp.json`、9 步流水线、整包拒绝 | [`../spec/01-format.md`](../spec/01-format.md) §8 |
| `[2] gradient` | `tools[].gradient`、`sideEffects`、`confirm`、多实现路径 | §5.1 / §6.2 / [`../spec/03-impl-reference.md`](../spec/03-impl-reference.md) §2 |
| `[3] surface` | `surfaces[].watchable`、`ui.bind`、`events[].filter`、背压 | §5.2 / §5.5 / [`../spec/05-domains.md`](../spec/05-domains.md) §3 |
| `[4] ui.actions` | `actions[].tool` 引用本包工具 | §5.6 / [`../spec/06-ui-vocab.md`](../spec/06-ui-vocab.md) §3 |
| `[5] hot reload` | `hotReload` 全字段、状态迁移、`state.preserve`、生命周期顺序 | §7 / [`../spec/08-hot-reload.md`](../spec/08-hot-reload.md) §2 |
| `[6] rejections` | 提权、换证书、新增组件被拒 | `08` §3.3 |
| `[7] rollback` | `rollback.keep`、回滚也验签 | `08` §3.5 |
| `[8] signature` | `dev` / `strict` 策略边界 | §9 / [`../runtime/README.md`](../runtime/README.md) |

**看代码比看表格快**：`runtime/src/loader.mjs` 顶部注释标了每一步对应规范 §8 的第几步；`hotreload.mjs` 的 `phase()` 调用顺序就是 `08` §2 的状态机。

## 步骤 3 · 三个必须理解的行为

### 3.1 `gradient` 会按「实现可用性」再降级

示例 `03-hot-reload` 的 `screen.tap` 在 L3 声明了 `bin` + `js` 两条实现路径。参考运行时不支持 `bin`，于是按 [`../spec/03-impl-reference.md`](../spec/03-impl-reference.md) §2 跳过它、选中同层的 `js`；宿主只授权到 L2 时，则整层降级到 L2 的无障碍实现。

```js
const host = new AxpHost({ privileges: ['L0','L1','L2','L3'] });
host.load('examples/03-hot-reload');
host.invoke('com.example.autopay', 'screen.tap', {}, { confirmed: true });
// → { ok: true, layer: 'L3', result: { via: 'L3/shell-fallback' } }
```

**实现要点**：选择算法是「先按权限层从高到低，再在该层内过滤宿主支持的形态」，不是「看到不支持的形态就整体失败」。

### 3.2 `allowDynamicCode: false` 不拦热加载

校验器与运行时都按 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) §5 区分两件事：

| 场景 | 结果 |
|---|---|
| 网络未签名代码 | ❌ 禁止 |
| 可信源、已签名、每次验签的实现体替换 | ✅ 允许 |

`smoke.mjs` 专门有一条断言确认 `03-hot-reload` 在 `allowDynamicCode: false` 下仍能通过校验。

### 3.3 热加载的四条硬拒绝

`runtime/src/signature.mjs` 的 `verifyReplace()` 每次替换都检查：publisher 一致、`id` 不变、`privilege` / `requests` 不扩大、组件 id 集合 ⊆ 旧包、`axp` 格式版本不变。任一不满足即 `REJECTED`，旧版本保持可用。

## 步骤 4 · 把语义搬到 Android

| Node 参考实现 | Android 落点 | Android 特有的坑 |
|---|---|---|
| `vm` 上下文执行 `impl.js` | QuickJS / Hermes，`HostBridge.selectImpl()` | 脚本引擎需与宿主进程隔离 |
| `SurfaceBus` 内存订阅 | `HostBridge.surface()` + 无障碍 / 通知监听 | 需要真实 L1/L2 授权 |
| `UiRuntime` 内存节点树 | `UiRuntime.kt` + Compose | `uiRebuild` 要按 `recompose / recreate-activity / restart-host` 分档 |
| `hotreload.mjs` 状态机 | `HotReloadAgent.kt` | **必须** `IsolatedLoader` 每代新 `InMemoryDexClassLoader` |
| `signature.mjs` dev/strict | `HostBridge.verifySignature()` | 生产必须接真实 APK Signature Scheme v3 |

**最重要的差异**：Node 里换实现体只是换文件引用；Android 里 dex 一旦进了宿主 `PathClassLoader` 就永远卸不掉。所以 `hotReload.classloader: "isolated"` 在 schema 里是启用的硬条件，在 [`../reference-host/android/host/src/main/kotlin/dev/axp/host/IsolatedLoader.kt`](../reference-host/android/host/src/main/kotlin/dev/axp/host/IsolatedLoader.kt) 里是每代一个新加载器、保留 `rollback.keep` 代快照。

## 步骤 5 · 写你自己的 HostBridge

最小可运行形状（完整 10 步见 [`integration-guide.md`](integration-guide.md)）：

```kotlin
class MyBridge : HostBridge {
    override fun readManifest(b: AxpBundle) = json.decodeFromString<AxpManifest>(
        File(b.dir, "axp.json").readText())
    override fun verifySignature(b: AxpBundle, expected: String) =
        apkV3.verify(b, expected)              // 生产必须真验签
    override fun grantedPrivileges() = setOf(Privilege.L0, Privilege.L1, Privilege.L2)
    override fun selectImpl(impl: Impl, layer: Privilege) = quickJsHandle(impl.js)
    override fun runtimeService(name: String, req: JsonObject) = dispatch(name, req)
    override fun surface(uri: String) = realSurface(uri)
    override fun mountUi(m: AxpManifest, p: PanelNode) = composePanel(p)
}
```

接口里**没有任何外部协议类型**——进程怎么通信、消息怎么序列化，是你自己的实现细节。这正是 AXP 作为同级独立格式的边界。

## 验证

- [ ] `node runtime/test/smoke.mjs` 输出 `ALL 30 ASSERTIONS PASSED`
- [ ] `python3 validator/test/schema-crosscheck.py` 输出 `43 passed, 0 failed`
- [ ] 修改 `examples/03-hot-reload/axp.json` 的 `hotReload.signature` 为 `on-install` → `run-tests.mjs` 捕获 `HOT_SIGNATURE_POLICY`
- [ ] 把 `AxpHost({ privileges: ['L0','L1','L2'] })` 跑一遍 → `gradient` 日志显示 `layer: L2`
- [ ] 在 Android Studio 里打开 `reference-host/android`，`:host:testDebugUnitTest` 通过（骨架级纯逻辑测试）

## 常见错误

| 现象 | 原因 | 处理 |
|---|---|---|
| `gradient` 永远选到 L0 | 宿主上限算成了 `min(所有已授权层)` | 取 `max(已授权层)` 再与 `capabilities.privilege` 取 min |
| Surface 推了但 UI 不刷新 | `bind[].from` 的 Surface 未 `watchable: true` | 打开 `watchable` |
| 连续两次 publish 第二次丢了 | 背压节流（参考运行时 60Hz） | 合并 delta 或降低频率 |
| 热替换报 `HOT_TARGET_MISMATCH` | 变更组件前缀不在 `targets` 内 | 加前缀或缩小替换范围 |
| `onReload` 抛错但界面停在半新半旧 | 没启用 `rollback.onError` | 打开，且回滚也要验签 |
| Android 热加载后旧 dex 不释放 | 用了共享 `PathClassLoader` | 改 `IsolatedLoader` |
| 想直接装载别的格式插件 | 定位误解 | 见 [`faq.md`](faq.md)：AXP 宿主只装载 `.axp` 包 |
