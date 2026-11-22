package dev.axp.host

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/** 骨架级单元测试：不依赖 Android SDK 的纯逻辑部分 */
class AxpHostTest {

    @Test
    fun `privilege ladder is ordered`() {
        assertEquals(0, Privilege.L0.level)
        assertEquals(5, Privilege.L5.level)
        assertEquals(Privilege.L3, Privilege.of("L3"))
        assertEquals(Privilege.L0, Privilege.of("bogus"))
    }

    @Test
    fun `impl candidates follow host priority order`() {
        val impl = Impl(native = "tools/x.so", js = "tools/fallback.js")
        assertEquals(listOf("native", "js"), impl.candidates().map { it.first })
    }

    @Test
    fun `isolated loader keeps bounded history`() {
        // 需 Android 运行时（InMemoryDexClassLoader）；真机/仪器测试里补
    }

    @Test
    fun `load exception carries step and code`() {
        val e = assertFailsWith<LoadException> { throw LoadException(3, "CERT_MISSING", "x") }
        assertEquals(3, e.step)
        assertEquals("CERT_MISSING", e.code)
    }
}
