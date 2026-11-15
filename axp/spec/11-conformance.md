# 11 · 一致性等级与认证规范

> 状态：Stable
> 适用：AXP v1.x · 宿主实现者
> 最后更新：2026-11-15
> 规范性地位：`01-format.md` §11 给出等级的**定义**，本文件给出等级的**可验证断言**与认证流程。冲突时以 `01` 为准。

## 1. 为什么需要把等级写成断言

「声明 AXP-2」曾经只是一句 README 里的话。没有可执行的断言，就无法区分「实现了」与「文档里写了」。本章把每个等级拆成可观测行为，让合规成为可复现的测试结果，而不是自我宣称。

**区分两件事**：

| 概念 | 对象 | 现有实现 |
|---|---|---|
| 规范项目自检 | 校验器 / schema / 参考运行时 | `run-tests.mjs` 31 · `schema-crosscheck.py` 43 · `smoke.mjs` 30 |
| 宿主一致性认证 | 任意第三方宿主 | `conformance/` 套件（本章定义，`axp/conformance/` 提供模板） |

前者证明「我们的工具和规范一致」，后者证明「你的宿主和 AXP 一致」。两者 `MUST NOT` 互相替代。

## 2. 断言编号

断言编号 `C-<等级>-<序号>`，每条都是二值（通过 / 不通过），`MUST NOT` 有「部分通过」。

### 2.1 AXP-0（装载 + tools）

| ID | 断言 | 观测方式 |
|---|---|---|
| C-0-1 | 对合法包完成 `01` §8 的 1–7 步并注册组件 | 装载日志含 7 个阶段 |
| C-0-2 | 对缺 `axp.json` / schema 违规 / 路径含 `..` 的包拒绝装载 | 返回结构化错误，无部分注册 |
| C-0-3 | 未在清单声明的文件不被执行 | 在包内塞入未声明可执行文件，观察无执行记录 |
| C-0-4 | `tools[].id` 可被解析并调用，`input` 按 JSON Schema 校验 | 调用返回预期结果；坏输入被拒 |
| C-0-5 | `sideEffects: destructive` 且 `confirm` 非 true 时拒绝 | 错误码 `TOOL_CONFIRM_REQUIRED` |
| C-0-6 | `impl` 七形态中不支持的形态被标记 `unavailable`，宿主不崩溃 | 组件状态可查询 |

### 2.2 AXP-1（+ surfaces / knowledge）

| ID | 断言 | 观测方式 |
|---|---|---|
| C-1-1 | 通过 2.1 节全部 `C-0-*` 断言 | 前置 |
| C-1-2 | `watchable` Surface 首次推送全量、之后推送增量，且背压生效 | 订阅序列 = `[full, delta...]` |
| C-1-3 | `bind[].from` 指向未 `watchable` 的 Surface 时装载失败 | `SURFACE_NOT_WATCHABLE` |
| C-1-4 | `progressive: true` 的 knowledge 按三级披露，未命中不读正文 | 文件读取日志 |
| C-1-5 | `knowledge.allowedTools` 生效：白名单外工具调用被拒 | 调用返回权限错误 |

断言编号以 `index.json.conformance` 中的机器可读列表为准；文档表格是其展开。

### 2.3 AXP-2（+ agents / events / ui）

| ID | 断言 | 观测方式 |
|---|---|---|
| C-2-1 | 通过全部 C-0 / C-1 断言 | 前置 |
| C-2-2 | `agents[].privilege ≤ capabilities.privilege` 被强制 | 越权包被拒（`AGENT_EXCEEDS_PRIVILEGE`） |
| C-2-3 | `events[].on` 为 watchable 流时按 `filter` 触发；生命周期事件按命名空间触发 | 事件记录含 `on` 与触发原因 |
| C-2-4 | `ui.bind[].to` 在 `panel.json` 中可解析；不可解析时装载失败 | `UI_BIND_TARGET_MISSING` |
| C-2-5 | `ui.actions[].tool` 回填到本包已声明工具，且继承 `confirm` 策略 | 动作调用结果与直接调用一致 |
| C-2-6 | `ui.lifecycle.onLoad` 在 UI 挂载后触发一次 | 生命周期日志 |

### 2.4 AXP-3（+ gradient / hotReload 全语义）

| ID | 断言 | 观测方式 |
|---|---|---|
| C-3-1 | 通过全部 C-0 / C-1 / C-2 断言 | 前置 |
| C-3-2 | `gradient` 选「当前可用且 ≤ `capabilities.privilege`」的最高层；不可用时逐级回退 | 同一次调用在不同授权集合下命中不同实现 |
| C-3-3 | 热加载替换前后用户可见状态二值（旧或新），`MUST NOT` 半新半旧 | 快照对比 |
| C-3-4 | 每次替换都重新验签；换证书的实现体被拒 | 签名策略测试 |
| C-3-5 | `classloader: isolated` 生效，替换后旧 dex / wasm 可被卸载 | 类加载器引用计数 |
| C-3-6 | `state.preserve` 键在替换后原样保留；`state.migrate` 被应用 | 状态对比 |
| C-3-7 | 新实现体初始化失败时按 `rollback.onError` 回滚且 `keep` 代数正确 | 故障注入 |
| C-3-8 | `targets` 之外的组件 `MUST NOT` 被替换 | 越界替换请求被拒 |
| C-3-9 | 热加载 `MUST NOT` 改变 `axp` / `id` / `capabilities.privilege` | 差异检查 |

## 3. 一致性套件结构

```
conformance/
├── README.md                     # 如何跑、如何提交
├── cases/                        # 每个断言一个用例目录
│   ├── C-0-3-undeclared-exec/
│   └── ...
├── fixtures/                     # 合法包 / 越权包 / 坏签名包
└── axp-conformance.json          # 结果文件（模板见 axp/conformance/）
```

用例 `MUST` 满足：

1. 输入是一个完整的 `.axp` 包目录或 zip，`MUST NOT` 依赖宿主私有 API
2. 输出为 JSON：`{ "id", "passed", "observed", "expected", "at", "hostVersion" }`
3. 用例 `MUST NOT` 要求联网；`MUST NOT` 修改宿主之外的系统状态
4. 每个用例目录含 `README.md`，写明断言 ID、前置条件、观测点

## 4. 结果文件格式

```jsonc
{
  "schema": "axp-conformance/1.0",
  "host": { "name": "my-host", "version": "0.9.2", "platform": "Android 14 / API 34" },
  "claimedLevel": "AXP-2",
  "runAt": "2026-11-15T00:00:00Z",
  "summary": { "total": 21, "passed": 21, "failed": 0 },
  "results": [
    { "id": "C-0-1", "passed": true, "observed": "7 stages", "at": "..." }
  ],
  "signature": "sha256:..."   // 可选：结果文件自证完整
}
```

`MUST` 满足：

- `claimedLevel` 对应的**全部**断言 `passed: true` 时才可声明该等级
- 高等级 `MUST` 包含所有低等级断言（C-3 ⊃ C-2 ⊃ C-1 ⊃ C-0）
- `summary` `MUST` 与 `results` 实际统计一致；`scripts/spec-check.mjs` 校验模板自洽

模板见 [`../conformance/axp-conformance.template.json`](../conformance/axp-conformance.template.json)，套件说明见 [`../conformance/README.md`](../conformance/README.md)。

## 5. 认证流程

| 步骤 | 动作 | 产出 |
|---|---|---|
| 1 | 宿主实现者跑套件，生成 `axp-conformance.json` | 结果文件 |
| 2 | 在 `.github/ISSUE_TEMPLATE` 提交一致性声明，附结果文件与复现命令 | Issue |
| 3 | 规范维护者复核：断言覆盖、结果可复现、无 `continue-on-error` 掩盖 | 复核记录 |
| 4 | 通过后写入 `index.json.conformance.certifiedHosts` | 索引更新 |
| 5 | 宿主 README 可标注 `AXP-<n> certified` | 徽章 |

认证 `MUST NOT` 由宿主自我宣称；`MUST` 有第三方可复现的结果文件。`SHOULD` 在宿主大版本升级后重跑。

## 6. 与现有自检的关系

| 现有数字 | 归属 | 是否可代替认证 |
|---|---|---|
| 31 条行为用例 | 校验器行为固化 | ❌ |
| 43 项独立引擎复核 | schema 语义一致性 | ❌ |
| 30 条端到端断言 | `runtime/` 参考宿主 | ⚠️ **仅对 `runtime/` 自身构成 AXP-3 自证**，不覆盖第三方宿主 |

`runtime/` 的 30 条断言 `MAY` 作为 `conformance/` 用例的实现参考，但 `MUST NOT` 直接当作第三方宿主的认证结果。

## 7. 相关章节

- 等级定义 → [`01-format.md`](01-format.md) §11
- 装载 9 步 → [`01-format.md`](01-format.md) §8
- 安全 MUST → [`12-security.md`](12-security.md)
- 宿主自检表 → [`../docs/host-checklist.md`](../docs/host-checklist.md)
- 任务状态 → [`../ROADMAP-ALL-TASKS.md`](../../ROADMAP-ALL-TASKS.md)
