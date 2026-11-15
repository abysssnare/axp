# FAQ

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

## 定位

### AXP 和 MCP / LSP / Skills / Claude Plugins / OpenCode / DSH 是什么关系？

**同级独立规范**。各自定义自己的清单与组件语义，互不导入、互不桥接、互不内嵌。AXP 不是它们的上层格式，也不是适配层。

那「包含他们的能力」怎么理解？—— 是**表达能力覆盖**：那些格式里出现过的组件类型（工具、资源、提示、子代理、钩子、命令、反向通道），在 AXP 里都有对应声明写法，逐字段证明在 [`../spec/07-expression-map.md`](../spec/07-expression-map.md)。「能表达」不等于「能装载」：AXP 宿主只装载 `.axp` 包。

### 为什么规范正文里不能出现它们的字段名？

因为一旦正文借用外部格式的字段名，读起来就像依附于它们的兼容层，而不是一套自己定义语义的独立格式。所以 `01-format.md` 自己定义 `tools` / `surfaces` / `knowledge` / `agents` / `events` / `ui`，映射表整体放到 `07` 作为验收材料。

### 那 `impl.proc` 是不是变相接入外部协议？

不是。`proc` 只声明「有一个外部进程、怎么拉起」（`cmd` / `args` / `cwd` / `env`），**不假定**它用什么协议、什么方法表、什么消息格式。宿主自己决定通信方式，这属于宿主实现细节，不进格式。任何以进程形式提供能力的实现，在 AXP 里都只是一条普通声明。

### 能直接把别的格式的插件装进 AXP 宿主吗？

不能，也不需要。按 `07` 的映射方法把它的组件重写成 `axp.json` 即可。重写产物是一个原生 `.axp` 包，运行时不依赖原体系。

## 字段设计

### 为什么 `hotReload.signature` 强制 `on-every-load`？

安装时验过一次不够：热加载会在进程存活期间反复换实现体，每一次都必须是可信且未扩大权限的。规范还要求比对 `id` / `capabilities.privilege` 未变、组件 id 未新增。见 [`../spec/08-hot-reload.md`](../spec/08-hot-reload.md) §3.3。

### `allowDynamicCode: false` 为什么还能热加载？

两者管的是不同事：前者禁「运行时从网络下载**未签名**代码并执行」；热加载是「用**可信源、已签名**的实现体替换已声明组件」。校验器 `MUST NOT` 把 `allowDynamicCode: false` 单独当作拒绝理由，但 `MUST` 拒绝 `sources` 含 `network-unsigned` 或 `signature != on-every-load`。见 [`../spec/04-capabilities.md`](../spec/04-capabilities.md) §5。

### `ui{}` 为什么还要 `lifecycle / bind / actions`？

只声明「界面文件在哪」界面是死的。`bind` 把 Surface 数据流接到节点（自动刷新），`actions` 把界面动作回填到本包工具，`lifecycle` 让热替换时状态能迁移、旧资源能释放。见 [`../spec/06-ui-vocab.md`](../spec/06-ui-vocab.md)。

### 为什么 schema 用 `additionalProperties: false`？

清单是安全边界。宽容解析下，未知字段可能携带未声明的能力；严格模式让旧宿主明确拒绝并提示升级，而不是猜语义。见 [`../spec/09-versioning.md`](../spec/09-versioning.md) §2。

### `gradient` 解决什么问题？

同一个「点击」在 L2 用无障碍、L3 用 shell、L4 用 root。以前这些 `if-else` 写在插件代码里，现在写成格式声明，宿主按当前可用最高层自动选并逐级回退。任何外部格式都没有这个概念。

## 工程

### 我要开 GitHub 仓库，最小需要哪些文件？

`spec/01-format.md` + `spec/02-manifest.schema.json` + `validator/` + `cli/` + 一个 example + `README.md` + CI。本仓库已全部备齐，clone 后改 `OWNER` 占位符即可 push。见 [`../CONTRIBUTING.md`](../CONTRIBUTING.md)。

### 校验器依赖 npm 包吗？

不依赖。`validator/src/validate.mjs` 用 Node 内置模块自包含实现，离线可跑，方便放进任意 CI。

### 宿主必须实现到哪一级？

按场景：只调工具 → AXP-0；要界面和热加载 → AXP-3。等级定义见 [`../spec/01-format.md`](../spec/01-format.md) §11，自检表见 [`host-checklist.md`](host-checklist.md)。

### 内容可信度？

本仓库是 AI 辅助生成的规范草案与工程起点。落地前请按 `host-checklist.md` 逐项验证，尤其是签名、权限梯度与热加载回滚三条安全路径。
