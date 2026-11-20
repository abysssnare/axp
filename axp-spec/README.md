# AXP 规范仓（axp-spec）

> AXP — Agent eXtension Package：**Android 专属独立插件描述格式**的规范、工具链与一致性测试。
> 本仓**不含对外示例插件**：示例全部住在独立仓 `axp-examples/`；Android 宿主住在 `axp-android-host/`。

## 三仓分工

| 仓库 | 内容 |
|---|---|
| **axp-spec（本仓）** | 规范正文 01–21 + 6 个 Schema、零依赖校验器（Node 侧）、CLI（含真实 `install`）、Node 参考运行时、一致性套件、内部测试夹具；双引擎交叉复核 `schema-crosscheck.py` 需 `pip install jsonschema` |
| `axp-examples/` | 8 个官方示例插件（含记忆系统 / PDF-Excel / 压缩解压 / 浏览器自动化）、`index.json`、发布脚本 |
| `axp-android-host/` | 可编译安装的 Android 宿主 App（纯 Java、零第三方依赖），插件列表 / 安装 / 点开 UI / Agent 选择 |

拆分理由：v1.0 把 4 个示例塞在规范仓，站点、CI、31 条用例、30 条断言全被硬绑定（`site-check.mjs` 甚至写死 `exampleCount === 4`），
导致「规范仓」永远夹带业务插件。现在规范仓只保留 `axp/test/fixtures/` 作为**内部测试资产**，对外示例独立成仓。

## 快速开始

```bash
# 全部自检（Node 20+ / Python 3；schema-crosscheck.py 需先 pip install jsonschema）
cd axp
node validator/test/run-tests.mjs                 # 31/31
python3 validator/test/schema-crosscheck.py       # 47/47
node runtime/test/smoke.mjs                      # 30/30
node tools/conformance.mjs --json                # C01–C26 端到端
node ../scripts/site-check.mjs --prebuild        # 夹具完整性
node tools/spec-lint.mjs --json                 # S01–S09 规范自洽

# 真实安装一个插件（本地宿主目录，与 Android 宿主同一注册表格式）
AXP_HOME=./.axp-host node cli/bin/axp.mjs install /path/to/axp-examples/plugins/05-memory-system
AXP_HOME=./.axp-host node cli/bin/axp.mjs list
AXP_HOME=./.axp-host node cli/bin/axp.mjs agent-tools --json
AXP_HOME=./.axp-host node cli/bin/axp.mjs invoke com.example.memory memory.add '{"text":"记住这件事"}'
AXP_HOME=./.axp-host node cli/bin/axp.mjs ui com.example.memory
```

CLI 全命令：`new | validate | pack | inspect | publish | index | install | uninstall | list | enable | disable | agent-tools | invoke | ui | conformance`。

## 规范索引

| 文件 | 内容 |
|---|---|
| `spec/01-format.md` | **唯一规范性正文**（§0–§12 + §13 补篇索引） |
| `spec/02-manifest.schema.json` | `axp.json` 严格 Schema（draft 2020-12） |
| `spec/03`–`09` | impl / 权限 / 域 / UI 词汇 / 表达映射 / 热加载 / 版本 |
| **`spec/10-distribution-index.md`** + `10-index.schema.json` | 分发、索引、`axp install`、`session-install`（M6） |
| **`spec/11-plugin-management-agent.md`** | 注册表、`agent-tools`、`ctx.storage`、插件 UI 入口 |
| **`spec/12-host-conformance.md`** | C01–C26 运行时一致性用例 + S01–S09 静态断言 |
| **`spec/13`–`20`** | 术语 / 字段全参考 / UI DSL / 宿主上下文 / 域适配器 / 安全模型 / 错误码总表 / 治理 |
| **`spec/21-android-host-integration.md`** + `21-host-capabilities.schema.json` | **第三方 Android App 接入契约**：五挂钩点、I0–I3 档、`host.json`、Android 平台映射、I01–I10（M7 入口） |
| `docs/cookbook-no-ui.md` | 无 UI 功能插件四种写法 |
| `docs/cookbook-android-host.md` | 真机构建与「点开插件」最短路径 |
| `docs/android-integration-cookbook.md` | 已有 App 半天接成 I0 宿主的可抄 Kotlin 代码 |

## 自检口径

`31 / 47 / 30 / 26 / 9` 五套全绿是发布门槛：`31` 校验器行为、`47` 双引擎 Schema 复核、`30` 参考运行时语义、`26` 分发/安装/注册表/Agent/UI/存储端到端、`9` 规范文本静态自洽（S01–S09）。
`tools/conformance.mjs` 与 Android 宿主 `conformance/ConformanceRunner.java` 跑的是 `spec/12` 同一张表。

> 本仓内容由 AI 辅助生成并工程化验证；生产落地前请按 `axp/docs/host-checklist.md` 与 `spec/12` 逐项验证，尤其是签名、权限梯度、热加载回滚三条安全路径。
