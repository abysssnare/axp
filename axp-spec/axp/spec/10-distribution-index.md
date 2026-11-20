# 10 · 分发、索引与安装（M6 落地规范）

> 状态：Stable · 适用 AXP v1.x · Android API 26+ · 最后更新 2026-11-20
> 本文件展开 [`01-format.md`](01-format.md) §9，把原先「由宿主实现、不属于格式」的分发链路**补成可互操作的最小契约**。
> `02-manifest.schema.json` 不变；索引使用独立 schema [`10-index.schema.json`](10-index.schema.json)。

## 0. 为什么必须补这一章

v1.0 只定义了 `distribution.channel` 三个枚举，却把「索引格式 / 安装流程 / 信任链」全部留给宿主。
结果是：两个宿主各自实现，插件无法跨宿主分发，`axp install` 只能是一条占位报错命令（旧版 `cli/bin/axp.mjs` 直接 `fail()`）。
本章给出**格式级**的最小公共部分，使得：插件作者发一次包 → 索引可被任何宿主读取 → CLI 与 Android 宿主执行同一套安装语义。

MUST / SHOULD / MAY 按 RFC 2119。

## 1. `.axp` 分发包

分发态 `MUST` 是 zip，包根 `MUST` 含 `axp.json`。除 `01-format.md` §2 的约束外：

| 条目 | 规则 |
|---|---|
| `META-INF/AXP-MANIFEST.DIGEST` | `MUST` 存在；`sha256` 值为**除本文件与签名块外**所有包内文件的规范化摘要（`路径\nsha256\n` 按路径排序拼接后再取 sha256） |
| `META-INF/AXP-SIG.json` | `MUST` 存在；字段 `publisher`（与 `axp.json` 的 `distribution.publisher` 一致）、`digest`、`signatureScheme:"apk-v3"`、`signature`、`certChain` |
| `signature` | 生产宿主 `MUST` 校验（APK Signature Scheme v3 语义）；开发/示例宿主可用 `dev` 策略只校验 `publisher` 与 `digest` |
| 路径 | `MUST NOT` 含 `..`、绝对路径、符号链接；解压前 `MUST` 逐条校验 |

**未签名网络包禁止执行**：`MUST NOT` 从任意 URL 拉取未带 `AXP-SIG.json` 的包并装载；`hotReload.sources` 含 `network-unsigned` 时校验器已拒绝（见 `08-hot-reload.md`）。

## 2. 索引 `index.json`

索引是**分发层**文件，不进插件包。任何宿主 `MUST` 能读取下列最小字段，完整 schema 见 `10-index.schema.json`。

```jsonc
{
  "axpIndex": "1.0",
  "publisher": "sha256:<64hex>",
  "updated": "2026-11-20T00:00:00Z",
  "plugins": [
    {
      "id": "com.example.memory",
      "version": "1.0.0",
      "name": { "zh": "记忆系统", "en": "Memory" },
      "description": "带界面的记忆与储存插件",
      "channel": "session-install",
      "publisher": "sha256:<64hex>",
      "sha256": "<64hex: 整个 .axp 文件的摘要>",
      "source": "plugins/05-memory-system/com.example.memory.axp",
      "signatureScheme": "apk-v3",
      "minHost": "0.1.0",
      "minAndroid": 26,
      "abis": [],
      "requires": [],
      "capabilities": { "privilege": "L1", "requests": ["fs.read:shared", "fs.write:shared"] },
      "ui": true,
      "tools": ["memory.add", "memory.list", "memory.search", "memory.clear"]
    }
  ]
}
```

规则：

1. `plugins[]` 的 `(id, version)` 对 `MUST` 唯一；同一 `id` 允许多个 `version` 共存（供兼容性选择），宿主 `SHOULD` 选满足 `minHost`/`minAndroid` 的最高版本。
2. `sha256` `MUST` 对应 `source` 指向文件的真实摘要；安装前 `MUST` 复算。
3. `publisher` `MUST` 与包内 `axp.json` 的 `distribution.publisher` 一致；不一致 → `INSTALL_PUBLISHER_MISMATCH`。
4. `capabilities` 是**索引期快照**，安装时 `MUST` 以包内清单为准重新校验，不得用索引字段替代。
5. `source` 允许相对路径、`https://` URL 或 `file://`；URL 方式 `MUST` 走 HTTPS 且 `MUST` 验签。

## 3. `axp install` 命令契约

CLI `MUST` 实现 `install`，语义如下（旧版占位实现作废）：

```
axp install <target> [--index <index.json>] [--home <dir>] [--dev]
<target> := <plugin-dir> | <file.axp> | <id>@<range>
```

步骤（任一步失败整包拒绝、不写注册表）：

1. **解析目标**：目录直接用；`.axp` 解到临时目录；`id@range` 先读索引并按 §4 的 range 规则选版本。
2. **解包防护**：逐条校验路径，拒绝 `..` / 绝对路径 / 链接；读 `AXP-MANIFEST.DIGEST` 并复算。
3. **校验**：调用本仓 `validator/src/validate.mjs`（与 CI 同一个校验器），失败返回原错误码。
4. **验签**：`--dev` 时校验 `publisher` 格式 + `digest` 一致；生产 `MUST` 校验 `signature` 与证书链。
5. **索引一致性**：若带 `--index`，复算 `sha256`、比对 `publisher`、比对 `version`。
6. **权限确认**：`capabilities.dangerous[]` 与 L2+ 请求 `MUST` 由宿主逐项确认（CLI 输出 `CONFIRM_REQUIRED` 清单）。
7. **依赖闭包**：`requires[]` 全部已安装且满足 `range`，无环；缺失 → `INSTALL_DEPENDENCY_MISSING`。
8. **写注册表**：解包到 `$AXP_HOME/plugins/<id>/`，写 `$AXP_HOME/registry.json`（格式见 `11-plugin-management-agent.md` §2）。
9. **宿主投递**：写 `$AXP_HOME/inbox/<id>.install-intent.json`（§5），供 Android 宿主 `session-install` 消费。
10. **输出**结构化结果：`{ ok, id, version, path, privilege, tools, ui }`。

新增错误码：`INSTALL_DIGEST_MISMATCH` · `INSTALL_PUBLISHER_MISMATCH` · `INSTALL_SIGNATURE_FAILED` · `INSTALL_DEPENDENCY_MISSING` · `INSTALL_ALREADY_PRESENT` · `INSTALL_UNSAFE_ENTRY` · `INSTALL_CHANNEL_UNSUPPORTED` · `INSTALL_MIN_HOST` · `INSTALL_MIN_ANDROID` · `INSTALL_CONFIRM_REQUIRED`。

配套命令 `MUST` 一并提供：`uninstall` / `list` / `enable` / `disable` / `publish` / `index` / `agent-tools` / `invoke` / `ui` / `conformance`。

## 4. 版本区间 `range`

与 `01-format.md` §8.3 一致：`>= / > / <= / < / = / ^ / ~` 与空格分隔的 AND 组合；`^1.2.3` = `>=1.2.3 <2.0.0`，`~1.2.3` = `>=1.2.3 <1.3.0`。
宿主 `MUST` 在装载前完成闭包解析并检测环；`MUST NOT` 因为索引里有更高版本就自动升级已启用插件。

## 5. `session-install` 宿主投递

`distribution.channel` 默认 `session-install`。CLI 不直接操作 Android 进程，而是投递**安装意图**：

```json
{
  "intent": "axp.session-install/1.0",
  "id": "com.example.memory",
  "version": "1.0.0",
  "source": "<绝对路径 .axp 或已解包目录>",
  "sha256": "<64hex>",
  "publisher": "sha256:<64hex>",
  "requestedPrivilege": "L1",
  "requests": ["fs.read:shared", "fs.write:shared"],
  "createdAt": "2026-11-20T00:00:00Z"
}
```

Android 宿主 `MUST`：① 通过 SAF（`ACTION_OPEN_DOCUMENT`）或 inbox 扫描接收；② 重新执行 §3 的 2–7 步（**不得信任 CLI 的结论**）；③ 弹权限确认页；④ 写入自己的注册表并展示在插件列表。
`trusted-channel` / `preinstall` 由宿主按同一流程处理，仅来源与确认 UI 不同。

## 6. 更新、回滚与吊销

- 更新 `MUST` 走一次完整 `install`，`MUST NOT` 直接覆盖实现体；新版本失败保留旧版本。
- 宿主 `SHOULD` 保留 `rollback.keep` 代（默认 2）；回滚 `MUST` 重新验签。
- 索引 `SHOULD` 提供 `revoked: [{ publisher, reason, since }]`；命中 `MUST` 拒绝装载并提示卸载。
- 热加载仍按 `08-hot-reload.md`：不得提权、不得新增组件 id、每次验签。

## 7. 一致性要求

| 等级 | 本文件要求 |
|---|---|
| AXP-0 | 支持 §3 步骤 1–4、6–8；能安装并调用无 UI 插件 |
| AXP-1 | + §5 投递 + 索引读取 |
| AXP-2 | + 插件管理页与插件 UI 入口（见 `11`） |
| AXP-3 | + 生产验签、吊销、更新回滚、§6 全部 |

`12-host-conformance.md` 把本文件每条 MUST 变成可执行断言。
