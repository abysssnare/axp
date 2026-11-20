package dev.axp.host

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/**
 * 与 spec/02-manifest.schema.json 对齐的清单数据类。
 * 注意：这里不出现任何外部插件格式的类型名——AXP 自己定义组件语义。
 */
@Serializable
data class AxpManifest(
    val axp: String = "1.0",
    val id: String,
    val name: Map<String, String>,
    val version: String,
    val description: String? = null,
    val minHost: String? = null,
    val minAndroid: Int,
    val abis: List<String> = emptyList(),
    val requires: List<Require> = emptyList(),
    val entry: Entry? = null,
    val tools: List<Tool> = emptyList(),
    val surfaces: List<Surface> = emptyList(),
    val knowledge: List<Knowledge> = emptyList(),
    val agents: List<AgentDef> = emptyList(),
    val events: List<EventHook> = emptyList(),
    val ui: Ui? = null,
    val hotReload: HotReload? = null,
    val capabilities: Capabilities,
    val instances: Instances? = null,
    val runtime: RuntimeLimits? = null,
    val distribution: Distribution,
)

@Serializable data class Require(val id: String, val range: String)
@Serializable data class Entry(val js: String, val engine: String)

/** 统一实现引用 impl 的七种形态，见 spec/03-impl-reference.md */
@Serializable
data class Impl(
    val js: String? = null,
    val kotlin: String? = null,
    val native: String? = null,
    val wasm: String? = null,
    val bin: String? = null,
    val url: String? = null,
    val proc: Proc? = null,
) {
    @Serializable data class Proc(
        val cmd: String,
        val args: List<String> = emptyList(),
        val cwd: String? = null,
        val env: Map<String, String> = emptyMap(),
    )
    /** 宿主按优先级选形态；不支持的跳过而不是直接失败 */
    fun candidates(): List<Pair<String, String>> = listOfNotNull(
        native?.let { "native" to it }, kotlin?.let { "kotlin" to it },
        wasm?.let { "wasm" to it }, bin?.let { "bin" to it },
        js?.let { "js" to it }, url?.let { "url" to it },
        proc?.let { "proc" to it.cmd },
    )
}

@Serializable
data class Tool(
    val id: String,
    val description: String,
    val input: JsonObject? = null,
    val output: JsonObject? = null,
    val impl: Impl? = null,
    val gradient: Map<String, GradientBranch> = emptyMap(),
    val sideEffects: String,
    val confirm: Boolean = false,
    val cost: String = "fast",
) {
    @Serializable data class GradientBranch(val impl: Impl)
}

@Serializable
data class Surface(
    val uri: String,
    val description: String? = null,
    val views: List<String>,
    val anchor: String,
    val watchable: Boolean = false,
    val auth: String,
    val impl: Impl? = null,
)

@Serializable
data class Knowledge(
    val id: String,
    val kind: String,
    val entry: String,
    val progressive: Boolean = false,
    val arguments: List<JsonObject> = emptyList(),
    val triggers: List<Trigger> = emptyList(),
    val allowedTools: List<String> = emptyList(),
) {
    @Serializable data class Trigger(val on: String, val filter: String? = null)
}

@Serializable
data class AgentDef(
    val id: String,
    val prompt: String,
    val tools: List<String> = emptyList(),
    val knowledge: List<String> = emptyList(),
    val model: String = "host-default",
    val maxTurns: Int = 20,
    val privilege: String? = null,
)

@Serializable
data class EventHook(
    val on: String,
    val filter: String? = null,
    val `when`: JsonObject? = null,
    val run: Impl,
    val privilege: String? = null,
)

@Serializable
data class Ui(
    val panel: UiSlot? = null,
    val widget: UiSlot? = null,
    val web: UiSlot? = null,
    val activity: UiSlot? = null,
    val inject: List<Inject> = emptyList(),
    val lifecycle: Lifecycle? = null,
    val bind: List<Bind> = emptyList(),
    val actions: List<Action> = emptyList(),
) {
    @Serializable data class UiSlot(val kind: String, val entry: String)
    @Serializable data class Inject(val surface: String, val label: String, val run: String)
    @Serializable data class Lifecycle(val onLoad: String? = null, val onReload: String? = null, val onUnload: String? = null)
    @Serializable data class Bind(val from: String, val to: String)
    @Serializable data class Action(val id: String, val tool: String)
}

@Serializable
data class HotReload(
    val enabled: Boolean,
    val unit: String = "component",
    val targets: List<String> = emptyList(),
    val strategy: String = "graceful",
    val signature: String = "on-install",
    val sources: List<String> = listOf("package"),
    val state: State? = null,
    val rollback: Rollback? = null,
    val uiRebuild: String = "recompose",
    val classloader: String = "isolated",
) {
    @Serializable data class State(val migrate: String? = null, val preserve: List<String> = emptyList())
    @Serializable data class Rollback(val keep: Int = 2, val onError: Boolean = true)
}

@Serializable
data class Capabilities(
    val privilege: String,
    val requests: List<String>,
    val dangerous: List<String> = emptyList(),
    val runtimeServices: List<String> = emptyList(),
)

@Serializable data class Instances(val multi: Boolean = false, val max: Int = 1)
@Serializable data class RuntimeLimits(val memoryMB: Int? = null, val cpuPct: Int? = null, val allowDynamicCode: Boolean = false)
@Serializable data class Distribution(val channel: String, val publisher: String, val signatureScheme: String = "apk-v3")

enum class Privilege(val level: Int) { L0(0), L1(1), L2(2), L3(3), L4(4), L5(5);
    companion object { fun of(s: String) = entries.firstOrNull { it.name == s } ?: L0 }
}
