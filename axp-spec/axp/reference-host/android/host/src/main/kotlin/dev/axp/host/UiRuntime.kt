package dev.axp.host

import kotlinx.serialization.json.JsonObject

/**
 * UI 绑定 / 动作 / 生命周期 — spec/01-format.md §5.6 / spec/06-ui-vocab.md §6
 * 这里只给契约与顺序；Compose 节点渲染由宿主按 06-ui-vocab.md 的词汇表实现。
 */
class UiRuntime(
    private val plugin: LoadedPlugin,
    private val bridge: HostBridge,
    private val panel: PanelNode,
) {
    private val state = panel.state.toMutableMap()

    fun onLoad() {
        // 1. 数据绑定：Surface 流 → 节点
        for (b in plugin.manifest.ui?.bind.orEmpty()) {
            require(panel.nodes.containsKey(b.to.substringAfter("ui.panel.").substringBefore("."))) {
                "UI_BIND_TARGET_MISSING: ${b.to}"
            }
            val close = bridge.surface(b.from).collect { delta -> plugin.uiHandle?.update(b.to, delta) }
            plugin.surfaceCloses += close
        }
        // 2. 动作引用校验
        for (a in plugin.manifest.ui?.actions.orEmpty()) {
            require(plugin.registry.tool(a.tool) != null) { "UI_ACTION_TOOL_MISSING: ${a.tool}" }
        }
        // 3. 生命周期
        plugin.manifest.ui?.lifecycle?.onLoad?.let { callHook(it, mapOf("state" to state)) }
    }

    /** 顺序固定：state.migrate → onUnload → 组件换 → uiRebuild → onReload → 可见 */
    fun onUnload(oldState: Map<String, Any?>): Map<String, Any?> {
        plugin.manifest.ui?.lifecycle?.onUnload?.let { callHook(it, mapOf("state" to oldState)) }
        plugin.surfaceCloses.forEach { runCatching { it.close() } }
        plugin.surfaceCloses.clear()
        return oldState
    }

    fun onReload(oldState: Map<String, Any?>, newState: Map<String, Any?>, changed: List<String>) {
        val cfg = plugin.manifest.hotReload
        val migrated = StateMigrator.migrate(plugin.dir, cfg?.state, oldState)
        state.clear(); state.putAll(migrated); state.putAll(newState)
        when (cfg?.uiRebuild) {
            "recreate-activity" -> plugin.uiHandle?.recompose(panel, state)  // 宿主应重建 Activity
            "restart-host" -> Unit                                            // 宿主应走 next-session
            else -> plugin.uiHandle?.recompose(panel, state)                  // recompose
        }
        plugin.manifest.ui?.lifecycle?.onReload?.let {
            callHook(it, mapOf("oldState" to oldState, "newState" to state, "changed" to changed))
        }
    }

    private fun callHook(script: String, args: Map<String, Any?>) {
        // 宿主用 QuickJS/Hermes 执行 ui/*.js；此处留接口
    }
}

object StateMigrator {
    /** state.preserve 中的键跳过 map 原样保留；migrate 失败由 HotReloadAgent 触发回滚 */
    fun migrate(dir: java.io.File, state: HotReload.State?, oldState: Map<String, Any?>): Map<String, Any?> {
        val out = oldState.toMutableMap()
        val keep = mutableMapOf<String, Any?>()
        for (key in state?.preserve.orEmpty()) {
            val re = Regex("^" + Regex.escape(key).replace("\\*", ".*") + "$")
            for ((k, v) in oldState) if (re.matches(k)) keep[k] = v
        }
        val mf = state?.migrate?.let { java.io.File(dir, it) }
        if (mf != null) {
            require(mf.exists()) { "STATE_MIGRATE_MISSING" }
            // 解析 ui/state.migrate.json 的 map/drop，按 transform 执行
        }
        out.putAll(keep)
        return out
    }
}
