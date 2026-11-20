# com.example.domains

> AXP v1.0 · privilege L3 · host AXP-2 · M3 感知域示例

## 做什么
演示 `axp-spec/axp/spec/05-domains.md` 的 13 个 `axp://` 标准域怎么用：URI 模板、`anchor`、`watchable`、`ui.bind`、`events` 触发源、以及权限分层。教程见 `axp-spec/axp/docs/domains-tutorial.md`。

## 组件
| 类型 | id / uri | 关键点 |
|---|---|---|
| surface | `axp://fs/{path}` | URI 模板，`anchor: line`，四个 views |
| surface | `axp://screen` | `anchor: node`，L2 |
| surface | `axp://notification/stream` | `watchable` + 作为 `events[].on` 触发源 |
| surface | `axp://sensor/motion` / `axp://clipboard` / `axp://net/wlan0` | 多域绑定到同一面板 |
| surface | `axp://sysprop/{key}` | **不可订阅**，L3 |
| surface | `axp://logcat` | `anchor: line`，L3 |
| tool | `file.read` | `gradient` L1 / L3 双路径（L3 附 `proc`） |
| knowledge | `context-triage` | `SKILL.md` 渐进披露 + triggers |
| agent | `context-walker` | 权限上限 L2 |
| event | `axp://notification/stream` + filter / `lifecycle/tool.before` | 两类触发源 |
| ui | `panel(dsl)` | 5 条 bind + 2 个 actions + 3 个 lifecycle |

## 权限
- privilege: `L3`
- requests: `accessibility.read` / `notification.listen` / `sensor.motion` / `clipboard.read` / `net.stat` / `sysprop.read` / `logcat.read` / `fs.read:app`
- dangerous: `accessibility.read` / `sysprop.read` / `logcat.read`（宿主装载时单独确认）

## 热加载
未启用。本示例只演示感知域；热加载见 [`03-hot-reload`](../03-hot-reload)。

## 验证
- [ ] `axp validate axp-examples/plugins/04-domains` 全绿
- [ ] 把 `axp://sysprop/{key}` 改成 `watchable: true` 仍合法，但不要把它写进 `ui.bind`（不可订阅域不应作绑定源）
- [ ] 把某条 `ui.bind[].from` 指向未声明的 URI → 引用完整性检查报错
- [ ] 把 `gradient` 加到 `L4` → `GRADIENT_EXCEEDS_PRIVILEGE`
