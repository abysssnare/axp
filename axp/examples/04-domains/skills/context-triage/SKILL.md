---
name: context-triage
description: 从多个标准域汇总环境快照并判断是否需要用户确认
allowed-tools: ctx.summarize, sys.readProp
---

# 环境快照分流

1. 订阅 `axp://screen`、`axp://notification/stream`、`axp://sensor/motion`
2. 命中「验证码」类通知时调用 `ctx.summarize`
3. 需要系统属性时调用 `sys.readProp`（L3，需单独授权）
4. 结果写入 `ui.panel` 的绑定节点

渐进披露：宿主先加载 frontmatter，命中 `triggers` 后再加载正文。
