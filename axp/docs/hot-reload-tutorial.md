# 教程 · 不重启宿主替换插件实现体

> 状态：Stable
> 适用：AXP v1.x · Android API 26+ · 宿主 AXP-3
> 最后更新：2026-11-14

热加载在 AXP 里是清单字段 `hotReload{}`，不是宿主私有开关。规范见 [`../spec/08-hot-reload.md`](../spec/08-hot-reload.md)。

## 前置条件

- 完成 [`plugin-tutorial.md`](plugin-tutorial.md) 与 [`ui-tutorial.md`](ui-tutorial.md)
- 宿主支持隔离类加载器、每次验签、状态迁移、回滚（见 [`integration-guide.md`](integration-guide.md) 步骤 9）
- 已用 APK v3 签名，且新旧包**同一发布者证书**

## 步骤 1 · 在清单里声明 `hotReload`

```jsonc
"hotReload": {
  "enabled": true,
  "unit": "component",
  "targets": ["ui.*", "tools.demo.*", "knowledge.*"],
  "strategy": "graceful",
  "signature": "on-every-load",
  "sources": ["package", "trusted-channel"],
  "state": {
    "migrate": "ui/state.migrate.json",
    "preserve": ["ui.panel.scroll", "agents.*.history"]
  },
  "rollback": { "keep": 2, "onError": true },
  "uiRebuild": "recompose",
  "classloader": "isolated"
}
```

四个硬性值（校验器会强制）：

| 字段 | 必须是 | 为什么 |
|---|---|---|
| `signature` | `on-every-load` | 不能复用安装时的验签结果 |
| `sources` | 不含 `network-unsigned` | 禁止未签名网络代码 |
| `classloader` | `isolated` | `dex` / `wasm` 否则在 Android 上卸不掉 |
| `uiRebuild` | 必须显式声明 | 决定界面怎么重建 |

> **`runtime.allowDynamicCode: false` 依然可以热加载。** 它禁的是「网络未签名代码」，热加载是「可信源已签名替换」。别把两者混为一谈。

## 步骤 2 · 写状态迁移映射

```json
{
  "from": "1.0.0",
  "to": "1.1.0",
  "map": [
    { "src": "ui.panel.scroll", "dst": "ui.panel.listScroll", "transform": "identity" },
    { "src": "agents.walker.history", "dst": "agents.walker.history", "transform": "identity" }
  ],
  "drop": ["ui.panel.legacyFlag"]
}
```

`state.preserve` 里的键跳过 `map` 原样保留。迁移失败 → 按 `rollback.onError` 回滚。

## 步骤 3 · 准备新版本

只改**实现体**与 `version`，不要改这些：

| 可以改 | 不能改（必须走完整重装） |
|---|---|
| `tools[].impl` 指向的文件内容 | `axp` 格式版本 |
| `ui/panel.json` 节点 | `id` |
| `knowledge[].entry` 的 `.md` | `capabilities.privilege` |
| `version` | 新增组件 id / 新增 `requests` |

第 3 条是安全底线：**热加载不得用来提权**。

```bash
node cli/bin/axp.mjs pack plugins/panel -o panel-1.1.0.axp
apksigner sign --v3 --ks release.jks panel-1.1.0.axp
```

## 步骤 4 · 发起替换

```kotlin
host.applyHotReplace(AxpBundle.fromFile("panel-1.1.0.axp"))
```

宿主内部依次执行（状态机见 [`../spec/08-hot-reload.md`](../spec/08-hot-reload.md) §2）：

```
VERIFYING  → 每次重新验签 + 比对 publisher + id/privilege 未扩大
STAGING    → 新隔离类加载器，旧代保留为回滚快照
MIGRATE    → state.migrate / preserve
SWAPPED    → onUnload(旧) → 组件换 → uiRebuild → onReload(新)
失败       → ROLLED BACK（回滚也验签） + 审计
```

`strategy: graceful` 会等当前会话空闲再切；`immediate` 会提示用户；`next-session` 下次装载生效。

## 步骤 5 · 验证

```bash
node validator/src/validate.mjs plugins/panel
```

运行时检查：

- [ ] 替换后界面文案 / 布局更新，**宿主进程未重启**
- [ ] `ui.panel.scroll` 位置保留
- [ ] 旧 `.dex` 在无引用后被 GC 回收（用内存工具确认）
- [ ] 把新包 `privilege` 偷偷改成 `L3` → 拒绝 `HOT_PRIVILEGE_ESCALATION`
- [ ] 用另一张证书签名 → 拒绝 `HOT_SIGNATURE_FAILED`
- [ ] 让 `onReload` 抛错 → 自动回滚到 1.0.0，界面仍可用
- [ ] 审计日志有完整一条记录（发起方、代号、结果）

## 常见错误

| 报错 / 现象 | 原因 | 修法 |
|---|---|---|
| `HOT_SIGNATURE_POLICY` | `signature` 写成 `on-install` | 改 `on-every-load` |
| `HOT_UNSIGNED_SOURCE` | `sources` 含 `network-unsigned` | 只留 `package` / `trusted-channel` / `preinstall` |
| `HOT_PRIVILEGE_ESCALATION` | 新包权限更高 | 走完整重装 |
| `HOT_NEW_COMPONENT` | 新包加了组件 id | 走完整重装 |
| 旧类还在内存 | `classloader: "shared"` | 改 `isolated` |
| 界面闪一下又回退 | `onReload` 超时或抛错 | 查回调日志，或临时设 `strategy: next-session` |

## 完整示例

[`examples/03-hot-reload`](../examples/03-hot-reload) 覆盖六类组件 + UI + 热加载，可直接 `axp validate` 通过。
