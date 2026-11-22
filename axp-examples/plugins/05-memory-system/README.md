# 05 · 记忆系统（带 UI）

用户说的「点开插件显示属于记忆和储存」的可运行版本。

- `ui{}` 声明式面板：输入框 / 「记住」按钮 / 列表 / 计数 / 清空
- `ui.bind` 把 `axp://x/com.example.memory/entries` 的 delta 自动刷到列表与计数
- `ui.actions` 把按钮回填到 `memory.add` / `memory.clear`
- `ctx.storage`（`runtimeServices: ["storage"]` + `fs.read/write:shared`）做持久化，退出重进数据仍在
- `ctx.surface.publish` 触发增量，`ctx.ui.push` 主动更新计数

```bash
AXP_HOME=./.axp-host node <axp-spec>/axp/cli/bin/axp.mjs install . --dev
AXP_HOME=./.axp-host node <axp-spec>/axp/cli/bin/axp.mjs invoke com.example.memory memory.add '{"text":"记住这件事"}'
AXP_HOME=./.axp-host node <axp-spec>/axp/cli/bin/axp.mjs ui com.example.memory
```

在 `axp-android-host` 里：首页点插件名 → `PluginActivity` 渲染这个面板，输入点「记住」列表自动刷新。
