# 08 · 浏览器自动化（无 UI）

用 `axp://screen` 标准域 + `tools[]` + `gradient` 表达自动化，**不自己发明协议**：
JS 实现返回结构化指令（`{action, uri, x, y, via}`），由宿主转成 Android Intent / 无障碍手势 / Shizuku shell。

`gradient` 演示 L2（无障碍）与 L3（shell）自动切换；`dangerous` 让宿主单独弹确认。

## 已实现 / 待接入
- **已实现**：URL 打开（`browser.open` → `AndroidPlatform.dispatch` 转成 `ACTION_VIEW`，见 `axp-android-host`）。
- **未立即可用**：读屏与点击。二者依赖宿主注入 `AccessibilityBridge`
  （`AndroidPlatform.setAccessibility(...)`，来自 `AxpAccessibilityService`）；
  未接入前 `screen.text` 返回空文本、`screen.tap` 只返回结构化指令。
