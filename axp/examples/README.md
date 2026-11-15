# 示例插件

| 示例 | 覆盖 | 宿主等级 |
|---|---|---|
| [`01-hello`](01-hello) | 最小插件：`tools[]` + `entry` + L0 | AXP-0 |
| [`02-ui-panel`](02-ui-panel) | `ui{}` + `bind` / `actions` / `lifecycle` + Surface 订阅 | AXP-2 |
| [`03-hot-reload`](03-hot-reload) | 六类组件 + UI + `hotReload{}` + `gradient` | AXP-3 |
| [`04-domains`](04-domains) | M3：13 个 `axp://` 标准域、URI 模板、`anchor`、`watchable`、事件与多域绑定 | AXP-2 |

```bash
for d in examples/*/; do node validator/src/validate.mjs "$d"; done
```

全部示例必须全绿；CI 对每次 PR 执行同一组校验。`runtime/test/smoke.mjs` 使用 `01`–`03` 共 3 个示例跑 30 条端到端断言（`04-domains` 只参与清单校验）。
