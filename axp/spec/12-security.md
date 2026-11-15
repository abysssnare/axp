# 12 · 安全规范与威胁模型

> 状态：Stable
> 适用：AXP v1.x · 宿主实现者 / 插件发布者
> 最后更新：2026-11-15
> 规范性地位：本文件汇总并编号 AXP 的安全 `MUST`，散落在 `01` / `04` / `08` 的条款以原文为准；本文件不新增与之冲突的要求。

## 1. 信任边界

```
  发布者 ──签名──▶ .axp 包 ──验签──▶ 宿主 ──授权──▶ 设备能力
     │                                │                │
     └── 密钥/证书                    └── 用户确认      └── L0–L5
                                          │
                                          └── 审计日志（只增不改）
```

| 参与方 | 可信假设 |
|---|---|
| 发布者 | **不完全可信**；绑定其证书指纹，首次使用固定（pin） |
| `.axp` 包 | **不可信输入**；装载前逐项校验，任何失败即整体拒绝 |
| 宿主 | 可信计算基；负责验签、权限、隔离、审计 |
| 用户 | 唯一授权来源；`dangerous` 与 L2+ 必须单独确认 |
| 设备能力 | 按 L0–L5 分级开放，默认最小权限 |

**核心不变量**：清单是唯一事实源，未声明的文件一律不执行；任何时刻用户可见的插件状态要么是旧版本、要么是新版本。

## 2. 威胁与缓解（编号 S1–S12）

| ID | 威胁 | 缓解（规范性） | 对应错误码 / 章节 |
|---|---|---|---|
| S1 | 包内夹带未声明可执行文件 | 宿主 `MUST` 在装载时扫描包内可执行文件，未被清单引用即拒绝 | `UNDECLARED_EXECUTABLE` · [`01`](01-format.md) §8.7 |
| S2 | 路径穿越 / 绝对路径读包外文件 | 所有包内相对路径 `MUST` 拒绝 `..` 与绝对路径，且在解包后二次校验符号链接 | `UNSAFE_PATH` · [`01`](01-format.md) §2 |
| S3 | 未知字段夹带能力 | schema `additionalProperties: false`；宿主 `MUST NOT` 猜测未知字段语义 | `SCHEMA_ADDITIONAL_PROPERTY` · [`09`](09-versioning.md) §2 |
| S4 | 未授权权限请求 | `requests` 全在词汇表内，`dangerous ⊆ requests`，L2+ 单独确认 | `CAP_UNKNOWN_REQUEST` / `DANGEROUS_NOT_REQUESTED` · [`04`](04-capabilities.md) |
| S5 | 通配符外联 | `network.egress` `MUST NOT` 使用 `*`；`impl.url` 的 host `MUST` 精确声明 | `CAP_WILDCARD_EGRESS` / `NET_EGRESS_UNDECLARED` |
| S6 | 子代理 / 梯度越权 | `agents[].privilege`、`gradient` 键 `MUST` ≤ `capabilities.privilege` | `AGENT_EXCEEDS_PRIVILEGE` / `GRADIENT_EXCEEDS_PRIVILEGE` |
| S7 | 未签名热替换 / 降级攻击 | 每次替换 `MUST` 重新验签；`signature: on-every-load`；`sources` `MUST NOT` 含 `network-unsigned` | `HOT_SIGNATURE_POLICY` / `HOT_UNSIGNED_SOURCE` · [`08`](08-hot-reload.md) |
| S8 | 热加载提权 | 替换 `MUST NOT` 改变 `axp` / `id` / `capabilities.privilege`；`targets` 之外的组件不可替换 | [`08`](08-hot-reload.md) §3.3 |
| S9 | 类加载器无法卸载导致旧代码残留 | `dex` / `wasm` 实现体 `MUST` 用 `isolated` 类加载器 | `HOT_CLASSLOADER` |
| S10 | UI 动作指向幽灵工具 / 绑定悬空 | `actions[].tool`、`bind[].to` `MUST` 在装载时解析 | `UI_ACTION_TOOL_MISSING` / `UI_BIND_TARGET_MISSING` · [`06`](06-ui-vocab.md) |
| S11 | 审计被绕过或篡改 | 审计日志 `MUST` 只增不改；`MUST` 记录装载 / 工具调用 / 权限选择 / 热替换 / 回滚；`audit.read` 只返回本插件记录 | [`01`](01-format.md) §5.7 |
| S12 | 版本回放 / 降级安装 | 索引与更新 `MUST` 强制版本单调、`MUST` 校验 freshness 与同密钥 | [`13`](13-registry.md) §4 |

## 3. 签名与密钥

1. 分发态 `MUST` 使用 APK Signature Scheme v3；`distribution.publisher` `MUST` 为 `sha256:<64hex>` 证书指纹。
2. 宿主 `MUST` 在首次安装时固定（pin）发布者指纹；后续更新 `MUST` 由同一密钥签署。
3. 换密钥 `MUST` 视为**新插件**，需要用户重新授权全部 `dangerous` 权限，`MUST NOT` 静默继承。
4. 开发态 `MUST NOT` 使用 `dev` 签名策略处理来自网络的包；`dev` 仅限本地可信目录。参考运行时的 `strict` 模式是生产语义的基线。
5. 校验和（`SHA256SUMS`）只证明文件完整性与打包一致性，`MUST NOT` 被当作签名或身份凭证。

## 4. 权限与确认

| 层 | 用户确认 | 宿主 `MUST` |
|---|---|---|
| L0 | 不需要 | 沙箱内执行，无系统能力 |
| L1 | 系统弹窗 | 走 Android 标准权限 |
| L2 | **单独确认** | 明确告知读屏 / 手势 / 跨 App 范围 |
| L3 | **单独确认** | 明确告知 shell 身份能力 |
| L4 | **单独确认** | 明确告知 root 风险 |
| L5 | 仅预装 | 签名白名单 |

`capabilities.dangerous[]` 中的每一项 `MUST` 在装载时单独确认；权限扩张（新请求 / 提升 `privilege`）`MUST` 重新征求同意，`MUST NOT` 借热加载绕过。

## 5. 审计最小事件集

宿主 `MUST` 至少记录以下事件，字段含 `ts` / `pluginId` / `event` / `detail`：

```
load / load-rejected / tool.invoke / tool.confirm / gradient.select
surface.subscribe / event.fire / ui.bind.update / ui.action
permission.grant / permission.denied
hot.verify / hot.stage / hot.migrate / hot.swap / hot.reject / hot.rollback
```

`MUST NOT` 在审计中记录密钥、令牌、验证码原文、剪贴板原文等敏感载荷；`SHOULD` 只记录摘要或布尔标记。

## 6. 实现者与发布者责任

| 角色 | MUST |
|---|---|
| 宿主实现者 | 完成 [`../docs/host-checklist.md`](../docs/host-checklist.md) 全部 MUST 项；通过 [`11-conformance.md`](11-conformance.md) 对应等级断言 |
| 插件发布者 | 清单声明全部实现体与权限；不夹带未声明可执行文件；发布前用 `apksigner --v3` 签名 |
| 规范维护者 | 校验器错误码与 S1–S12 保持映射；新增威胁时同步更新本表 |

## 7. 漏洞披露

安全问题的报告、响应时限与披露流程见仓库根 [`../SECURITY.md`](../../SECURITY.md)。`MUST NOT` 在公开 Issue 中提交未修复的可利用细节。

## 8. 相关章节

- 权限阶梯 → [`04-capabilities.md`](04-capabilities.md)
- 热加载状态机 → [`08-hot-reload.md`](08-hot-reload.md)
- 分发与索引 → [`13-registry.md`](13-registry.md)
- 版本与兼容 → [`09-versioning.md`](09-versioning.md)
