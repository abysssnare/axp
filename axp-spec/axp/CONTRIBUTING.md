# 贡献指南

## 三条底线

1. **规范正文不引用外部格式字段名。** `spec/01-format.md` ~ `06`、`08`、`09` 里不得出现 `mcp` / `lsp` / `skill` 作为格式标识（作为通用英文单词除外）。外部格式名只允许出现在 `spec/07-expression-map.md` 与 `docs/faq.md`。
2. **加字段必须同时改四处**：`01-format.md` 字段表、`02-manifest.schema.json`、`validator/src/validate.mjs`、`examples/` 至少一处。
3. **示例必须全绿**：`node validator/src/validate.mjs examples/*`。
4. **四套自检都要过**：`validator/test/run-tests.mjs`、`validator/test/schema-crosscheck.py`、`runtime/test/smoke.mjs`、全仓链接审计。新增校验规则 `MUST` 在 `run-tests.mjs` 补一条负面用例；改动实现语义 `MUST` 在 `runtime/test/smoke.mjs` 补一条断言。

## 改动分类

| 类型 | 走哪里 | 评审要求 |
|---|---|---|
| 规范语义变更 | `.github/ISSUE_TEMPLATE/spec-change.md` 提案 → PR | 需给出兼容影响与迁移路径 |
| schema / validator | PR + 新增测试用例 | CI 全绿 |
| 教程 / 文档 | PR | 链接可达、命令可执行 |
| 示例插件 | PR | 校验器通过 |

## 文档格式约定

所有 `docs/*.md` 与 `spec/*.md` 必须遵守：

```markdown
# 标题（一级，文件内唯一）

> 状态：Draft | Stable | Deprecated
> 适用：AXP v1.x · Android API 26+
> 最后更新：YYYY-MM-DD

## 正文小节
```

- 教程类文档必须包含：`前置条件` / `步骤（编号）` / `验证` / `常见错误` 四节，模板见 [`docs/doc-templates.md`](docs/doc-templates.md)。
- 代码块必须标注语言；`jsonc` 表示带注释的 JSON 片段（不可直接执行）。
- 字段名一律反引号包裹，首次出现时给出所属对象路径（如 `hotReload.signature`）。

## 本地开发

```bash
node cli/bin/axp.mjs new my-plugin
node cli/bin/axp.mjs validate my-plugin
node cli/bin/axp.mjs pack my-plugin -o my-plugin.axp
```

## 提交信息

`<type>(<scope>): <subject>`，type ∈ `spec | schema | validator | cli | docs | example | chore`。
例：`spec(hot-reload): add state.migrate semantics`。

## 发布流程

1. 更新 `CHANGELOG.md` 与 `spec/09-versioning.md` 兼容表
2. 打 tag `spec-v1.x.y`
3. CI 生成 `axp-spec-<version>.zip` 产物
