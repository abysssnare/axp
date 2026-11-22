package dev.axp.host

import android.os.Build
import dalvik.system.InMemoryDexClassLoader
import java.io.File
import java.nio.ByteBuffer

/**
 * hotReload.classloader = "isolated" 的 Android 落点 — spec/08-hot-reload.md §3.1
 *
 * 关键：每一代替换都创建新 InMemoryDexClassLoader，旧代在无强引用后由 GC 回收。
 * MUST NOT 把插件类注入宿主 PathClassLoader —— 那样永远卸不掉。
 *
 * API 分级（修复 API 26 构造器误用）：
 * - API 26 只有单缓冲构造器 InMemoryDexClassLoader(ByteBuffer, ClassLoader)；
 * - API 27+ 才有 InMemoryDexClassLoader(ByteBuffer[], ClassLoader) 多缓冲路径。
 * 多个 DEX 在 API 26 上先显式拒绝（在触碰活动代之前），保证替换失败
 * 不会留下「活动插件已卸载、新代加载不了」的中间态。
 */
class IsolatedLoader {
    private var current: Generation? = null
    private val history = ArrayDeque<Generation>()

    data class Generation(
        val version: String,
        val loader: InMemoryDexClassLoader?,   // 纯 JS 插件无 DEX，无可隔离的类
        val dexBytes: List<ByteBuffer>,
        val createdAt: Long = System.currentTimeMillis(),
    )

    fun load(bundle: File, version: String, keep: Int = 2): Generation {
        val dexFiles = (bundle.listFiles { _, n -> n.endsWith(".dex") } ?: emptyArray()).sortedBy { it.name }
        val dexBytes = dexFiles.map { ByteBuffer.wrap(it.readBytes()) }
        val api = Build.VERSION.SDK_INT
        if (api < 27 && dexBytes.size > 1) {
            // 在卸载活动代之前拒绝：多 DEX 需 API 27+ 的多缓冲构造器（API 26 仅单缓冲）
            throw UnsupportedOperationException(
                "InMemoryDexClassLoader supports a single dex buffer on API $api; found ${dexBytes.size} dex files (multi-buffer requires API 27+)")
        }
        val parent = this::class.java.classLoader
        val loader = when {
            dexBytes.isEmpty() -> null                                   // 纯 JS 插件：无类需要隔离
            api < 27 -> InMemoryDexClassLoader(dexBytes[0], parent)      // API 26：单缓冲构造器
            else -> InMemoryDexClassLoader(dexBytes.toTypedArray(), parent)  // API 27+：多缓冲
        }
        val gen = Generation(version = version, loader = loader, dexBytes = dexBytes)
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
