---
name: wechat-pay-flow
description: 识别转账通知并记账的操作流程
allowed-tools: screen.tap, ledger.ocr
---

# 转账记账流程

1. 监听屏幕流中出现「转账」文本
2. 调用 `ledger.ocr` 从截图提取订单号
3. 需要确认时调用 `screen.tap`
4. 把结果写入面板

渐进披露：宿主先加载本 frontmatter，命中 `triggers` 后再加载正文。
