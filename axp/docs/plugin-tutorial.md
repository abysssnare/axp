# 教程 · 5 分钟写第一个 AXP 插件

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

## 前置条件

- Node.js 20+（只用于 `axp` CLI 与校验器）
- 本仓库已 clone
- 一个支持 AXP-0 以上的 Android 宿主（见 [`integration-guide.md`](integration-guide.md)）

## 步骤 1 · 生成骨架

```bash
node cli/bin/axp.mjs new com.example.hello -o plugins/hello
```

生成：

```
plugins/hello/
├── axp.json
├── tools/hello.js
└── README.md
```

## 步骤 2 · 写清单

```json
{
  "axp": "1.0",
  "id": "com.example.hello",
  "name": { "zh": "你好插件", "en": "Hello" },
  "version": "1.0.0",
  "minAndroid": 26,
  "abis": [],
  "entry": { "js": "main.js", "engine": "quickjs" },
  "tools": [
    {
      "id": "demo.echo",
      "description": "原样返回输入文本",
      "input": {
        "type": "object",
        "properties": { "text": { "type": "string" } },
        "required": ["text"]
      },
      "output": { "type": "object" },
      "impl": { "js": "tools/hello.js" },
      "sideEffects": "none",
      "cost": "fast"
    }
  ],
  "capabilities": { "privilege": "L0", "requests": [] },
  "instances": { "multi": false },
  "runtime": { "memoryMB": 32, "cpuPct": 5, "allowDynamicCode": false },
  "distribution": {
    "channel": "session-install",
    "publisher": "sha256:REPLACE_WITH_YOUR_CERT_FINGERPRINT",
    "signatureScheme": "apk-v3"
  }
}
```

> `L0` = 纯计算沙箱，不需要任何 Android 权限。这是最安全的起点。

## 步骤 3 · 写实现体

```js
// tools/hello.js —— 实现体可以是任意语言任意格式，这里用最简的 JS
export function run(args) {
  return { text: args.text, at: Date.now() };
}
```

清单是骨架，实现随意：换成 `.dex`、`.wasm`、`bin`、`proc` 都只改 `impl` 一行，不动其他字段。见 [`../spec/03-impl-reference.md`](../spec/03-impl-reference.md)。

## 步骤 4 · 校验

```bash
node validator/src/validate.mjs plugins/hello
# ✔ axp.json parsed
# ✔ schema OK
# ✔ 1 tool(s), 0 surface(s)
# ✔ references OK
# ✔ privilege OK
# ALL CHECKS PASSED
```

校验器会检查：schema、引用完整性、`abis`、`requests` 词汇表、权限一致性、**未在清单声明的文件不得作为入口**。

## 步骤 5 · 打包

```bash
node cli/bin/axp.mjs pack plugins/hello -o hello.axp
```

`.axp` 就是 zip。发布前用 APK v3 签名，并把证书指纹填回 `distribution.publisher`。

## 步骤 6 · 安装并调用

在宿主里：

```kotlin
val plugin = host.load(AxpBundle.fromFile("hello.axp"))
val result = plugin.invoke("demo.echo", """{"text":"hi"}""")
// → {"text":"hi","at":1730000000000}
```

## 验证

- [ ] `axp validate` 全绿
- [ ] `axp pack` 产物含 `axp.json`
- [ ] 宿主调用 `demo.echo` 返回预期结果
- [ ] 尝试把 `sideEffects` 改成 `destructive` → 校验器要求 `confirm: true`

## 常见错误

| 报错 | 原因 | 修法 |
|---|---|---|
| `ABI_MISSING` | `abis: []` 但包内有 `.so` | 把架构写进 `abis` |
| `CAP_UNKNOWN_REQUEST` | `requests` 名不在词汇表 | 查 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) |
| `IMPL_FILE_MISSING` | `impl.js` 路径写错 | 改成相对包根的真实路径 |
| `PUBLISHER_INVALID` | 指纹格式不对 | 用 `sha256:<hex>` |

## 下一步

- 加界面 → [`ui-tutorial.md`](ui-tutorial.md)
- 加热加载 → [`hot-reload-tutorial.md`](hot-reload-tutorial.md)
- 加屏幕感知与权限梯度 → [`../spec/05-domains.md`](../spec/05-domains.md) / [`../spec/04-capabilities.md`](../spec/04-capabilities.md)
- 插件 README 怎么写 → [`doc-templates.md`](doc-templates.md)
