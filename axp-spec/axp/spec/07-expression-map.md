# 07 · 表达能力覆盖映射（外部验收材料）

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

> **本文件不是规范正文。** 它是对外验收材料：用来证明「AXP 的组件模型足以表达同类格式中出现过的全部组件类型」。`spec/01-format.md` 不引用本文件的任何字段名，AXP 的语义独立定义。

## 0. 两个容易混淆的判定

| 判定 | 结论 |
|---|---|
| AXP 与下列格式是否同级独立规范 | ✅ 是。互不导入、互不桥接、互不内嵌 |
| AXP 的表达能力能否覆盖下列格式出现过的组件类型 | ✅ 能。逐字段映射见 §2 |
| AXP 宿主能否直接装载它们的插件 | ❌ 不能，也不需要。宿主只装载 `.axp` 包 |
| AXP 是否需要运行时接入它们的协议 | ❌ 不需要。`impl.proc` 只是通用外部进程声明 |

**「能表达」= 任何用那些格式能描述出来的组件，在 AXP 里都能找到一条声明写法；不意味着要运行它们的运行时。**

## 1. 总映射表

| 来源格式 | 其组件／概念 | AXP 对应声明 |
|---|---|---|
| MCP | tools | `tools[]` |
| MCP | resources / templates / subscriptions | `surfaces[]`（URI 模板 / `watchable`） |
| MCP | prompts | `knowledge[kind=prompt]` |
| MCP | sampling / elicitation | `capabilities.runtimeServices` |
| MCP | roots | `axp://fs` 域 |
| MCP | transport（stdio / SSE） | 不属于声明层；`impl.proc` 仅声明「有外部进程」 |
| LSP | textDocument 读类（hover / tokens / diagnostics …） | `surfaces[].views` |
| LSP | 请求类（completion / definition / rename …） | `tools[]`（`impl` 指向外部进程） |
| LSP | didOpen / didChange / publishDiagnostics | `surfaces[].watchable` + `events[]` |
| LSP | workspace/* | `axp://fs` + `events[lifecycle.workspace.*]` |
| Agent Skills | SKILL.md（frontmatter + 渐进披露） | `knowledge[kind=skill]`，`entry` 直接是 `.md` |
| Agent Skills | allowed-tools | `knowledge[].allowedTools` |
| Claude Plugins | commands | `knowledge[kind=command]` |
| Claude Plugins | agents | `agents[]` |
| Claude Plugins | hooks（固定事件表） | `events[on=lifecycle.*]` |
| Claude Plugins | 外部服务声明 | `tools[].impl.proc` / `surfaces[].impl.proc` |
| OpenCode Plugins | tool / 全事件 hooks | `tools[]` / `events[]` |
| OpenCode Plugins | 语言服务模块 | `surfaces[axp://fs]` + `tools[impl=proc]` —— 作为普通插件表达 |
| OpenCode Plugins | 包管理器安装 | `distribution.channel`（Android 会话安装，格式不假定包管理器） |
| DSH | profile 工具集 | `tools[]` + `capabilities.privilege` |
| — | **AXP 独有** | `ui{}`、`hotReload{}`、`gradient`、L0–L5、13 个标准域、`instances`、多实现路径 `impl` |

## 2. 逐字段映射细节

### 2.1 工具

| 外部字段 | AXP 字段 | 说明 |
|---|---|---|
| `name` | `tools[].id` | 点分命名空间 |
| `description` | `tools[].description` | 直译 |
| `inputSchema` | `tools[].input` | JSON Schema，可内联或 `$ref` |
| 调用入口 | `tools[].impl` / `gradient` | AXP 额外提供权限梯度与多实现路径 |

### 2.2 资源与文档

| 外部概念 | AXP 字段 |
|---|---|
| URI / URI template | `surfaces[].uri`（支持 `{}` 占位） |
| MIME / 多视图 | `surfaces[].views` |
| 行列 / 偏移 / 范围定位 | `surfaces[].anchor` |
| 订阅变更 | `surfaces[].watchable` |
| 诊断 / 符号 / 悬浮信息 | `views` 中的自定义视图名，宿主按域实现 |

### 2.3 知识与提示

| 外部概念 | AXP 字段 |
|---|---|
| `SKILL.md` frontmatter | `knowledge[].entry` 指向 `.md`，格式不发明新知识语法 |
| 渐进披露 | `knowledge[].progressive` |
| 提示参数 | `knowledge[kind=prompt].arguments` |
| 斜杠命令 | `knowledge[kind=command]` |
| 工具白名单 | `knowledge[].allowedTools` |

### 2.4 子代理与事件

| 外部概念 | AXP 字段 |
|---|---|
| 子代理定义 | `agents[]`（额外有 `privilege` 上限） |
| 固定 hook 事件表 | `events[on=lifecycle.*]` |
| 自定义事件源 | `events[on=<任意 watchable Surface>] + filter` |

### 2.5 反向通道

| 外部概念 | AXP 字段 |
|---|---|
| 请求宿主推理 | `capabilities.runtimeServices: ["sampling"]` |
| 请求用户输入 | `capabilities.runtimeServices: ["elicitation"]` |
| 方法名 / 调用协议 | **不进格式**，由宿主运行时定义 |

## 3. AXP 独有能力（反向不可表达）

以下 6 项在上述格式中没有对应声明结构，是 AXP 作为 Android 专属格式的增量：

1. `ui{}` —— 界面、数据绑定、动作回填、生命周期
2. `hotReload{}` —— 组件级替换、每次验签、状态迁移、回滚、UI 重建
3. `gradient` —— 同一工具按权限层声明不同实现并自动降级
4. L0–L5 权限阶梯与 `dangerous` 单独确认
5. 13 个 `axp://` Android 标准域
6. `instances` 多实例 + `runtime` 资源上限 + 多实现路径 `impl`

## 4. 验收方法

对任一外部格式的示例插件，按以下步骤判定覆盖：

1. 拆出它的组件清单（工具、资源、提示、子代理、钩子、命令…）
2. 每个组件在 §1 总表找到 AXP 声明节
3. 按 §2 写出等效 `axp.json` 片段
4. 用 `axp validate` 校验通过
5. **不需要**运行原格式运行时，也不需要原插件能被装载

验收产物是一个 `.axp` 包 + 一份映射说明；仓库 `test/fixtures/` 中的综合示例可作为模板。

## 5. 措辞约定

对外文档可以用「表达能力覆盖」；规范正文与 README 首屏 `MUST` 使用「同级独立格式」，`MUST NOT` 使用「收编 / 上层 / 超集 / 元格式 / 桥」描述 AXP 与其他格式的关系。
