# 19 · 错误码总表（规范性）

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 本文件是**唯一规范性错误码表**；`axp/validator/README.md` 是其实现说明。
> `tools/spec-lint.mjs` 会双向校验：校验器里实际抛出的 code `MUST` 都出现在本表，本表 code `MUST NOT` 重复。

## 0. 错误响应结构

```jsonc
{ "ok": false, "error": "<CODE>", "detail": "<human readable>", "path": "axp.json#/tools/0", "steps": ["resolve", "validate"] }
```

- 校验器返回 `{ ok, errors:[{code,msg,path}], warnings:[...], info:[...], summary }`；
- 安装/调用/UI 返回 `{ ok, error, detail }`；
- 一致性套件返回 `{ suite, hostLevel, passed, failed, cases:[{id,level,ok,detail}] }`；
- 退出码：`0` 通过 · `1` 业务失败 · `2` 用法/环境错误。

**原则**：`MUST NOT` 用「静默降级」代替错误码；`MUST NOT` 把多个不同原因合并成一个模糊码。

## 1. Schema / 清单解析（校验期）

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `SCHEMA_FALSE` | schema 为 `false` 却给了值 | 拒绝字段 | 02 |
| `SCHEMA_TYPE` | 类型不符 | 拒绝字段 | 02 |
| `SCHEMA_ENUM` | 不在枚举内 | 拒绝字段 | 02 |
| `SCHEMA_CONST` | 不等于常量（如 `axp:"1.0"`） | 拒绝字段 | 02 |
| `SCHEMA_REQUIRED` | 缺必填字段 | 拒绝整包 | 02 / 14 |
| `SCHEMA_ADDITIONAL_PROPERTY` | 未知顶层/子字段 | **整包拒绝**（严格模式） | 01 §3 / 14 |
| `SCHEMA_MINLENGTH` | 字符串过短 | 拒绝字段 | 02 |
| `SCHEMA_MINIMUM` | 数值低于下限（如 `minAndroid<26`） | 拒绝字段 | 02 |
| `SCHEMA_MAXIMUM` | 数值高于上限 | 拒绝字段 | 02 |
| `SCHEMA_MINPROPERTIES` | 对象属性过少（如 `name:{}`） | 拒绝字段 | 02 |
| `SCHEMA_MINITEMS` | 数组过短 | 拒绝字段 | 02 |
| `SCHEMA_CONTAINS` | 无匹配元素 | 拒绝字段 | 02 |
| `SCHEMA_ANYOF` | `anyOf` 无分支命中 | 拒绝字段 | 02 |
| `SCHEMA_NOT` | `not` 被意外满足 | 拒绝字段 | 02 |
| `SCHEMA_PATH` | schema 内部路径解析失败 | 拒绝字段 | 02 |
| `MANIFEST_MISSING` | 目录或 `axp.json` 不存在 | 拒绝整包 | 14 |
| `MANIFEST_PARSE` | JSON 解析失败 | 拒绝整包 | 14 |
| `ID_INVALID` | `id` 非反向域名 | 拒绝整包 | 14 |
| `VERSION_INVALID` | `version` 非 semver | 拒绝整包 | 09 / 14 |
| `PUBLISHER_INVALID` | `publisher` 非 `sha256:<64hex>` | 拒绝整包 | 10 |
| `DUP_ID` | 组件 id 重复 | 拒绝整包 | 14 |

## 2. 引用 / 实现体 / 平台

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `UNSAFE_PATH` | 引用含 `..` / 绝对路径 / `http` | 整包拒绝 | 14 §4 |
| `IMPL_FILE_MISSING` | 被引用的文件不存在 | 整包拒绝 | 14 §4 |
| `UNDECLARED_EXECUTABLE` | 包内有未被引用的可执行文件 | 整包拒绝 | 14 §4 |
| `ABI_MISSING` | 有 `.so/.dex` 但 `abis:[]` | 整包拒绝 | 03 / 14 |
| `WARN_ABI_EMPTY` | `abis:[]` 且无二进制（**warning**） | 仅提示 | 03 |
| `IMPL_UNAVAILABLE` | 七形态全不可用 | 工具调用返回不可用，**宿不崩** | 03 / 16 |
| `IMPL_NO_RUN` | JS 未导出 `run` | 调用失败 | 16 §4 |
| `IMPL_ERROR` | 实现体抛异常 | 捕获并结构化返回 | 16 §4 |
| `IMPL_TIMEOUT` | 执行超时 | 终止沙箱 | 16 §4 |

## 3. 权限 / 能力

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `CAP_UNKNOWN_REQUEST` | 权限词不在封闭词汇表 | 拒绝整包 | 04 §2 |
| `CAP_WILDCARD_EGRESS` | `network.egress:*` 通配 | 拒绝整包 | 04 §2 |
| `DANGEROUS_NOT_REQUESTED` | `dangerous` 项未同时出现在 `requests` | 拒绝整包 | 14 §2.7 |
| `NET_EGRESS_UNDECLARED` | `impl.url` 主机缺 `network.egress:<host>` | 拒绝整包 | 03 |
| `GRADIENT_EXCEEDS_PRIVILEGE` | gradient 键高于 `privilege` | 拒绝整包 | 04 / 14 |
| `AGENT_EXCEEDS_PRIVILEGE` | agent privilege 高于清单上限 | 拒绝整包 | 14 §2.4 |
| `TOOL_CONFIRM_REQUIRED` | `destructive` 工具缺 `confirm:true` | 拒绝整包 | 14 §2.1 |

## 4. Surface / UI

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `SURFACE_NOT_WATCHABLE` | bind/event 指向 `watchable:false` | 拒绝整包 | 05 / 17 |
| `SURFACE_UNDECLARED` | `ctx.surface.publish` 的 uri 未声明；`ui.bind[].from` 未在本包 `surfaces[]` 声明 | 校验期拒绝整包 / 运行时拒绝 | 16 §3 / 01 §5.6 |
| `UI_ACTION_TOOL_MISSING` | `ui.actions[].tool` 指向幽灵工具 | 拒绝整包 | 15 §4 |
| `UI_BIND_TARGET_MISSING` | `ui.bind[].to` 节点不存在 / panel 解析失败 | 拒绝整包 | 15 §3 |
| `DOMAIN_UNAVAILABLE` | 宿主未实现该域适配器 | 结构化返回，不静默 | 17 |
| `DOMAIN_NAMESPACE_VIOLATION` | 自定义域前缀不是自身 `id` | 拒绝整包 | 05 §4 / 17 |
| `NO_UI` | 对无 `ui{}` 插件请求界面 | 返回提示 | 11 §5 |

## 5. 热加载

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `HOT_SIGNATURE_POLICY` | 启用但未 `signature:on-every-load` | 拒绝整包 | 08 |
| `HOT_UNSIGNED_SOURCE` | `sources` 含 `network-unsigned` | 拒绝整包 | 08 |
| `HOT_CLASSLOADER` | 未 `classloader:isolated` | 拒绝整包 | 08 |
| `HOT_NO_TARGETS` | `targets:[]` | 拒绝整包 | 08 |
| `HOT_UI_LIFECYCLE` | targets 含 `ui.*` 但缺 `onReload/onUnload` | 拒绝整包 | 08 / 15 |
| `HOT_PRIVILEGE_ESCALATION` | 热替换提高权限层 | 拒绝替换，保留旧代 | 08 / 18 |
| `HOT_SIGNATURE_FAILED` | 热替换换 publisher / 验签失败 | 拒绝替换 | 08 / 10 |
| `HOT_NEW_COMPONENT` | 热替换新增组件 id | 拒绝替换 | 08 |

## 6. 分发 / 安装（10）

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `INSTALL_SOURCE_MISSING` | 目标目录/`.axp`/索引项不存在 | 不写注册表 | 10 §3 |
| `INSTALL_UNSAFE_ENTRY` | zip 条目含 `..` / 绝对路径 / 链接 | 解包中止 | 10 §1 |
| `INSTALL_UNPACK_FAILED` | zip 损坏 | 解包中止 | 10 §3 |
| `INSTALL_DIGEST_MISMATCH` | `AXP-MANIFEST.DIGEST` 或索引 `sha256` 复算不符 | 整包拒绝 | 10 §1/§3 |
| `INSTALL_PUBLISHER_MISMATCH` | 签名块/索引 publisher 与清单不一致 | 整包拒绝 | 10 §3 |
| `INSTALL_SIGNATURE_FAILED` | 缺签名块（生产）/ scheme 不符 / 证书链失败 | 整包拒绝 | 10 §1 |
| `INSTALL_REVOKED` | 命中 `index.revoked[]` | 整包拒绝 | 10 §6 |
| `INSTALL_DEPENDENCY_MISSING` | `requires` 缺失/不满足/成环 | 整包拒绝 | 10 §4 |
| `INSTALL_ALREADY_PRESENT` | 同 id 已安装（无 `--force`） | 保留原版本 | 10 §3 |
| `INSTALL_NOT_FOUND` | 卸载/启停时 id 不存在 | 无操作 | 11 §2 |
| `INSTALL_MIN_HOST` | 宿主版本低于 `minHost` | 整包拒绝 | 20 §3 |
| `INSTALL_MIN_ANDROID` | 设备 API 低于 `minAndroid` | 整包拒绝 | 14 |
| `INSTALL_ABI_UNSUPPORTED` | 非空 `abis` 与 `host.json.supportedAbis` 无交集 | 整包拒绝 | 20 §3 / 21 §5 |
| `INSTALL_HOST_LEVEL` | 插件声明等级高于 `host.json.hostLevel` | 整包拒绝 | 20 §4 / 21 §5 |
| `INSTALL_CONFIRM_REQUIRED` | L2+/`dangerous` 未逐项确认 | 不写注册表 | 10 §3 步 6 |
| `INSTALL_CHANNEL_UNSUPPORTED` | 宿主不支持 `distribution.channel` | 整包拒绝 | 10 |
| `PACK_FAILED` | 打包/写签名块失败 | 不产出 `.axp` | 10 |
| `CERT_MISSING` | strict 模式缺证书 | 整包拒绝 | `runtime/` |

## 7. 运行时 / 调用 / 上下文（11 / 16）

| code | 触发 | 宿主动作 | 定义 |
|---|---|---|---|
| `CONFIRM_REQUIRED` | `destructive`/`device` 工具未确认 | 不执行，请求确认 | 11 §3 / 18 |
| `TOOL_NOT_FOUND` | 插件或工具 id 不存在 | 结构化返回 | 11 §3 |
| `PLUGIN_DISABLED` | 调用 `enabled:false` 的插件 | 结构化返回 | 11 §2 |
| `STORAGE_DENIED` | 未声明 `fs.read/write` 却用 `ctx.storage` | 拒绝，不落盘 | 16 §3 |
| `CONTEXT_DENIED` | 未声明 `runtimeServices` 却用 `sampling/elicitation/ui.push` | 拒绝 | 16 §2 |
| `HOST_DECLARATION_INVALID` | 宿主 `host.json` 缺失 / 不符合 `21-host-capabilities.schema.json` | 拒绝协商并报宿主配置错误 | 21 §5 |
| `HOST_CAPABILITY_MISMATCH` | 插件要求的 `impl`/`uiForm`/`channel`/`ctx` 宿主未声明 | 标 `available:false` 或整包拒绝（按档） | 21 §5 |
| `HOST_LEVEL_UNDECLARED` | 宿主未声明 `hostLevel` 却宣称通过套件 | 一致性声明无效 | 13 §6 / 21 §5 |
| `IMPL_ON_MAIN_THREAD` | 宿主在 Android 主线程执行 `impl` | 开发期断言失败；生产应改异步 | 21 §7 |
> `SURFACE_UNDECLARED` 见 §4（同码同义，不重复定义）。

## 8. 与一致性套件的对应

- §1–§5 主要由 C01–C04、C10、C15、C16、C22、C23、C25 覆盖（校验器行为，31 条用例 + 47 项双引擎复核）；
- §6 由 C07、C12、C13、C14、C26 覆盖（分发/安装/吊销）；
- §7 由 C05、C06、C08、C18、C20 覆盖（调用/确认/存储隔离）；
- 本表 code 集合由 `tools/spec-lint.mjs` 与 `validator/src/validate.mjs` 做双向静态核对。
