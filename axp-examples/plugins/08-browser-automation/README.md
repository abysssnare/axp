# 08 · 浏览器自动化（无 UI）

用 `axp://screen` 标准域 + `tools[]` + `gradient` 表达自动化，**不自己发明协议**：
JS 实现返回结构化指令（`{action, uri, x, y, via}`），由宿主转成 Android Intent / 无障碍手势 / Shizuku shell。

`gradient` 演示 L2（无障碍）与 L3（shell）自动切换；`dangerous` 让宿主单独弹确认。
真机接 `AndroidPlatform`（见 `axp-android-host`）即可真的点开网页、读屏、点击。
