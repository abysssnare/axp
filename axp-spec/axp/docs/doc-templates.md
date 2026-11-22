# 文档格式与模板

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

本文件统一仓库内所有 `spec/*.md` / `docs/*.md` 的格式，并提供可直接复制的模板。贡献规则见 [`../CONTRIBUTING.md`](../CONTRIBUTING.md)。

## 1. 通用头（所有文档 MUST）

```markdown
# 标题（文件内唯一一级标题）

> 状态：Draft | Stable | Deprecated
> 适用：AXP v1.x · Android API 26+
> 最后更新：YYYY-MM-DD
```

规范类文档额外 `MUST` 在开头写明「本文件是否属于规范性正文」——只有 `spec/01-format.md` 是唯一规范性正文，`07-expression-map.md` 必须标注「外部验收材料，非规范正文」。

## 2. 教程类文档 MUST 包含四节

```
## 前置条件
## 步骤 N · ...（编号，每节一个可验证动作）
## 验证（勾选清单）
## 常见错误（表格：现象 / 原因 / 修法）
```

### 集成教程模板

```markdown
# 宿主集成教程：<主题>

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：YYYY-MM-DD

本教程面向**宿主开发者**。规范依据见 [`../spec/01-format.md`](../spec/01-format.md)。

## 前置条件
| 项 | 要求 |
|---|---|

## 步骤 1 · <动作>
```kotlin
// 可运行片段
```

## 步骤 2 · <动作>
...

## 验证
| 检查 | 期望 |
|---|---|

## 常见错误
| 现象 | 原因 | 处理 |
|---|---|---|
```

## 3. 插件 README 模板（每个示例 / 第三方插件 SHOULD 使用）

```markdown
# <插件名>

> AXP v1.0 · 权限 L? · 宿主等级 AXP-?

## 做什么
一句话。

## 组件
| 类型 | id / uri | 说明 |
|---|---|---|

## 权限
- privilege: L?
- requests: `...`
- dangerous: `...`

## 热加载
启用 / 未启用；可替换范围 `targets`。

## 安装
\```bash
axp validate .
axp pack . -o <name>.axp
apksigner sign --v3 --ks release.jks <name>.axp
\```

## 验证
- [ ] ...
```

## 4. spec 变更提案模板

见 [`.github/ISSUE_TEMPLATE/spec-change.md`](../.github/ISSUE_TEMPLATE/spec-change.md)。必须回答：

1. 动机与写不了的真实场景
2. `axp.json` 片段
3. 对「同级独立定位」的影响（不引入外部格式名 / 协议 / 运行时）
4. 兼容影响与迁移路径
5. 需要同步修改的文件清单

## 5. 代码块约定

| 标注 | 含义 |
|---|---|
| `json` | 可直接解析的 JSON |
| `jsonc` | 带注释／省略号的片段，**不可直接执行** |
| `kotlin` / `js` / `bash` / `yaml` / `xml` | 对应语言 |
| `text` | 目录树、时序等纯文本 |

字段名首次出现时 `MUST` 给出对象路径，如 `hotReload.signature`、`ui.bind[].to`。

## 6. 链接约定

- 仓库内链接用相对路径，`docs/` → `../spec/...`，`spec/` → `../docs/...`
- CI 会检查 `README.md` 的所有本地链接是否存在
- 外部链接只用于标准／工具官网，不用于证明 AXP 语义

## 7. 措辞约定

| 用 | 不用 |
|---|---|
| 同级独立格式 | 收编 / 上层 / 元格式 / 桥 / 兼容层 |
| 表达能力覆盖 | （在规范正文里）罗列外部格式字段名 |
| 宿主实现细节 | 协议 / 握手 / 方法表（作为格式的一部分描述） |
| `impl.proc` 通用外部进程 | 点名某个外部协议名 |
