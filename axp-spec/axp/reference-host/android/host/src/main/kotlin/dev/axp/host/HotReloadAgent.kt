package dev.axp.host

import java.io.File

/**
 * 热加载状态机 — spec/08-hot-reload.md §2
 * VERIFYING → VERIFIED → STAGING → MIGRATE → SWAPPING → SWAPPED
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

        // targets 之外的组件保持旧实现
        val changed = changedComponents(plugin.manifest, newM)
        val targets = cfg.targets
        if (changed.any { c -> targets.none { t -> c == t || (t.endsWith("*") && c.startsWith(t.dropLast(1))) } }) {
            phase("REJECTED"); return Result(false, "HOT_TARGET_MISMATCH", phases)
        }

        phase("STAGING")
        val oldState = plugin.manifest.ui?.let { UiRuntime(plugin, bridge, PanelNode(emptyMap(), emptyMap())) }
            ?.onUnload(emptyMap()) ?: emptyMap()
        val gen = loader.load(newBundle.dir, newM.version, cfg.rollback?.keep ?: 2)

        phase("MIGRATE")
        // onUnload 已在旧类加载器回收前完成
        phase("SWAPPING")
        plugin.manifest = newM
        plugin.dir = newBundle.dir
        plugin.registry.swap(newM)

        // onReload 在界面重建之后、可见之前；抛错则回滚
        try {
            UiRuntime(plugin, bridge, PanelNode(emptyMap(), emptyMap()))
                .onReload(oldState, emptyMap(), changed)
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

    private fun changedComponents(oldM: AxpManifest, newM: AxpManifest): List<String> {
        val oldIds = componentIds(oldM)
        return componentIds(newM).filter { it !in oldIds }.map {
            val (kind, rest) = it.split(":", limit = 2)
            val prefix = when (kind) { "tool" -> "tools"; "surface" -> "surfaces"; "knowledge" -> "knowledge"; "agent" -> "agents"; "event" -> "events"; else -> "ui" }
            "$prefix.$rest"
        }
    }
}
