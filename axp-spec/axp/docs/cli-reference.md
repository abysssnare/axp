# `axp` CLI 参考（v1.1 · spec/10 完整实现）

> 入口：`node axp/cli/bin/axp.mjs <command> [args]`
> 零依赖（Node 20+，`pack/install` 的 zip 操作调用系统 `python3`）。
> 宿主状态目录：`$AXP_HOME`（默认 `./.axp-host`），与 `axp-android-host` 共用同一份 `registry.json` 格式。

## 开发与校验

| 命令 | 说明 |
|---|---|
| `axp new <reverse.domain.id> [-o dir]` | 生成最小无 UI 插件骨架 |
| `axp validate <dir>` | schema → 引用完整性 → abis → 权限词汇表 → UI 引用 → 热加载策略 |
| `axp seal <dir>` | 写 `META-INF/AXP-MANIFEST.DIGEST` 与 `AXP-SIG.json`（dev 签名） |
| `axp pack <dir> -o x.axp` | `seal` + 校验 + 打成 zip 分发态（`--dev` 包；生产需 `apksigner sign --v3`） |
| `axp inspect <dir\|file.axp>` | 打印组件摘要，不执行实现体 |

## 分发与索引（spec/10）

| 命令 | 说明 |
|---|---|
| `axp publish <dir> --index index.json` | 打包到 `dist/`、算 sha256、写/更新索引条目 |
| `axp index <dir...> -o index.json` | 批量重建索引 |
| `axp install <dir\|file.axp\|id@range> [--index f] [--dev] [--force]` | **十步安装**（解析→摘要→校验→验签→索引一致性→权限确认清单→依赖闭包→注册表→session-install 意图→输出） |
| `axp uninstall <id>` | 删除插件目录与注册表记录 |

`install` 错误码：`INSTALL_DIGEST_MISMATCH` · `INSTALL_PUBLISHER_MISMATCH` · `INSTALL_SIGNATURE_FAILED` · `INSTALL_DEPENDENCY_MISSING` · `INSTALL_ALREADY_PRESENT` · `INSTALL_UNSAFE_ENTRY` · `INSTALL_SOURCE_MISSING` · `INSTALL_REVOKED`。
`id@range` 支持 `>= / > / <= / < / = / ^ / ~` 与 AND 组合。

> **`--dev` 的含义**：示例/开发包可无签名块，只校验 `publisher` 格式与 digest；生产宿主 `MUST` 用 APK v3 真验签，`SignaturePolicy.strict()` 在 Android 宿主里留了接口。

## 插件管理与 Agent（spec/11）

| 命令 | 说明 |
|---|---|
| `axp list` | 打印 `registry.json` |
| `axp enable <id>` / `axp disable <id>` | 启用/停用（停用后不进 Agent 工具集、不装载） |
| `axp agent-tools --json` | 扁平工具清单 `name=<pluginId>.<toolId>`，含 `description/cost/sideEffects/confirm/available` + `knowledge[]` |
| `axp invoke <plugin> <tool> '<json>' [--confirm]` | 走 `gradient` 选择 → `confirm` 门 → `impl.js` 在 vm 沙箱执行 → 审计 |
| `axp ui <plugin>` | 返回 `panel.json` + 当前 `ui.bind` 绑定快照 + `actions`（模拟「点开插件」） |

`invoke` 注入 `ctx`（`storage` / `surface` / `audit` / `ui` / `agent` / `elicit`），
`storage` 需清单声明 `runtimeServices:["storage"]` + `fs.read/write:<scope>`，否则 `STORAGE_DENIED`。
`confirm:true`、`sideEffects:"device"|"destructive"` 的工具不带 `--confirm` 时返回 `CONFIRM_REQUIRED`。

## 一致性

```bash
node axp/tools/conformance.mjs --json    # C01–C26（Node 宿主运行时行为）
node axp/tools/spec-lint.mjs --json      # S01–S09（含 host.json 能力声明校验）
java axp-android-host/conformance/ConformanceRunner.java   # 同一张表（Java core）
```

## 退出码

`0` 通过 · `1` 校验/安装/调用失败 · `2` 用法错误。
