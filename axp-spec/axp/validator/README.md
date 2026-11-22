# axp-validator

零依赖、离线可运行的 AXP v1.0 清单校验器。用 Node 内置模块实现，不装任何 npm 包，方便塞进任意 CI。

```bash
node validator/src/validate.mjs path/to/plugin
node validator/src/validate.mjs path/to/plugin --json
node validator/src/validate.mjs path/to/plugin --strict

# 行为固化 + 标准引擎复核
node validator/test/run-tests.mjs
python3 validator/test/schema-crosscheck.py
```

也可以作为模块：

```js
import { validate } from './validator/src/validate.mjs';
const r = validate('path/to/plugin');
console.log(r.ok, r.errors, r.summary);
```

## 校验顺序

对应 [`../spec/01-format.md`](../spec/01-format.md) §8：

1. JSON 解析
2. `../spec/02-manifest.schema.json` 结构校验（内置精简 JSON Schema 引擎，关键字子集见 [`test/README.md`](test/README.md)）
3. 引用完整性（包内相对路径存在、无 `..`、无绝对路径）
4. `abis` 一致性
5. 组件 id 唯一性
6. `capabilities.requests` 词汇表
7. 权限上限（`dangerous ⊆ requests`、`gradient` / `agents` ≤ `privilege`）
8. UI 引用（`bind[].to` 可解析、`actions[].tool` 指向本包工具）
9. 热加载策略（每次验签、可信源、隔离类加载器、UI 生命周期）
10. **未在清单声明的可执行文件不得作为入口**

内置引擎的结论由 `test/schema-crosscheck.py` 用 Python `jsonschema`（draft 2020-12 参考实现）逐分支复核，确保两套引擎一致。

## 错误码

| Code | 含义 |
|---|---|
| `MANIFEST_MISSING` / `MANIFEST_PARSE` | 缺 `axp.json` / JSON 解析失败 |
| `SCHEMA_*` | schema 结构错误（`ADDITIONAL_PROPERTY` / `REQUIRED` / `TYPE` / `ENUM` / `CONST` / `ANYOF` / `MINITEMS` / `MINLENGTH` / `MINIMUM` / `MAXIMUM`） |
| `ID_INVALID` | `id` 不是反向域名 |
| `VERSION_INVALID` | `version` 非语义化版本 |
| `PUBLISHER_INVALID` | `distribution.publisher` 非 `sha256:<64hex>` |
| `IMPL_FILE_MISSING` | `impl` 引用的包内文件不存在 |
| `UNSAFE_PATH` | 路径含 `..` 或绝对路径 |
| `UNDECLARED_EXECUTABLE` | 包内存在未被清单引用的可执行文件 |
| `ABI_MISSING` | 包内有 `.so` / `.dex` 但 `abis` 为空 |
| `DUP_ID` | 组件 id / uri 重复 |
| `CAP_UNKNOWN_REQUEST` | `requests` 项不在 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) 词汇表 |
| `CAP_WILDCARD_EGRESS` | `network.egress` 使用 `*` |
| `DANGEROUS_NOT_REQUESTED` | `dangerous` 含未申请的权限 |
| `GRADIENT_EXCEEDS_PRIVILEGE` | `gradient` 键高于 `capabilities.privilege` |
| `AGENT_EXCEEDS_PRIVILEGE` | `agents[].privilege` 高于上限 |
| `TOOL_CONFIRM_REQUIRED` | `sideEffects: destructive` 但 `confirm` 非 true |
| `UI_BIND_TARGET_MISSING` | `bind[].to` 在 `panel.json` 中解析不到节点 |
| `UI_ACTION_TOOL_MISSING` | `actions[].tool` 不是本包工具 id |
| `SURFACE_NOT_WATCHABLE` | `bind[].from` / `events[].on` 指向的 Surface 未 `watchable` |
| `NET_EGRESS_UNDECLARED` | `impl.url` 的 host 未声明 |
| `HOT_SIGNATURE_POLICY` | 热加载未设 `on-every-load` |
| `HOT_UNSIGNED_SOURCE` | `sources` 含 `network-unsigned` |
| `HOT_CLASSLOADER` | 热加载未用 `isolated` |
| `HOT_NO_TARGETS` | `targets` 为空 |
| `HOT_UI_LIFECYCLE` | `targets` 含 `ui.*` 但缺 `onReload` / `onUnload` |

## 明确不做的事

- **不会**因为 `runtime.allowDynamicCode: false` 拒绝合法热加载。该字段禁的是「网络未签名代码」，不是「可信源已签名替换」。见 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) §5。
- **不会**校验或执行任何外部插件协议；校验器只认 `axp.json`。
- **不会**执行插件实现体；`inspect` 也只读清单。真正执行实现体的是 [`../runtime/`](../runtime/) 参考宿主。

## 警告（默认不阻断，`--strict` 阻断）

| Code | 含义 |
|---|---|
| `WARN_ABI_EMPTY` | `abis` 非空但包内无二进制产物 |
| `WARN_DEPRECATED` | 使用了弃用字段 |
