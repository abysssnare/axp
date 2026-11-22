# 12 · 宿主一致性测试套件（可执行）

> 状态：Stable · 适用 AXP v1.x · 最后更新 2026-11-20
> 目的：把 `host-checklist.md` 从「人工勾选表」变成**任何一个宿主都能跑的自动化断言**。
> 参考实现：本仓 `tools/conformance.mjs`（Node/CLI 宿主）与 `axp-android-host/conformance/`（Java/Android 宿主 core）。

## 1. 输出格式

`axp conformance --json` `MUST` 输出：

```jsonc
{ "suite":"axp-conformance/1.0", "hostLevel":"AXP-2",
  "passed": 24, "failed": 0,
  "cases": [ { "id":"C07", "level":"AXP-0", "ok":true, "ms":3, "detail":"..." } ] }
```

退出码：`0` = 全部通过；`1` = 有失败；`2` = 环境不满足（仍输出报告）。
宿主 `SHOULD` 在 README 声明通过哪一级；`MUST NOT` 把未实现项标成通过。

## 2. 用例表

### AXP-0（装载 + 工具）
| ID | 断言 |
|---|---|
| C01 | 合法最小清单装载成功，9 步流水线顺序记录 |
| C02 | 未知顶层字段 → `SCHEMA_ADDITIONAL_PROPERTY`，整包拒绝 |
| C03 | 路径穿越 / 未声明可执行文件 → `UNSAFE_PATH` / `UNDECLARED_EXECUTABLE` |
| C04 | `destructive` 工具缺 `confirm:true` → `TOOL_CONFIRM_REQUIRED` |
| C05 | 调用 `demo.echo` 返回预期结构；审计日志有记录 |
| C06 | `device` 工具未确认 → `CONFIRM_REQUIRED`；确认后成功 |
| C07 | `install` 一个目录插件后注册表可查；重复安装 → `INSTALL_ALREADY_PRESENT` |
| C08 | `enable/disable` 后工具集随之增减 |

### AXP-1（数据面 + 知识 + 分发）
| ID | 断言 |
|---|---|
| C09 | `watchable` Surface 发布 delta → 订阅者收到 |
| C10 | `ui.bind.from` 指向不可订阅 Surface → `SURFACE_NOT_WATCHABLE` |
| C11 | `knowledge.progressive` 三级披露、`allowedTools` 白名单生效 |
| C12 | 索引 `sha256` 不匹配 → `INSTALL_DIGEST_MISMATCH` |
| C13 | `id@^1.0.0` 选到最高兼容版本；`requires` 缺失 → `INSTALL_DEPENDENCY_MISSING` |
| C14 | `session-install` 意图文件字段完整且宿主重新校验（不信任 CLI 结论） |

### AXP-2（全组件 + UI）
| ID | 断言 |
|---|---|
| C15 | `ui.actions[].tool` 指向幽灵工具 → `UI_ACTION_TOOL_MISSING` |
| C16 | `ui.bind[].to` 节点不存在 → `UI_BIND_TARGET_MISSING` |
| C17 | 插件 UI 页渲染 `panel.json` 节点，`bind` 随 delta 自动刷新 |
| C18 | 点击 UI 动作 → 到达本包工具并继承 `confirm` 策略 |
| C19 | `agent-tools` 输出全局唯一 `name`，含 `cost/sideEffects/available` |
| C20 | `storage` 反向通道按 `id` 隔离；未声明 `fs.write` → `STORAGE_DENIED` |

### AXP-3（梯度 + 热加载 + 信任链）
| ID | 断言 |
|---|---|
| C21 | `gradient` 选当前最高可用层；L3 不可用时降级 L2 |
| C22 | `gradient` 键高于 `capabilities.privilege` → `GRADIENT_EXCEEDS_PRIVILEGE` |
| C23 | 热加载每次验签；提权 / 换发布者 / 新增组件 id 全被拒绝 |
| C24 | 热替换保留 `state.preserve`，失败自动回滚且回滚也验签 |
| C25 | `allowDynamicCode:false` 不误杀合法热加载 |
| C26 | 吊销列表命中 → 拒绝装载 |

## 3. 与既有自检的关系

| 套件 | 覆盖 |
|---|---|
| `validator/test/run-tests.mjs`（31） | 校验器行为，本文件 C02–C04/C10/C15/C16/C22 复用其错误码 |
| `validator/test/schema-crosscheck.py`（47） | 双引擎 schema 一致性 |
| `runtime/test/smoke.mjs`（30） | 参考运行时语义，C09/C17/C18/C21/C23–C25 复用 |
| **`tools/conformance.mjs`（本文件新增）** | **端到端分发/安装/注册表/Agent/UI/存储**，前三者不管的部分 |
| `axp-android-host/conformance` | 同一用例表在 **Java core** 上再跑一遍，证明 Android 宿主逻辑与规范一致 |

四套全绿是发布的最低门槛；宿主 `SHOULD` 在 CI 里同时跑 `node tools/conformance.mjs` 与 Java core 的 `ConformanceMain`。

## 4. 判定

- 某等级全部用例通过 → 可声明该等级；
- 某用例因**明确未实现**失败 → `SHOULD` 标 `skipped` 并说明，不得标 `ok`；
- 本仓 Node 参考宿主声明 **AXP-3**；Android 宿主 `axp-android-host` 声明 **AXP-2**（热加载/真验签见其 README 的未实现项）。


## 5. v1.1 新增：静态一致性断言（`tools/spec-lint.mjs`）

C01–C26 验证**运行时行为**，I01–I10（21 §11）验证**第三方 App 接入**，`spec-lint` 验证**规范文本自身**是否自洽。三者都全绿才算发布就绪。

| 断言 | 内容 |
|---|---|
| S01 | `spec/01..21` 编号连续、全部存在；5 个附属 schema 可被 `JSON.parse` |
| S02 | `02-manifest.schema.json` 的 21 个顶层 `properties` 与 `14-manifest-reference.md` 表格字段集合**完全一致** |
| S03 | 全部 `panel.json`（规范仓 fixtures + 示例仓）通过 `15-panel.schema.json`，且 `children[]` 引用的 id 都存在 |
| S04 | 现场生成的 `registry.json` / `install-intent.json` / `index.json` 分别通过 16 / 16 / 10 的 schema |
| S05 | `validator/src/validate.mjs` 实际抛出的每个 code 都出现在 `19-error-codes.md`，且表内无重复 |
| S06 | `tools/*.js` 符合 ES5 基线（无 `??` / `?.` / `=>` / 模板字符串 / `const` / `let`） |
| S07 | v1.0 基线回归：4 个原始夹具用当前校验器仍全部 `ok:true` |
| S08 | `spec/` 内所有 Markdown 相对链接有效 |
| S09 | `host.json` 通过 `21-host-capabilities.schema.json`；`hostLevel` 与 `conformance.notImplemented` 自洽；`uiForms` 含 `panel` 时 `panelForms` 非空（对应 21 章 I01） |

输出 `axp-spec-lint/1.0` JSON，失败退出码 1。CI 与 `scripts/site-check.mjs` 都会调用它。
