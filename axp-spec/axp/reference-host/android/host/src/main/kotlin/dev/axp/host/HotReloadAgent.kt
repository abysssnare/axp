package dev.axp.host

import java.io.File

/**
 * 热加载状态机 — spec/08-hot-reload.md §2
 * VERIFYING → VERIFIED → STAGING(state.migrate) → onUnload → SWAPPING → SWAPPED
 * 任一失败 → REJECTED / ROLLED BACK，用户可见的永远是完整的一个版本。
 */
class HotReloadAgent(
    private val plugin: LoadedPlugin,
    private val bridge: HostBridge,
    private val loader: IsolatedLoader,
) {
    data class Result(val ok: Boolean, val reason: String? = null, val phases: List<String> = emptyList())

    fun apply(newBundle: AxpBundle): Result {
        val cfg = plugin.manifest.hotReload ?: return Result(false, "HOT_DISABLED")
        if (!cfg.enabled) return Result(false, "HOT_DISABLED")
        val phases = mutableListOf<String>()
        fun phase(n: String) { phases += n }

        phase("VERIFYING")
        val newM = try { bridge.readManifest(newBundle) } catch (e: Exception) { return Result(false, "MANIFEST_PARSE", phases) }

        // ★ 每次替换重新验签，且四项不得扩大
        val verify = verify(plugin.manifest, newM, newBundle)
        if (!verify.ok) { phase("REJECTED"); return Result(false, verify.reason, phases) }
        phase("VERIFIED")

        // targets 之外的组件保持旧实现：变更检测覆盖「定义变化 + 实现内容变化 + 移除」
        val changed = changedComponents(plugin.manifest, newM, plugin.dir, newBundle.dir)
        val targets = cfg.targets
        if (changed.any { c -> targets.none { t -> c == t || (t.endsWith("*") && c.startsWith(t.dropLast(1))) } }) {
            phase("REJECTED"); return Result(false, "HOT_TARGET_MISMATCH", phases)
        }

        phase("STAGING")
        // state.migrate 在 onUnload 之前完成（spec/08 §2 顺序）；迁移失败 → 旧插件与订阅原样保留。
        // 迁移结果随后作为 newState 传入界面重建。
        val oldState: Map<String, Any?> = emptyMap()   // 实际宿主从 uiHandle 读取当前状态
        val migrated = try { StateMigrator.migrate(newBundle.dir, cfg.state, oldState) }
        catch (e: Exception) { phase("REJECTED"); return Result(false, "STATE_MIGRATE_FAILED", phases) }
        // onUnload 在旧类加载器回收前完成（关闭旧 Surface 订阅）
        val unloaded = plugin.manifest.ui?.let { UiRuntime(plugin, bridge, PanelNode(emptyMap(), emptyMap())) }
            ?.onUnload(oldState) ?: emptyMap()
        val gen = loader.load(newBundle.dir, newM.version, cfg.rollback?.keep ?: 2)

        phase("SWAPPING")
        plugin.manifest = newM
        plugin.dir = newBundle.dir
        plugin.registry.swap(newM)

        // onReload 在界面重建之后、可见之前；抛错则回滚
        try {
            UiRuntime(plugin, bridge, PanelNode(emptyMap(), emptyMap()))
                .onReload(unloaded, migrated, changed)
        } catch (e: Exception) {
            if (cfg.rollback?.onError != false) {
                loader.rollback()   // 回滚同样要验签
                phase("ROLLED_BACK")
                return Result(false, "ONRELOAD_FAILED", phases)
            }
        }
        phase("SWAPPED")
        return Result(true, phases = phases)
    }

    private fun verify(oldM: AxpManifest, newM: AxpManifest, bundle: AxpBundle): VerifyResult {
        if (oldM.distribution.publisher != newM.distribution.publisher)
            return VerifyResult(false, null, "HOT_SIGNATURE_FAILED")
        val sig = bridge.verifySignature(bundle, newM.distribution.publisher)
        if (!sig.ok) return VerifyResult(false, null, "HOT_SIGNATURE_FAILED")
        if (oldM.id != newM.id) return VerifyResult(false, null, "HOT_ID_CHANGED")
        if (Privilege.of(newM.capabilities.privilege).level > Privilege.of(oldM.capabilities.privilege).level)
            return VerifyResult(false, null, "HOT_PRIVILEGE_ESCALATION")
        if (oldM.axp != newM.axp) return VerifyResult(false, null, "HOT_FORMAT_VERSION_CHANGED")
        val oldReq = oldM.capabilities.requests.toSet()
        if (newM.capabilities.requests.any { it !in oldReq }) return VerifyResult(false, null, "HOT_NEW_REQUEST")
        val oldIds = componentIds(oldM)
        if (componentIds(newM).any { it !in oldIds }) return VerifyResult(false, null, "HOT_NEW_COMPONENT")
        return VerifyResult(true, newM.distribution.publisher)
    }

    private fun componentIds(m: AxpManifest): Set<String> = buildSet {
        m.tools.forEach { add("tool:${it.id}") }
        m.surfaces.forEach { add("surface:${it.uri}") }
        m.knowledge.forEach { add("knowledge:${it.id}") }
        m.agents.forEach { add("agent:${it.id}") }
        m.events.forEach { add("event:${it.on}|${it.filter ?: ""}") }
        if (m.ui != null) add("ui:root")
    }

    /**
     * 变更检测：新增/移除的组件 id + 既有组件定义变化 + 实现文件内容变化。
     * 移除同样是变更（targets 不含该组件时拒绝替换）。
     */
    private fun changedComponents(oldM: AxpManifest, newM: AxpManifest, oldDir: File, newDir: File): List<String> {
        val out = linkedSetOf<String>()
        val oldIds = componentIds(oldM)
        val newIds = componentIds(newM)
        val KIND2PREFIX = mapOf("tool" to "tools", "surface" to "surfaces", "knowledge" to "knowledge", "agent" to "agents", "event" to "events", "ui" to "ui")
        for (id in newIds) {
            if (id !in oldIds) out += id.split(":", limit = 2).let { (k, r) -> "${KIND2PREFIX[k] ?: k}.$r" }
        }
        for (id in oldIds) {
            if (id !in newIds) out += id.split(":", limit = 2).let { (k, r) -> "${KIND2PREFIX[k] ?: k}.$r" }
        }
        // 既有组件定义变化（data class 相等性比较）
        if (oldM.tools != newM.tools) out += "tools.*"
        if (oldM.surfaces != newM.surfaces) out += "surfaces.*"
        if (oldM.knowledge != newM.knowledge) out += "knowledge.*"
        if (oldM.agents != newM.agents) out += "agents.*"
        if (oldM.events != newM.events) out += "events.*"
        if (oldM.ui != newM.ui) out += "ui.*"
        // 实现文件内容变化（同一引用在两代目录中的字节不同）
        for (r in collectRefs(newM)) {
            val newF = File(newDir, r)
            val oldF = File(oldDir, r)
            if (newF.exists() && oldF.exists() && newF.readBytes().contentEquals(oldF.readBytes())) continue
            if (newF.exists() || oldF.exists()) out += refPrefix(r)
        }
        return out.toList()
    }

    private fun refPrefix(rel: String): String = when {
        rel.startsWith("tools/") -> "tools.*"
        rel.startsWith("surfaces/") -> "surfaces.*"
        rel.startsWith("skills/") -> "knowledge.*"
        rel.startsWith("agents/") -> "agents.*"
        rel.startsWith("events/") -> "events.*"
        rel.startsWith("ui/") -> "ui.*"
        else -> "misc.$rel"
    }

    private fun collectRefs(m: AxpManifest): List<String> = buildList {
        m.entry?.let { add(it.js) }
        m.tools.forEach { t ->
            t.impl?.candidates()?.forEach { add(it.second) }
            t.gradient.values.forEach { g -> g.impl.candidates().forEach { add(it.second) } }
        }
        m.surfaces.forEach { s -> s.impl?.candidates()?.forEach { add(it.second) } }
        m.knowledge.forEach { add(it.entry) }
        m.agents.forEach { add(it.prompt) }
        m.events.forEach { e -> e.run.candidates().forEach { add(it.second) } }
        m.ui?.let { ui ->
            listOfNotNull(ui.panel, ui.widget, ui.web, ui.activity).forEach { add(it.entry) }
            ui.inject.forEach { add(it.run) }
            listOfNotNull(ui.lifecycle?.onLoad, ui.lifecycle?.onReload, ui.lifecycle?.onUnload).forEach { add(it) }
        }
        m.hotReload?.state?.migrate?.let { add(it) }
    }
}
