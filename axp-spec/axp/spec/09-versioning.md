# 09 · 版本与兼容

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

## 1. 三个版本号

| 字段 | 含义 | 变更时机 |
|---|---|---|
| `axp` | 格式版本（本版 `"1.0"`） | 组件模型或清单结构不兼容变更 |
| `minHost` | 宿主最低版本 | 插件用到新宿主能力时 |
| `version` | 插件自身语义化版本 | 插件内容变更 |

`distribution.signatureScheme` 与签名算法版本另计。

## 2. 兼容规则

| 变更 | 兼容性 | 处理 |
|---|---|---|
| 新增可选字段 | 向后兼容 | 旧宿主忽略未知字段？**否** —— `additionalProperties: false`，旧宿主 `MUST` 升级 schema 或拒绝并提示 |
| 新增枚举值 | 向后兼容 | 旧宿主视为不可用，不报错 |
| 删除字段 / 改字段类型 | 破坏性 | 提升 `axp` 主版本 |
| 收紧 `required` | 破坏性 | 提升 `axp` 主版本 |
| 权限词汇表新增项 | 向后兼容 | 旧宿主按 `CAP_UNKNOWN_REQUEST` 拒绝，需升级 |

> AXP 选择严格 schema（`additionalProperties: false`）而非宽容解析，因为清单是安全边界：未知字段可能携带未声明的能力。

## 3. 弃用流程

1. 在 `CHANGELOG.md` 标记 `Deprecated`，给出替代字段
2. 至少保留一个次版本周期
3. 校验器产出 `WARN_DEPRECATED`（警告，不阻断）
4. 下个主版本删除

## 4. 宿主版本协商

```
装载前：host.version >= manifest.minHost ?
        否 → 拒绝，错误码 HOST_TOO_OLD
        是 → 继续
```

宿主 `SHOULD` 在收到更高 `axp` 版本的包时给出明确升级提示，`MUST NOT` 猜测未知字段语义。

## 5. 热加载版本约束

见 [`08-hot-reload.md`](08-hot-reload.md) §3.3：热加载 `MUST NOT` 改变 `axp` 格式版本、`id`、`capabilities.privilege`；只能替换实现体与 `version`。

## 6. spec 发布物

每个 tag `spec-v1.x.y` 附带：

- `axp-spec-<version>.zip`（`spec/` 全量）
- `CHANGELOG.md` 差异摘要
- `validator` 对应版本的可执行文件
