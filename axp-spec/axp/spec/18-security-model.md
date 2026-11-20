# 18 · 安全模型与信任链

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 本文件把散落在 01/04/08/10/11/16 的安全条款收成**一张威胁模型**，并逐条映射到可执行断言。
> 「规范草案」推进到「可落地」时，这三条路径 `MUST` 优先验证：**签名 / 权限梯度 / 热加载回滚**。

## 1. 信任边界

```
[插件作者] --签名--> [.axp 分发包] --HTTPS/SAF--> [索引/安装意图] --十步安装--> [宿主注册表]
                                                                              |
                                          [用户确认] <-- 权限/危险动作 <-- [Agent 选择] <-- 工具投影
                                                                              |
                                                                    [沙箱 ctx] --> [本包 storage/surface]
```

- **不信任**：任何来自网络、文件系统、CLI、索引的清单字段；宿主 `MUST` 重新校验。
- **信任**：宿主自己的签名验证结果、用户对权限的显式确认、注册表内容。
- **不防**：宿主 App 自身被替换、设备已被 root 且用户主动授权 L4、物理接触攻击者。规范不在这些边界内提供保证。

## 2. 九步装载的攻击面与缓解（01 §7）

| 步 | 攻击面 | `MUST` 缓解 | 断言 |
|---|---|---|---|
| 1 解析 | 畸形 JSON / 超大文件 | 严格解析 + 大小上限；失败整包拒绝 | C02 |
| 2 签名 | 无签名 / 换证书 | `AXP-SIG.json` digest 复算、publisher 绑定、生产验 v3 证书链 | C12 / C14 |
| 3 引用完整性 | 路径穿越 / 未声明可执行文件 | 拒绝 `..`、绝对路径、链接；扫描 `.js/.dex/.so/.wasm/.html` | C03 / C23 |
| 4 abis | 塞入不兼容 native | 有 `.so/.dex` 而 `abis:[]` → 拒绝 | C03 |
| 5 依赖闭包 | 缺依赖 / 环 | `requires[].range` 全满足、无环 | C13 |
| 6 权限校验 | 越权请求 / 通配域名 | 封闭词汇表、`dangerous ⊆ requests`、gradient/agents 不越上限 | C04 / C22 |
| 7 注册组件 | 幽灵工具 / 幽灵节点 | `ui.actions[].tool`、`ui.bind[].to` 逐个校验 | C15 / C16 |
| 8 UI 挂载 | UI 动作绕过 confirm | 动作继承工具 `confirm`/`sideEffects` | C18 / C06 |
| 9 热加载就绪 | 提权 / 新增组件 / 未签名网络源 | 每次验签、不得提权、不得新增 id、禁 `network-unsigned` | C23 / C24 |

**任一步失败 → 整包拒绝、不部分注册**（`MUST NOT` 留下「装了一半」的插件）。

## 3. 威胁清单 T01–T13

| ID | 威胁 | 缓解条款 | 验证 |
|---|---|---|---|
| T01 | zip 路径穿越写宿主目录 | 10 §1 逐条校验路径；`INSTALL_UNSAFE_ENTRY` | C03 |
| T02 | 包内藏未声明的 `.js`/`.dex` 被执行 | 14 §4「未声明文件一律不执行」 | C03 |
| T03 | 任意 URL 拉未签名包即执行 | 10 §1「未签名网络包禁止执行」+ `HOT_UNSIGNED_SOURCE` | C23 |
| T04 | 签名摘要被替换 | `AXP-MANIFEST.DIGEST` 规范化复算 | C12 |
| T05 | 冒用他人 publisher | `distribution.publisher` 与 `AXP-SIG.json` 双向绑定 | C14 |
| T06 | 证书吊销后仍可装 | `index.revoked[]` → `INSTALL_REVOKED` | C26 |
| T07 | `gradient` 请求高于 `privilege` 的层 | `GRADIENT_EXCEEDS_PRIVILEGE` | C22 |
| T08 | 热加载时提权到 L5 | `HOT_PRIVILEGE_ESCALATION` | C23 |
| T09 | 热加载偷偷新增工具 id | `HOT_NEW_COMPONENT` | C23 |
| T10 | 插件读别的插件数据 | 16 §3 按 `id` 命名空间隔离 | C20 |
| T11 | 未声明 `fs.write` 却落盘 | `STORAGE_DENIED` | C20 |
| T12 | `destructive` 动作绕过用户确认 | `confirm:true` 强制 + UI 动作继承 | C04 / C06 / C18 |
| T13 | 插件篡改/删除审计 | 16 §3 只追加；宿主侧文件权限隔离 | `audit.read` |

## 4. 生产 vs 开发策略矩阵

| 项 | `dev`（示例/CI） | 生产宿主 |
|---|---|---|
| `AXP-SIG.json` 缺失 | 允许（只校验 publisher 格式 + digest） | **拒绝** `INSTALL_SIGNATURE_FAILED` |
| `signature` 字段 | 可为 `dev:<prefix>` | `MUST` 校验 APK Signature Scheme v3 真证书链 |
| `certChain` | 可空 | `MUST` 校验证书链与吊销 |
| 索引 `sha256` | 复算比对 | 复算比对 + TLS + 签名索引 |
| `network-unsigned` | 校验器已拒 | 校验器已拒 |
| 权限 L2+ / `dangerous` | 输出确认清单 | `MUST` 逐项弹窗确认，未确认不注册 |

`axp-android-host` 的 `SignaturePolicy.dev()` 已实现左侧；`strict()` 需接 `apksig`，README 如实列为未实现，**不虚标 AXP-3**。

## 5. 审计要求

宿主 `MUST` 记录：装载九步、每次工具选择/调用/拒绝、`confirm` 决策、`gradient` 选层及理由、热加载每次验签与回滚、安装/卸载/启停、存储拒绝。
格式：`{ at, plugin, kind, ... }` 的 append-only JSONL（CLI 写 `audit.jsonl`，Android 写 `filesDir/axp/audit.jsonl`）。
插件 `MAY` 通过 `ctx.audit.log()` 追加，`MUST NOT` 删除/改写（T13）。

## 6. 落地前必验的三条

1. **签名**：用真实 `apksigner sign --v3` 签一个包，生产宿主 `strict()` 能装；换一个字节必须拒（C12）。
2. **权限梯度**：L3 不可用时自动降 L2，L5 gradient 必须被拒（C21 / C22）。
3. **热加载回滚**：替换失败保留旧代，回滚同样验签，`state.preserve` 不丢（C23 / C24）。

`12-host-conformance.md` 的 C01–C26 与 `tools/spec-lint.mjs` 的静态断言是这三条的自动化底稿。
