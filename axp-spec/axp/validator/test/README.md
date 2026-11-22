# 测试与交叉复核

两套工具，分工不同，**都要跑**：

```bash
node validator/test/run-tests.mjs            # 31 条：行为固化（零依赖）
python3 validator/test/schema-crosscheck.py  # 47 项：标准引擎独立复核（需 pip install jsonschema）
node runtime/test/smoke.mjs                 # 30 条：端到端参考运行时
```

## `run-tests.mjs` — 行为固化

固定 `validator/src/validate.mjs` 对每个错误码的行为，防止改 schema / 校验器时悄悄放宽规则。

覆盖：

- 4 个正面示例（`01-hello` / `02-ui-panel` / `03-hot-reload` / `04-domains`）必须全绿
- 24 个变异体精确命中 `HOT_*` / `CAP_*` / `UI_*` / `SCHEMA_*` / 引用完整性 / 身份校验错误码
- `UNDECLARED_EXECUTABLE` 安全铁律、`ABI_MISSING` 架构一致性
- **`allowDynamicCode: false` 不误杀合法热加载** 的边界用例

加字段时 `MUST` 同步加用例，见 [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) 三条底线第 2 条。

## `schema-crosscheck.py` — 标准引擎独立复核

`validator/src/validate.mjs` 内置一个精简 JSON Schema 引擎（为离线零依赖）。本脚本用 Python `jsonschema` 的 **draft 2020-12 参考实现**作为第二意见，验证：

1. `spec/02-manifest.schema.json` 自身元语法合法、`$schema` 声明正确
2. **区分 schema 层与业务层**：只比对 `SCHEMA_*` 结论，避免「碰巧整体拒绝」造成假通过
3. 17 个反例覆盖 `if/then + const`、`patternProperties + additionalProperties:false`、`anyOf`、`enum` / `const` / `minItems`
4. `hotReload.enabled = false` 时 `if/then` 不误触发的正例
5. 7 类「标准 schema 放行 / Node 精确拒绝业务码」边界用例（如 `GRADIENT_EXCEEDS_PRIVILEGE`）

`subprocess.run` 带 30 秒超时，避免 CI 挂死。临时 fixture 落在 `.tmp/`（已在 `.gitignore`）。

## 手写引擎的已知边界

精简引擎实现了本 schema 用到的关键字子集：`$ref` / `properties` / `patternProperties` / `additionalProperties` / `enum` / `const` / `anyOf` / `if-then-else` / `items` / `minItems` / `minLength` / `minimum` / `maximum` / `type`。

`properties` 命中的键**同时**应用 `patternProperties`，`additionalProperties: false` 只约束「两者都未匹配」的键 —— 与 draft 2020-12 语义一致（1.0.1 修复）。若日后 schema 引入新关键字，`MUST` 同步扩展引擎并加交叉复核用例。

## CI

`.github/workflows/ci.yml` 的 `cross-check` job 对每次 PR 执行上述全部三项；`validate` job 另跑示例校验与 CLI 烟雾测试。
