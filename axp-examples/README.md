# AXP 示例仓（axp-examples）

> 官方示例插件**全部住在这里**；规范仓 `axp-spec/` 不含对外示例（只保留 `test/fixtures/` 内部测试资产）。
> 配套：`axp-spec/`（规范 + CLI）、`axp-android-host/`（真机宿主）。

## 插件清单

| # | 目录 | 插件 id | UI | 演示什么 |
|---|---|---|---|---|
| 01 | `01-hello` | `com.example.hello` | 无 | 最小纯工具插件（L0 echo） |
| 02 | `02-ui-panel` | `com.example.panel` | 有 | `ui{}` + `bind/actions/lifecycle` + Surface 订阅 |
| 03 | `03-hot-reload` | `com.example.autopay` | 有 | 六类组件 + `hotReload{}` + `gradient` |
| 04 | `04-domains` | `com.example.domains` | 有 | 13 个 `axp://` 标准域 |
| **05** | `05-memory-system` | `com.example.memory` | **有** | **点开显示记忆与储存**：`ctx.storage` + 自定义域 + 自动刷新列表 |
| **06** | `06-office-tools` | `com.example.office` | 无 | **PDF / Excel 制作**（真实生成 CSV / 最小 PDF） |
| **07** | `07-archive-tools` | `com.example.archive` | 无 | **压缩 / 解压**（可跑的打包格式） |
| **08** | `08-browser-automation` | `com.example.browser` | 无 | **浏览器自动化**（Intent / 读屏 / 点击 + L2/L3 梯度） |

后四个是 v1.0 原仓库没有的补篇：把「无 UI 也能做功能插件」「插件可以带储存 UI」「Agent 可选工具」变成能跑的代码。

## 校验与发布

```bash
# 全部清单校验（零依赖）
node tools/verify.mjs

# 重建分发索引（会在 dist/ 生成 .axp 并写 sha256）
node ../axp-spec/axp/cli/bin/axp.mjs index plugins/* -o index.json

# 安装到 CLI 宿主
AXP_HOME=./.axp-host node ../axp-spec/axp/cli/bin/axp.mjs install plugins/05-memory-system --dev
AXP_HOME=./.axp-host node ../axp-spec/axp/cli/bin/axp.mjs agent-tools --json
AXP_HOME=./.axp-host node ../axp-spec/axp/cli/bin/axp.mjs invoke com.example.memory memory.add '{"text":"记住这件事"}'
AXP_HOME=./.axp-host node ../axp-spec/axp/cli/bin/axp.mjs ui com.example.memory

# 端到端一致性（spec/12 C01–C26）
node ../axp-spec/axp/tools/conformance.mjs --json
```

## 装到真机

`node ../axp-spec/axp/cli/bin/axp.mjs pack plugins/05-memory-system -o memory.axp` → 拷到手机 →
`axp-android-host` 首页「安装插件」选该文件 → 权限确认 → 列表出现 → 点开看到记忆面板。
详见 `../axp-spec/axp/docs/cookbook-android-host.md`。
