# AXP 一致性套件

> 状态：模板就位，用例待生态实现
> 规范依据：[`../spec/11-conformance.md`](../spec/11-conformance.md)
> 下表中的命令默认工作目录为 `axp/`

## 这是做什么的

`spec/11` 把 AXP-0…AXP-3 拆成可观测断言（C-0-* … C-3-*）。本目录是**第三方宿主提交一致性声明时使用的结果模板与用例骨架**，不是 `runtime/` 自检的替代品。

| 目录 / 文件 | 用途 |
|---|---|
| `axp-conformance.template.json` | 结果文件模板，`claimedLevel` / `summary` / `results` 的字段约定 |
| `cases/` | 每个断言一个用例目录（当前为骨架，由宿主实现者补齐） |
| `fixtures/` | 合法包 / 越权包 / 坏签名包等输入 |

## 断言清单（机器可读）

以 [`../spec/index.json`](../spec/index.json) 的 `conformance` 字段为准：

- AXP-0：6 条
- AXP-1：5 条（含通过全部 C-0 的前置）
- AXP-2：6 条
- AXP-3：9 条

高等级包含全部低等级断言，不存在「跳过 C-0 直接认证 AXP-3」。

## 用当前仓库能验证什么

| 命令 | 证明对象 |
|---|---|
| `node validator/test/run-tests.mjs` | 校验器行为（31 条） |
| `python3 validator/test/schema-crosscheck.py` | schema 双引擎一致（43 项） |
| `node runtime/test/smoke.mjs` | **`runtime/` 参考宿主自身**的 AXP-3 自证（30 条） |
| `node ../scripts/spec-check.mjs` | 规范文档 / 错误码 / 数字 / 章节编号自洽 |

`runtime/` 的 30 条断言可以作为 `cases/` 用例的实现参考，但 `MUST NOT` 直接当作第三方宿主的认证结果。

## 提交认证

1. 复制模板为 `axp-conformance.json`，填入全部断言结果
2. 确认 `summary.total / passed / failed` 与 `results` 一致
3. 在 GitHub 提交一致性声明 Issue，附结果文件与复现命令
4. 通过后由维护者写入 `spec/index.json` 的 `conformance.certifiedHosts`

## 用例编写约束

- 输入是完整 `.axp` 包目录或 zip，不依赖宿主私有 API
- 输出 JSON：`{ id, passed, observed, expected, at, hostVersion }`
- 不联网、不修改宿主之外的系统状态
- 每个用例目录含 `README.md`，写明断言 ID、前置条件、观测点
