---
name: 规范变更提案
about: 提议新增 / 修改 AXP 格式字段或语义
title: "spec: "
labels: spec
assignees: ''
---

## 提案摘要

<!-- 一到两句话 -->

## 动机与场景

<!-- 哪个真实插件 / 宿主场景写不了，为什么现有字段不够 -->

## 提议的字段或语义

```jsonc
{
  // 给出 axp.json 片段
}
```

## 对同级独立定位的影响

- [ ] 不引入任何外部格式名
- [ ] 不引入协议 / transport / 握手概念
- [ ] 不需要接入外部插件运行时

## 兼容影响

| 项 | 说明 |
|---|---|
| 新增 / 修改 / 删除 | |
| 旧插件是否仍可通过校验 | |
| 宿主最低版本变化 | |

## 需要同步修改的文件

- [ ] `spec/01-format.md`
- [ ] `spec/02-manifest.schema.json`
- [ ] `validator/src/validate.mjs`
- [ ] `examples/`
- [ ] `docs/`
- [ ] `CHANGELOG.md` / `spec/09-versioning.md`
