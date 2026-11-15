package dev.axp.host

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

/**
 * L2 通道骨架：把窗口变化转成 axp://screen / axp://vision/screen 的增量事件。
 * 启用前 MUST 单独向用户确认（capabilities.dangerous）。
 */
class AxpAccessibilityService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // 宿主在此向 SurfaceBus 推送 delta；参考实现见 runtime/src/surfaces.mjs
    }
    override fun onInterrupt() = Unit
}
