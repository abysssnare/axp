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
| 新增可选字段 | **格式层不兼容** | `additionalProperties: false` 使旧 schema 直接拒绝；`MUST` 随新 schema 一同发布，旧宿主 `MUST` 拒绝并提示升级，`MUST NOT` 忽略未知字段 |
| 新增枚举值 | **格式层不兼容** | `enum` 是封闭集合，旧 schema 同样拒绝；`MUST` 随新 schema 发布，旧宿主 `MUST` 提示升级而非把该值当作「不可用」静默放过 |
| 删除字段 / 改字段类型 | 破坏性 | 提升 `axp` 主版本 |
| 收紧 `required` | 破坏性 | 提升 `axp` 主版本 |
| 权限词汇表新增项 | 实现层兼容 / 校验器不兼容 | 旧校验器按 `CAP_UNKNOWN_REQUEST` 拒绝；`MUST` 先升级校验器，再发布使用该权限的包 |
| 新增规范章节 / 勘误 / 编辑性修订 | **完全兼容** | 不改 `formatVersion`，只提升 `specVersion`（见 §7） |

> AXP 选择严格 schema（`additionalProperties: false`）而非宽容解析，因为清单是安全边界：未知字段可能携带未声明的能力。因此「新增可选字段」在宽容格式里通常算向后兼容，**在 AXP 里不算**——这是 v1.0 表格把「向后兼容」与「旧宿主 MUST 拒绝」并列的自相矛盾之处，v1.1.0 予以勘误。

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
- `validator` 对应版本的源码（零依赖，可直接运行）

tag 名 `MUST` 形如 `spec-v<specVersion>` 且与 [`index.json`](index.json) 的 `specVersion` 一致；完整流程见 [`../docs/release.md`](../docs/release.md) 与 [`10-infrastructure.md`](10-infrastructure.md) §8。

---

## 7. 文档版本与格式版本分离

| 版本 | 载体 | 谁能改它 |
|---|---|---|
| `formatVersion`（`axp: "1.0"`） | 清单字段 + `index.json.formatVersion` | 只有组件模型 / 清单结构的不兼容变更 |
| `specVersion`（本版 `1.1.0`） | `index.json.specVersion` + git tag | 新增章节、勘误、编辑性修订、威胁表更新 |
| 工具链版本 | `cli/package.json`、`validator/package.json` | 校验器行为或 CLI 变化 |
| 站点仓库版本 | 根 `package.json` | 站点 / CI / 文档变化 |

`specVersion` 提升 `MUST NOT` 隐式改变 `formatVersion`。反过来说：**新增 4 篇规范章节、修正 URI 示例、补齐章节编号，都不得要求已有插件修改 `axp.json`**——这是判断一次修订是否「格式语义不变」的实操标准。版本对齐表见 [`10-infrastructure.md`](10-infrastructure.md) §9。
