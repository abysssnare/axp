# AXP — Agent eXtension Protocol v1.1.0

> **智能体扩展协议**：面向智能体（Agent）系统的开放插件协议——清单格式、生命周期、消息契约、
> 权限模型、事件总线、依赖拓扑与健康心跳，外加一个把整套规范与**可运行参考内核**搬到浏览器里的
> Next.js 交互式站点。

![Spec](https://img.shields.io/badge/spec-v1.1.0-10b981)
![Site](https://img.shields.io/badge/site-Next.js%2016-222222)
![Runtime](https://img.shields.io/badge/runtime-TypeScript-f59e0b)
![License](https://img.shields.io/badge/license-Apache--2.0-lightgrey)

---

## 这个仓库是什么

一个仓库、两条并行演进的 AXP 线、两层交付：

| 层 | 内容 |
|---|---|
| **智能体扩展协议（现行主树）** | AXP v1.1.0 完整文本（11 章，§1–§11）：插件清单 `axp.plugin.json`、六态生命周期、消息封皮、12 项权限目录、保留主题事件总线、Kahn 拓扑激活、心跳健康协议、`agent.memory` 1.1 契约、兼容性策略 |
| **参考实现 + 交互式站点** | Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui 单页站点：规范在线阅读、内核演练场（真实状态机迁移）、记忆实验室（加权召回实操）、内核源码浏览器、SDK 一键打包下载 |
| **Agent eXtension Package v1.1.0（全套交付）** | Android 专属插件描述格式的完整交付：`axp-spec/`（21 篇规范 + 6 个 Schema + 真实 CLI + Node 参考运行时 + C01–C26/S01–S09 一致性套件）、`axp-examples/`（8 个示例插件）、`axp-android-host/`（纯 Java 零依赖宿主 App）、`docs/axp-package/`（交付文档与规范全文合订） |

一句话定位：**AXP 定义「宿主与插件之间的边界契约」**——同一插件包不做修改即可运行于任意
AXP 兼容宿主；所有跨边界通信必须经过总线并留下审计轨迹；能力未声明即拒绝。

### 首个第三方样本插件

配套测试仓库 **[axp-agent-plugin-memory](https://github.com/abysssnare/axp-agent-plugin-memory)**
用本协议实现了一个完整的 `agent.memory` 1.1 插件（含迷你宿主内核与 25 条断言的验收驱动）。

## 站点导览（只有一个用户可见路由 `/`）

| 标签页 | 内容 |
|---|---|
| **概览** | 协议定位、核心数字、官方默认插件集与市场目录、v1.1.0 变更摘要 |
| **规范** | 11 章规范全文在线阅读：表格 / 代码块 / 注记块结构化渲染 |
| **演练场** | 内核操作实操：install → resolve → activate → 心跳 → 降级 → 卸载，实时观察状态机迁移与权限裁决（含故障注入） |
| **记忆实验室** | `agent.memory` 参考实现实操：写入 / 加权召回 / 置顶 / 遗忘 / 淘汰，实时观察召回评分 |
| **内核源码** | 参考内核七个模块的源码浏览器（类型 / 总线 / 权限 / 注册表 / 内核 / 记忆插件 / 种子数据） |

## 参考内核（`src/lib/axp/`）

| 模块 | 规范条目 | 说明 |
|---|---|---|
| `types.ts` | §2 | 契约的类型化投影：标识 / 扩展点 / 权限 / 生命周期 / 消息封皮 |
| `event-bus.ts` | §7 | 保留主题校验、发布/订阅、审计轨迹落库 |
| `permissions.ts` | §6 | 12 项目录、三态裁决（allow / deny / gated）、敏感级标注 |
| `registry.ts` | §3 §8 | 清单静态校验、Kahn 拓扑排序、循环检测（EDEP / ECYCLE） |
| `kernel.ts` | §4 §9 | install / transition / uninstall 状态机、心跳、故障注入 |
| `memory-plugin.ts` | §10 | `agent.memory` 参考实现：write / recall / forget / sweep |
| `seed.ts` | — | 官方默认插件集与市场目录（五类扩展点全覆盖） |

## HTTP API

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/plugins` | GET / POST | 插件列表（分页）与注册 |
| `/api/memory` | GET / POST / DELETE | 记忆条目：列表 / 写入 / 遗忘 |
| `/api/events` | GET | 总线审计轨迹（保留主题 + 自定义主题） |
| `/api/package` | GET | **SDK 一键打包**：规范全文 + 内核源码 + 类型声明打包为 zip 下载 |

## 快速开始

```bash
# 需要 Bun（或改用 npm / pnpm）
bun install

# 数据库（SQLite + Prisma）
cp .env.example .env
bun run db:push

# 开发服务器
bun run dev            # http://localhost:3000

# 质量门禁
bun run lint
```

## 技术栈

Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS 4 · shadcn/ui (New York) ·
Prisma ORM (SQLite) · Lucide Icons · Zustand

## 规范要点速览

- **六态生命周期**：`registered → resolved → active → degraded → error → disabled`（§4）
- **消息封皮**：`{ id, ts, source, target, topic, kind, payload }` 统一跨边界通信（§5）
- **权限三态**：`allow / deny / gated`，敏感能力默认进入策略链（§6）
- **保留主题**：`axp:plugin:*`、`axp:memory:*`、`axp:health:*` 仅内核或对应扩展点插件可发布（§7）
- **拓扑激活**：被依赖者优先激活，循环依赖报 `ECYCLE`（§8）
- **心跳协议**：健康分 0–100，降级 / 熔断 / 恢复路径显式化（§9）
- **agent.memory 1.1**：`write / recall / forget / sweep` + `tags / importance / pinned`（§10）
- **兼容策略**：v1.1 合约向后兼容 v1.0，未声明新特性的插件零成本迁移（§11）

## 许可

- 规范文本与参考实现：**Apache-2.0**
- 站点代码：**Apache-2.0**

## AXP — Agent eXtension Package v1.1.0（Android 插件格式全套交付）

本仓库同时承载 **AXP — Agent eXtension Package**（Android 专属独立插件描述格式）的完整可运行交付，
与现行主树的「智能体扩展协议」是同名缩写的两条独立线，互不依赖：

| 目录 | 内容 |
|---|---|
| [`axp-spec/`](axp-spec/) | 规范主仓：20 篇 spec 正文 + 6 个 Schema、零依赖校验器、真实 `axp install` CLI、Node 参考运行时（AXP-3）、C01–C26 + S01–S09 一致性套件 |
| [`axp-examples/`](axp-examples/) | 示例仓：8 个官方插件（记忆系统 / PDF-Excel / 压缩解压 / 浏览器自动化等）、`index.json`、校验脚本 |
| [`axp-android-host/`](axp-android-host/) | Android 宿主 App（纯 Java、零第三方依赖）：插件列表 / SAF 安装 / 插件 UI / Agent 选择 / WebView 执行 `impl.js` |
| [`docs/axp-package/`](docs/axp-package/) | 交付总索引、v1.0 / v1.1 规范全文合订、实证研究与落地实现说明 |

全套验收命令见 [`docs/axp-package/README-总索引.md`](docs/axp-package/README-总索引.md)；
CI 已为其配置专用质量门禁（规范自检 / 一致性 / Java core `javac --release 8` 编译跑 C01–C26 / 链接审计）。

## 仓库沿革

本仓库经历一次整体重设计，并在其后重新纳入 Android 插件格式线：

- **早期（历史提交完整保留，`git log` 可溯）**：Android 专属插件描述格式 **AXP — Agent eXtension Package**（v1.0–v1.1.1，13 篇规范 + 校验器 + CLI + 参考运行时），配套旧格式样本仓库 [axp-plugin-memory](https://github.com/abysssnare/axp-plugin-memory)
- **当前（主分支现行树）**：**智能体扩展协议（Agent eXtension Protocol）v1.1.0** 的完整规范、参考内核与交互式站点，即本 README 上文所述内容
- **并行交付（本树 `axp-spec/` + `axp-examples/` + `axp-android-host/` + `docs/axp-package/`）**：Agent eXtension Package 线基于原上游 `Ultra-Guru/axp` 的全面演进——规范扩至 21 章并补齐 M6 分发链路与第 21 章 Android 宿主接入契约，示例库独立成目录，宿主从「未编译 Kotlin 骨架」推进到「纯 Java 真实编译 + C01–C26 双端同表全绿」

## 相关仓库

| 仓库 | 说明 |
|---|---|
| [axp-agent-plugin-memory](https://github.com/abysssnare/axp-agent-plugin-memory) | 首个第三方样本插件：简单记忆系统（`agent.memory` 1.1 完整实现 + 迷你宿主验收驱动） |
| [axp-plugin-memory](https://github.com/abysssnare/axp-plugin-memory) | 旧格式（Agent eXtension Package）样本插件仓库 |
