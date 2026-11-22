# com.example.autopay

> AXP v1.0 · privilege L3 · host AXP-3

## 做什么
综合示例：六类组件 + 声明式 UI + 权限梯度 + 组件级热加载。

## 组件
| 类型 | id / uri | 说明 |
|---|---|---|
| tool | `ledger.ocr` | 截图识别订单号 |
| tool | `screen.tap` | `gradient` L2 无障碍 / L3 shell |
| surface | `axp://vision/screen` | 屏幕节点树，watchable |
| knowledge | `wechat-pay-flow` | `SKILL.md`，渐进披露 |
| agent | `pay-walker` | 权限上限 L2 |
| event | `axp://vision/screen` + filter | 验证码文本触发 |
| ui | `panel(dsl)` + inject | 绑定 + 动作回填 + 3 个生命周期 |

## 权限
- privilege: `L3`
- requests: `accessibility.gestures` / `notification.listen` / `network.egress:api.example.com`
- dangerous: `accessibility.gestures`

## 热加载
- unit: `component`，targets: `ui.* / tools.* / knowledge.*`
- signature: `on-every-load`，sources: `package / trusted-channel`
- classloader: `isolated`，uiRebuild: `recompose`，回滚保留 2 代

`runtime.allowDynamicCode: false` 与本配置**不冲突**：禁的是未签名网络代码，热加载是已签名可信替换。

## 验证
- [ ] `axp validate` 全绿
- [ ] 替换 `ui/panel.json` 后界面更新、进程不重启、`ui.panel.scroll` 保留
- [ ] 新包提权 / 换证书 / 新增组件 → 全部被拒绝
