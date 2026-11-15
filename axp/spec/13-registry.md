# 13 · 索引与分发规范（M6）

> 状态：Draft（可实施）
> 适用：AXP v1.x · 宿主 / 索引维护者
> 最后更新：2026-11-15
> 规范性地位：本章定义**格式之外的分发描述层**，补齐 [`01-format.md`](01-format.md) §9 与路线图 M6。它不改变 `.axp` 包结构；宿主可自行选择是否实现索引，但实现时 `MUST` 遵循本章。

## 1. 定位

`01` §9 说「索引与信任链由宿主实现，不属于格式」——这句话划清了**格式边界**，但没有给宿主一个可互操作的索引写法。本章补上：索引是**宿主编排安装与更新的输入**，不是插件清单的一部分。

```
axp.json（包内，格式定义）  ≠  axp-index.json（宿主侧，分发定义）
```

| 文件 | 谁写 | 谁读 | 是否签名 |
|---|---|---|---|
| `axp.json` | 插件发布者 | 宿主装载器 | 随 `.axp` 包签名 |
| `axp-index.json` | 索引维护者 | 宿主更新器 | **必须**由索引密钥签名 |

## 2. 三种分发通道

| channel | 信任来源 | 宿主 `MUST` |
|---|---|---|
| `session-install` | 用户在本次会话中主动选择并确认 | 走 Android 会话安装语义；展示发布者、权限、版本；`MUST NOT` 静默安装 |
| `trusted-channel` | 预先配置的签署通道（索引密钥 + TLS） | 验索引签名、验包签名、校验 freshness |
| `preinstall` | 系统镜像 / 设备厂商 | 只允许 L5 类能力；`MUST` 记录来源 |

`MUST NOT` 支持「从任意 URL 拉取未签名包即执行」（[`01`](01-format.md) §9 / [`12`](12-security.md) S7）。

## 3. `axp-index.json` 格式

```jsonc
{
  "schema": "axp-index/1.0",
  "indexId": "com.example.axp.index",
  "updatedAt": "2026-11-15T00:00:00Z",
  "ttlSeconds": 3600,
  "publisher": "sha256:<索引签名证书指纹>",
  "plugins": [
    {
      "id": "com.example.autopay",
      "name": { "zh": "自动记账" },
      "channel": "session-install",
      "publisher": "sha256:<发布者证书指纹>",
      "releases": [
        {
          "version": "1.2.0",
          "axp": "1.0",
          "minAndroid": 26,
          "abis": ["arm64-v8a"],
          "url": "https://cdn.example.com/com.example.autopay/1.2.0.axp",
          "sha256": "<64hex>",
          "size": 20480,
          "signatureScheme": "apk-v3",
          "privilege": "L3",
          "requests": ["accessibility.gestures", "notification.listen"],
          "releasedAt": "2026-11-14T00:00:00Z",
          "changelog": "修复 OCR 回退路径"
        }
      ]
    }
  ],
  "signature": "sha256:<对除 signature 外全部字段的规范化签名>"
}
```

### 3.1 字段约束

| 字段 | 约束 |
|---|---|
| `schema` | `const: "axp-index/1.0"` |
| `indexId` | 反向域名，全局唯一 |
| `updatedAt` | ISO 8601 UTC；`MUST NOT` 晚于当前时间 + 5 分钟 |
| `ttlSeconds` | `>= 60`；过期索引 `MUST NOT` 用于自动更新 |
| `plugins[].id` | 与包内 `axp.json.id` `MUST` 完全一致 |
| `releases[].version` | 语义化版本；同一插件内 `MUST` 严格单调（见 §4） |
| `releases[].sha256` | 分发包的 SHA-256；`MUST` 与实际下载字节一致 |
| `releases[].publisher` | `MUST` 等于插件包 `distribution.publisher`（同密钥约束） |
| `releases[].url` | `MUST` 为 https；`MUST NOT` 含凭据 |
| `signature` | `MUST` 覆盖除自身外全部字段的规范化 JSON（键排序、无空白） |

**最小化原则**：索引 `MUST NOT` 携带实现体代码、模型权重、提示词正文或任何可执行内容；它只是「去哪拿、拿什么、谁签的」。

## 4. 更新与回滚规则

1. **版本单调**：宿主 `MUST` 拒绝 `version < 已安装版本` 的更新；`MUST` 拒绝相同版本但 `sha256` 不同的包（防替换）。
2. **同密钥**：更新 `MUST` 由与已安装版本相同的发布者密钥签署；换密钥按 [`12`](12-security.md) §3 视为新插件。
3. **freshness**：`MUST` 校验 `now - updatedAt <= ttlSeconds`；过期索引只可用于「提示用户手动检查」，`MUST NOT` 触发自动更新。
4. **格式版本**：`releases[].axp` 高于宿主支持版本时 `MUST` 提示升级宿主，`MUST NOT` 猜测未知字段（[`09`](09-versioning.md) §4）。
5. **回滚**：宿主 `MUST` 保留至少 `hotReload.rollback.keep` 代本地副本；回滚 `MUST` 复用已验签的旧包字节，`MUST NOT` 重新下载旧版本。
6. **权限扩张**：新版本 `requests` / `privilege` 超出已授权集合时 `MUST` 重新征求同意。

## 5. `session-install` 状态机

```
  ┌────────┐  用户选择   ┌──────────┐  展示信息   ┌──────────┐
  │  IDLE  │ ─────────▶ │ PREVIEW  │ ─────────▶ │ CONSENT  │
  └────────┘            └──────────┘            └──────────┘
       ▲                      │ 用户取消             │ 同意
       │                      ▼                      ▼
       │                 ┌──────────┐ 验签+校验和 ┌──────────┐
       │                 │ CANCELED │◀───────────│ DOWNLOAD │
       │                 └──────────┘   失败      └──────────┘
       │                                              │ 成功
       │            ┌──────────┐  装载 9 步   ┌──────────▼┐
       └────────────┤ REJECTED │◀────────────│  VERIFY   │
                    └──────────┘   失败       └───────────┘
                                                   │ 成功
                                              ┌────▼────┐
                                              │ INSTALLED│
                                              └─────────┘
```

`PREVIEW` 阶段 `MUST` 展示：`id`、`version`、发布者指纹、`privilege`、`requests`、`dangerous`、包大小、`sha256`。任一阶段失败 `MUST` 回到 `IDLE` 且不残留部分安装。

## 6. 校验和清单

发布物目录 `MUST` 附 `SHA256SUMS`：

```
<sha256>  axp-spec-1.1.0.zip
<sha256>  com.example.autopay-1.2.0.axp
```

宿主 `MUST` 用 `sha256sum -c` 或等价方式校验。`SHA256SUMS` 本身 `MUST` 随索引签名一起保护，否则清单可被替换。校验和 `MUST NOT` 替代签名（[`12`](12-security.md) §3.5）。

## 7. 宿主实现清单

- [ ] 解析并验 `axp-index.json` 签名
- [ ] 校验 `updatedAt` / `ttlSeconds`
- [ ] 下载前比对 `size`，下载后比对 `sha256`
- [ ] 验 `apk-v3` 包签名与 `publisher` pin
- [ ] 版本单调 / 同密钥 / freshness / 权限扩张检查
- [ ] `PREVIEW` 展示全部必需字段，单独确认 `dangerous`
- [ ] 失败路径不留部分安装，审计记录 `load-rejected`
- [ ] 保留回滚副本，回滚复用本地已验签字节

对应任务见 [`../ROADMAP-ALL-TASKS.md`](../../ROADMAP-ALL-TASKS.md) F07 / E10。

## 8. 相关章节

- 分发字段 → [`01-format.md`](01-format.md) §9
- 构建产物与发布 → [`10-infrastructure.md`](10-infrastructure.md) §6 / §8
- 安全约束 → [`12-security.md`](12-security.md)
- 发布流程 → [`../docs/release.md`](../docs/release.md)
