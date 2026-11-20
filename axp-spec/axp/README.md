# AXP 规范项目（axp/）

> 独立插件描述格式 **AXP v1.x** 的规范、Schema、零依赖校验器、CLI、Node 参考运行时与一致性套件。
> 本目录**不含对外示例插件**：示例在独立仓 `axp-examples/`；真机宿主在 `axp-android-host/`。
> `test/fixtures/` 只是内部测试资产（1 个最小插件 + UI/热加载/多域/记忆系统夹具 + v1.1.0 升级夹具），不是示例。

## 规范

| 文件 | 内容 |
|---|---|
| `spec/01-format.md` | **唯一规范性正文**（§0–§12 + §13 补篇索引） |
| `spec/02-manifest.schema.json` | `axp.json` 严格 Schema（draft 2020-12） |
| `spec/03`–`09` | impl / 权限 / 域 / UI 词汇 / 表达映射 / 热加载 / 版本 |
| **`spec/10-distribution-index.md`** + `10-index.schema.json` | 分发、索引、十步 `install`、`session-install`、更新/吊销（M6） |
| **`spec/11-plugin-management-agent.md`** | 注册表、`agent-tools`、`ctx.storage`、插件 UI 入口 |
| **`spec/12-host-conformance.md`** | C01–C26 运行时断言 + S01–S09 静态断言 |
| **`spec/13`–`21`** | 术语与约定 / 字段全参考 / UI DSL / 宿主上下文 / 域适配器 / 安全模型 / 错误码总表 / 兼容性与治理 / **Android App 接入** |
| `spec/15-panel.schema.json` · `16-registry.schema.json` · `16-install-intent.schema.json` · `21-host-capabilities.schema.json` | v1.1 新增的宿主层/界面层/能力声明 schema |

## 自检

```bash
node validator/test/run-tests.mjs            # 31/31
python3 validator/test/schema-crosscheck.py # 47/47（双引擎）
node runtime/test/smoke.mjs                 # 30/30
node tools/conformance.mjs --json           # 26/26（分发/安装/Agent/UI/存储）
node tools/spec-lint.mjs --json             # 9/9（规范文本自洽，含 S09 host.json）
node ../scripts/site-check.mjs --prebuild   # 夹具与新增文档完整性
```

Android 宿主 `conformance/ConformanceRunner.java` 会把 `core/*.java` 真实编译（`--release 8`）并跑**同一张**用例表。

## 工具链

```
validator/    零依赖校验器 + 31 条行为用例 + 47 项 Python 交叉复核
cli/          axp 命令：new/validate/seal/pack/inspect/publish/index/install/
              uninstall/list/enable/disable/agent-tools/invoke/ui/conformance
runtime/      Node 参考宿主（声明 AXP-3），30 条端到端断言
sdk/sdk-js/   TypeScript 类型定义
reference-host/android/  旧 Kotlin 骨架（保留作规范语义参考；真机宿主已独立成仓）
tools/conformance.mjs    C01–C26
test/fixtures/           内部测试夹具
```

完整命令见 [`docs/cli-reference.md`](docs/cli-reference.md)；真机构建见 [`docs/cookbook-android-host.md`](docs/cookbook-android-host.md)。

> 本仓内容由 AI 辅助生成并工程化验证；生产落地前按 `docs/host-checklist.md` 与 `spec/12` 逐项验证签名、权限梯度、热加载回滚三条安全路径。
