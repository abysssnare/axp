package dev.axp.host

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import java.io.File

/**
 * 宿主与格式之间的唯一接缝。实现类负责 Android 细节，接口里没有任何外部协议类型。
 * 见 docs/integration-guide.md 步骤 3。
 */
interface HostBridge {
    fun readManifest(bundle: AxpBundle): AxpManifest
    /** 热加载时每次调用，不得复用安装时结果 */
    fun verifySignature(bundle: AxpBundle, expected: String): VerifyResult
    fun grantedPrivileges(): Set<Privilege>
    fun selectImpl(impl: Impl, layer: Privilege): ImplHandle?
    fun runtimeService(name: String, request: JsonObject): JsonObject
    fun surface(uri: String): SurfaceStream
    fun mountUi(manifest: AxpManifest, panel: PanelNode): UiHandle
}

data class AxpBundle(val dir: File, val certFingerprint: String? = null)
data class VerifyResult(val ok: Boolean, val publisher: String?, val reason: String? = null)
interface ImplHandle { fun call(args: JsonObject): JsonObject }
interface SurfaceStream { fun collect(block: (JsonObject) -> Unit): AutoCloseable }
interface UiHandle { fun update(nodePath: String, delta: JsonObject); fun recompose(panel: PanelNode, state: Map<String, Any?>) }
data class PanelNode(val nodes: Map<String, JsonObject>, val state: Map<String, Any?>)

class LoadException(val step: Int, val code: String, message: String) : Exception("step $step $code: $message")

/** 9 步装载流水线 — spec/01-format.md §8 */
class AxpHost(
    private val bridge: HostBridge,
    private val validator: ManifestValidator = ManifestValidator(),
    private val json: Json = Json { ignoreUnknownKeys = false },
) {
    private val plugins = mutableMapOf<String, LoadedPlugin>()
    val audit = mutableListOf<Map<String, Any?>>()

    fun load(bundle: AxpBundle): LoadedPlugin {
        // 1 解析
        val manifest = try { bridge.readManifest(bundle) }
        catch (e: Exception) { throw LoadException(1, "MANIFEST_PARSE", e.message ?: "") }

        // 2 结构校验（生产宿主用 02-manifest.schema.json；此处抽象为 ManifestValidator）
        val issues = validator.validate(manifest, bundle.dir)
        if (issues.isNotEmpty()) throw LoadException(2, issues.first().code, issues.first().message)

        // 3 签名
        val sig = bridge.verifySignature(bundle, manifest.distribution.publisher)
        if (!sig.ok || sig.publisher != manifest.distribution.publisher)
            throw LoadException(3, sig.reason ?: "SIGNATURE_FAILED", "publisher mismatch")

        // 4–6 引用完整性 / abis / 依赖闭包 / 权限上限（由 ManifestValidator 一次覆盖）
        // 7 注册组件（任一步失败整包拒绝，绝不部分注册）
        val registry = ComponentRegistry(manifest, bridge)
        val plugin = LoadedPlugin(manifest, bundle.dir, registry, this)

        // 8 UI 挂载
        manifest.ui?.panel?.let { slot ->
            val panel = UiParser.parse(bundle.dir, slot.entry)
            plugin.uiHandle = bridge.mountUi(manifest, panel)
            UiRuntime(plugin, bridge, panel).onLoad()
        }

        // 9 热加载就绪：隔离类加载器 + 回滚快照
        if (manifest.hotReload?.enabled == true) {
            require(manifest.hotReload.classloader == "isolated") { "HOT_CLASSLOADER" }
            require(manifest.hotReload.signature == "on-every-load") { "HOT_SIGNATURE_POLICY" }
            plugin.hot = HotReloadAgent(plugin, bridge, IsolatedLoader())
        }

        audit += mapOf("kind" to "load-done", "plugin" to manifest.id, "version" to manifest.version)
        plugins[manifest.id] = plugin
        return plugin
    }

    fun invoke(pluginId: String, toolId: String, args: JsonObject, confirmed: Boolean = false): JsonObject {
        val plugin = plugins[pluginId] ?: throw LoadException(7, "PLUGIN_NOT_FOUND", pluginId)
        val tool = plugin.registry.tool(toolId) ?: return JsonObject(emptyMap())
        if ((tool.confirm || tool.sideEffects == "destructive") && !confirmed)
            throw LoadException(7, "CONFIRM_REQUIRED", toolId)
        val pick = plugin.registry.chooseImpl(tool, bridge.grantedPrivileges())
            ?: return JsonObject(mapOf("unavailable" to kotlinx.serialization.json.JsonPrimitive(true)))
        audit += mapOf("kind" to "gradient", "tool" to toolId, "layer" to pick.layer.name)
        return pick.handle.call(args)
    }

    fun applyHotReplace(pluginId: String, newBundle: AxpBundle) =
        plugins[pluginId]?.hot?.apply(newBundle) ?: error("HOT_DISABLED")
}

class LoadedPlugin(
    var manifest: AxpManifest,
    var dir: File,
    val registry: ComponentRegistry,
    val host: AxpHost,
) {
    var uiHandle: UiHandle? = null
    var hot: HotReloadAgent? = null
    val surfaceCloses = mutableListOf<AutoCloseable>()
}

/** 组件注册 + 权限梯度选择 — spec/01-format.md §5.1 / §6.2 */
class ComponentRegistry(private val m: AxpManifest, private val bridge: HostBridge) {
    private var tools = m.tools.associateBy { it.id }
    fun tool(id: String) = tools[id]

    data class Pick(val handle: ImplHandle, val layer: Privilege, val reason: String)

    fun chooseImpl(tool: Tool, granted: Set<Privilege>): Pick? {
        val hostCeiling = granted.maxOfOrNull { it.level } ?: 0
        val ceiling = minOf(Privilege.of(m.capabilities.privilege).level, hostCeiling)
        for (l in ceiling downTo 0) {
            val key = "L$l"
            val impl = tool.gradient[key]?.impl ?: continue
            val h = firstSupported(impl, Privilege.of(key)) ?: continue
            return Pick(h, Privilege.of(key), "gradient")
        }
        val fallback = tool.impl ?: return null
        val h = firstSupported(fallback, Privilege.of("L$ceiling")) ?: return null
        return Pick(h, Privilege.of("L$ceiling"), "impl")
    }

    /**
     * 同一能力多实现路径：HostBridge 按 spec/03 §2 从 impl.candidates() 中
     * 跳过宿主不支持的形态再按优先级取第一个；全不支持返回 null 走降级。
     */
    private fun firstSupported(impl: Impl, layer: Privilege): ImplHandle? =
        bridge.selectImpl(impl, layer)

    fun swap(newM: AxpManifest) { tools = newM.tools.associateBy { it.id } }
}

/** 生产宿主应直接跑 spec/02-manifest.schema.json；此处为接口占位 */
class ManifestValidator {
    data class Issue(val code: String, val message: String)
    fun validate(m: AxpManifest, dir: File): List<Issue> = emptyList()
}

object UiParser {
    fun parse(dir: File, entry: String): PanelNode = PanelNode(emptyMap(), emptyMap())
}
