# 教程 · 写一个带界面的插件

> 状态：Stable
> 适用：AXP v1.x · Android API 26+ · 宿主 AXP-2+
> 最后更新：2026-11-14

UI 在 AXP 里是**一等组件**：`ui{}` 声明界面入口、数据绑定、动作回填与生命周期。节点词汇表见 [`../spec/06-ui-vocab.md`](../spec/06-ui-vocab.md)。

## 前置条件

- 完成 [`plugin-tutorial.md`](plugin-tutorial.md)
- 宿主实现 `Scaffold / Column / Text / Button / Input / List` 与 `${surface:}` 绑定

## 步骤 1 · 清单里加 `ui{}`

```jsonc
{
  "id": "com.example.panel",
  "minAndroid": 26,
  "abis": [],

  "tools": [
    { "id": "screen.tap", "description": "点击屏幕坐标",
      "input": { "type": "object" }, "impl": { "js": "tools/tap.js" },
      "sideEffects": "device", "confirm": true },
    { "id": "demo.refresh", "description": "刷新面板数据",
      "input": { "type": "object" }, "impl": { "js": "tools/refresh.js" },
      "sideEffects": "read" }
  ],

  "surfaces": [
    { "uri": "axp://x/com.example.panel/vision/screen",
      "views": ["tree", "text"], "anchor": "node",
      "watchable": true, "auth": "L2",
      "impl": { "js": "surfaces/screen.js" } }
  ],

  "ui": {
    "panel": { "kind": "dsl", "entry": "ui/panel.json" },
    "lifecycle": {
      "onLoad": "ui/onLoad.js",
      "onReload": "ui/onReload.js",
      "onUnload": "ui/onUnload.js"
    },
    "bind": [
      { "from": "axp://x/com.example.panel/vision/screen", "to": "ui.panel.tree" }
    ],
    "actions": [
      { "id": "ui.panel.tap", "tool": "screen.tap" },
      { "id": "ui.panel.refresh", "tool": "demo.refresh" }
    ]
  },

  "capabilities": {
    "privilege": "L2",
    "requests": ["accessibility.read"],
    "dangerous": ["accessibility.read"],
    "runtimeServices": ["ui.push"]
  },
  "runtime": { "memoryMB": 64, "cpuPct": 10, "allowDynamicCode": false },
  "distribution": {
    "channel": "session-install",
    "publisher": "sha256:REPLACE_WITH_YOUR_CERT_FINGERPRINT",
    "signatureScheme": "apk-v3"
  }
}
```

三条引用铁律（校验器会查）：

1. `bind[].to` 必须能在 `panel.json` 解析到节点
2. `actions[].tool` 必须指向本包 `tools[].id`
3. `bind[].from` 指向的 Surface 必须 `watchable: true` 才能自动刷新

## 步骤 2 · 写 `ui/panel.json`

```json
{
  "axpUi": "1.0",
  "root": "main",
  "theme": "host",
  "state": { "scroll": 0, "selected": null },
  "nodes": [
    { "id": "main", "type": "Scaffold", "props": { "title": "屏幕面板" },
      "children": ["title", "tree", "row"] },
    { "id": "title", "type": "Text",
      "props": { "text": "当前界面节点", "style": "title" } },
    { "id": "tree", "type": "Text",
      "props": { "text": "${surface:axp://x/com.example.panel/vision/screen.text}", "style": "mono", "maxLines": 20 } },
    { "id": "row", "type": "Row", "props": { "spacing": 8 },
      "children": ["tapBtn", "refreshBtn"] },
    { "id": "tapBtn", "type": "Button",
      "props": { "label": "点击", "action": "ui.panel.tap" } },
    { "id": "refreshBtn", "type": "Button",
      "props": { "label": "刷新", "action": "ui.panel.refresh" } }
  ]
}
```

`${surface:<uri>.<view>}` 是内联绑定，等价于清单里的一条 `ui.bind`。

## 步骤 3 · 写生命周期回调

```js
// ui/onLoad.js
export function onLoad(ctx) {
  ctx.log("panel mounted", ctx.state.scroll);
  return { ok: true };
}
```

```js
// ui/onReload.js —— 热加载时调用，输入含 oldState / newState / changed
export function onReload(ctx) {
  ctx.log("panel replaced", ctx.changed);
  return { ok: true };
}
```

```js
// ui/onUnload.js —— 旧实现回收前必须完成
export function onUnload(ctx) {
  ctx.release();
  return { ok: true };
}
```

回调签名由宿主 SDK 定义，格式只规定**时机**：`onLoad` 挂载后、`onReload` 重建之后可见之前、`onUnload` 旧类加载器回收之前。见 [`../spec/06-ui-vocab.md`](../spec/06-ui-vocab.md) §6。

## 步骤 4 · 校验与打包

```bash
node validator/src/validate.mjs plugins/panel
node cli/bin/axp.mjs pack plugins/panel -o panel.axp
```

## 步骤 5 · 在宿主里挂载

```kotlin
val panel = UiParser.parse(m.ui.panel.entry)
val handle = host.mountUi(m, panel)
// 每个 Surface 收集跑在面板生命周期私有的协程里：
// 前面的流慢/挂起不会拖住后续 bind 的订阅，onLoad 也不必等它们收完
val scope = panelLifecycleScope()          // 面板关闭时自动取消全部收集协程
m.ui.bind.forEach { b ->
    scope.launch {
        host.surface(b.from).collect { d -> handle.update(b.to, d) }
    }
}
m.ui.lifecycle?.onLoad?.let { host.runScript(it, panel.state) }
```

## 验证

- [ ] 面板出现，标题与按钮可见
- [ ] 屏幕变化时 `tree` 节点自动刷新（无需插件写刷新代码）
- [ ] 点「点击」触发 `screen.tap`，且因 `sideEffects: device` 弹出确认
- [ ] 故意把 `actions[].tool` 改成不存在的 id → 校验报 `UI_ACTION_TOOL_MISSING`

## 常见错误

| 现象 | 原因 |
|---|---|
| 面板空白 | `root` 指向的 id 不存在，或 `children` 拼错 |
| 数据不刷新 | Surface 未 `watchable: true`，或 `from` URI 不一致 |
| 按钮无反应 | `action` 值不是 `ui.actions[].id` |
| 换 UI 后 state 丢失 | 没配 `hotReload.state.preserve`，见 [`hot-reload-tutorial.md`](hot-reload-tutorial.md) |
