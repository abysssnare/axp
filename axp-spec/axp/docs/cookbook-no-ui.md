# Cookbook · 不带 UI 的功能插件怎么写

> 面向插件作者。四类场景：**PDF/Excel 制作 · 压缩解压 · 浏览器自动化 · 纯计算**。
> 共同点：`axp.json` 里**不写 `ui{}`**，只有 `tools[]`；`distribution` 与 `capabilities` 仍然必填。
> 完整可跑版本见独立示例仓 `axp-examples/plugins/06…08`。

## 0. 最小骨架（任何无 UI 插件都从这开始）

```jsonc
{
  "axp": "1.0", "id": "com.example.tools", "name": { "zh": "工具集" },
  "version": "1.0.0", "minAndroid": 26, "abis": [],
  "tools": [ { "id": "tool.one", "description": "...", "impl": { "js": "tools/one.js" },
               "sideEffects": "none", "cost": "fast" } ],
  "capabilities": { "privilege": "L0", "requests": [] },
  "distribution": { "channel": "session-install", "publisher": "sha256:<64hex>", "signatureScheme": "apk-v3" }
}
```

`axp new com.example.tools` 直接生成它。**不需要 `entry`，也不需要 `ui`**。

## 1. 文件生成类（PDF / Excel）

要写文件，`MUST` 声明 `fs.write:<scope>`；纯计算生成内容可不申请权限。

```jsonc
"tools": [
  { "id": "excel.make", "description": "把行数据生成 CSV/Excel 内容",
    "input": { "type":"object", "properties": { "rows":{"type":"array"} }, "required":["rows"] },
    "impl": { "js": "tools/excel.js", "bin": "tools/office-bin" },
    "sideEffects": "read", "cost": "slow" },
  { "id": "pdf.make", "description": "由文本生成最小 PDF",
    "impl": { "js": "tools/pdf.js", "proc": { "cmd": "tools/office-bin", "args": ["--pdf"] } },
    "sideEffects": "read", "cost": "slow" }
],
"capabilities": { "privilege": "L1",
  "requests": ["fs.write:shared"],
  "runtimeServices": ["storage"] }
```

要点：`impl` 可同时给 `js` + `bin`/`proc`，宿主按 `native>kotlin>wasm>bin>js>proc>url` 选；JS 兜底保证任何宿主都能跑。
落盘用 `ctx.storage.put()` 或由宿主把 `fs.write:shared` 映射到应用共享目录；**不要自己在 JS 里 `require('fs')`**——沙箱里没有。

## 2. 压缩 / 解压

```jsonc
"tools": [
  { "id": "archive.pack", "description": "把多个文件打包", "impl": { "js":"tools/pack.js", "bin":"tools/zip-bin" },
    "sideEffects":"read" },
  { "id": "archive.unpack", "description": "解包并列出条目", "impl": { "js":"tools/unpack.js" },
    "sideEffects":"device", "confirm": true }
],
"capabilities": { "privilege":"L1", "requests":["fs.read:shared","fs.write:shared"] }
```

`sideEffects:"device"` 或 `"destructive"` 时 `MUST` 写 `confirm:true`（校验器会查 `TOOL_CONFIRM_REQUIRED`）。
真机上把 `bin` 指向随包提供的 zip 可执行文件并把架构写进 `abis`；JS 版可用字符串封装做降级，见示例仓 `07-archive-tools`。

## 3. 浏览器 / 界面自动化（Android）

用标准域而不是自己发明协议：

```jsonc
"tools": [
  { "id": "browser.open", "description": "打开 URL",
    "input": { "type":"object","properties":{ "url":{"type":"string"} },"required":["url"] },
    "impl": { "js":"tools/open.js" }, "sideEffects":"device", "confirm":true },
  { "id": "screen.tap", "description": "点击坐标", "impl": { "js":"tools/tap-a11y.js" },
    "gradient": { "L2": { "impl": { "js":"tools/tap-a11y.js" } },
                  "L3": { "impl": { "bin":"tools/tap-shell" } } },
    "sideEffects":"device", "confirm":true },
  { "id": "screen.text", "description": "读取当前屏幕文本", "impl": { "js":"tools/text.js" }, "sideEffects":"read" }
],
"surfaces": [ { "uri":"axp://screen", "views":["tree","text"], "anchor":"node",
                "watchable":true, "auth":"L2" } ],
"capabilities": { "privilege":"L3",
  "requests":["accessibility.read","accessibility.gestures","intent.send"],
  "dangerous":["accessibility.gestures"] }
```

`gradient` 让 L2（无障碍）与 L3（Shizuku/shell）自动切换；`dangerous` 会被宿主单独弹确认。
JS 实现**返回结构化指令**（`{ action:"intent", uri:... }`），由宿主转成 Android Intent / 无障碍手势；插件不直接碰系统 API。

## 4. 纯计算 / 记忆 / 检索

L0 沙箱即可，不需要任何 `requests`；要持久化才加 `storage` + `fs.*`：

```jsonc
"capabilities": { "privilege":"L0", "requests":[],
  "runtimeServices": ["storage"] },
"tools": [ { "id":"text.summarize", "impl":{"js":"tools/sum.js"}, "sideEffects":"none", "cost":"fast" } ]
```

注意：`storage` 必须配 `fs.read/fs.write`，否则运行时返回 `STORAGE_DENIED`（见 `spec/11` §4）。

## 5. 发布前检查

```bash
axp validate .                 # 校验器
axp pack . -o com.example.tools.axp
axp publish . --index ../index.json   # 写摘要进索引
axp install com.example.tools@^1.0.0 --index ../index.json
axp agent-tools --json         # 确认工具出现在 Agent 可见集
axp conformance --json         # 端到端
```

`axp validate` 常见失败：`UNDECLARED_EXECUTABLE`（包里有 .js 但清单没引用）、`CAP_UNKNOWN_REQUEST`（权限名拼错）、`ABI_MISSING`（放了 .so/.dex 却没写 `abis`）。
