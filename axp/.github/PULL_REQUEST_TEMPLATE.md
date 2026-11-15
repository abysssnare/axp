## 变更类型

- [ ] spec 语义变更（需先有 spec-change issue）
- [ ] schema / validator
- [ ] cli / sdk
- [ ] 教程 / 文档
- [ ] 示例插件

## 变更内容

<!-- 一句话说清改了什么 -->

## 兼容影响

- [ ] 无破坏性变更
- [ ] 有破坏性变更，已在 `spec/09-versioning.md` 与 `CHANGELOG.md` 写明迁移路径

## 自检

- [ ] `01-format.md` 字段表已同步
- [ ] `02-manifest.schema.json` 已同步
- [ ] `validator/src/validate.mjs` 已同步
- [ ] `examples/` 至少一个示例覆盖新字段
- [ ] `node validator/src/validate.mjs examples/*` 全绿
- [ ] 规范正文未引入外部格式字段名（仅 `07-expression-map.md` / `faq.md` 允许）
