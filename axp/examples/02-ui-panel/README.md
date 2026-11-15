# com.example.panel

> AXP v1.0 · privilege L2 · host AXP-2

## 做什么
声明式面板 + Surface 数据绑定 + UI 动作回填到工具。教程见 `docs/ui-tutorial.md`。

## 组件
| 类型 | id / uri | 说明 |
|---|---|---|
| tool | `screen.tap` | 点击（需确认） |
| tool | `demo.refresh` | 刷新 |
| surface | `axp://x/com.example.panel/vision/screen` | 屏幕节点树，watchable |
| ui | `panel(dsl)` | 面板 + 3 个生命周期回调 |

## 权限
- privilege: `L2`
- requests: `accessibility.read`
- dangerous: `accessibility.read`

## 热加载
未启用（本示例只演示 UI；热加载见 `03-hot-reload`）。

## 验证
- [ ] `axp validate` 全绿
- [ ] 面板出现，屏幕变化时 `tree` 自动刷新
- [ ] 点「点击」触发 `screen.tap` 并弹出确认
