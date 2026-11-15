package dev.axp.host

import dalvik.system.InMemoryDexClassLoader
import java.io.File
import java.nio.ByteBuffer

/**
 * hotReload.classloader = "isolated" 的 Android 落点 — spec/08-hot-reload.md §3.1
 *
 * 关键：每一代替换都创建新 InMemoryDexClassLoader，旧代在无强引用后由 GC 回收。
 * MUST NOT 把插件类注入宿主 PathClassLoader —— 那样永远卸不掉。
 */
class IsolatedLoader {
    private var current: Generation? = null
    private val history = ArrayDeque<Generation>()

    data class Generation(
        val version: String,
        val loader: InMemoryDexClassLoader,
        val dexBytes: List<ByteBuffer>,
        val createdAt: Long = System.currentTimeMillis(),
    )

    fun load(bundle: File, version: String, keep: Int = 2): Generation {
        val dexBytes = (bundle.listFiles { _, n -> n.endsWith(".dex") } ?: emptyArray())
            .map { ByteBuffer.wrap(it.readBytes()) }
        val gen = Generation(
            version = version,
            loader = InMemoryDexClassLoader(dexBytes.toTypedArray(), this::class.java.classLoader),
            dexBytes = dexBytes,
        )
        current?.let { history.addLast(it) }
        while (history.size > keep) history.removeFirst()   // rollback.keep
        current = gen
        return gen
    }

    /** 旧代只在回滚时被重新持有；正常路径让它自然失去强引用 */
    fun rollback(): Generation? {
        val prev = history.removeLastOrNull() ?: return null
        current = prev
        return prev
    }

    fun current(): Generation? = current
}
