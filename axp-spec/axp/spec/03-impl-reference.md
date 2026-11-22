# 03 · 统一实现引用 `impl`

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本文件展开 [`01-format.md`](01-format.md) §4。`impl` 是「实现层开放」的语法核心：**清单统一，实现随意**。

## 1. 七种形态

| 代号 | 键 | 形态 | 打包要求 | 可热替换 |
|---|---|---|---|---|
| T1 | `js` | 脚本文件 | 包内 `.js` | ✅ |
| T2 | `kotlin` | 预编译 dex + 类符号 `path#Class` | 架构写入 `abis` | ✅（需 `isolated`） |
| T3 | `native` | 预编译 `.so` | 架构写入 `abis` | ⚠️ 需卸载 native 库 |
| T4 | `wasm` | `.wasm` 模块 | 架构无关但需声明运行时 | ✅ |
| T5 | `bin` | 独立可执行，stdin/stdout JSON | 架构写入 `abis` | ✅ |
| T6 | `url` | 远程端点 | 需 `network.egress:<host>` | ✅（端点变更） |
| T7 | `proc` | 通用外部进程 | `cmd` 为包内可执行或系统命令 | ✅（进程重启） |

### T7 `proc` — 通用外部进程

```jsonc
"proc": {
  "cmd": "bin/helper",
  "args": ["--mode", "fast"],
  "cwd": ".",
  "env": { "AXP_LOG": "1" }
}
```

格式只声明「有一个进程、怎么拉起」。它**不假定**该进程使用任何特定协议、方法表或消息格式；宿主自行决定如何与之通信，通信方式属于宿主实现细节，不进格式。

这样，任何以外部进程形式提供能力的实现，在 AXP 中都只是一条普通的 `impl.proc` 声明 —— 一个实现选择，而不是需要被接入、被桥接、被兼容的外部体系。这一点是「同级独立格式」定位在字段层面的落点。

`proc` 的安全约束：

- `cmd` 若为包内路径，`MUST` 通过引用完整性检查；若为系统命令，`MUST` 在 `capabilities.requests` 中声明对应能力。
- `MUST NOT` 在 `args` / `env` 中注入未转义的宿主路径。
- 进程生命周期由宿主管理；热加载时按 `hotReload.strategy` 重启。

## 2. 多实现路径与选择算法

一个 `impl` 可同时给出多种形态：

```jsonc
"impl": {
  "native": "tools/ocr/libocr.so",
  "js":     "tools/ocr-fallback.js"
}
```

宿主选择算法（`MUST` 稳定、可预测）：

```
candidates = impl 中宿主支持的形态
按宿主优先级排序：native > kotlin > wasm > bin > js > proc > url
过滤：架构匹配 abis、权限满足 capabilities.requests
取第一个可用；全部不可用 → 该组件标记 unavailable（不抛异常）
```

`gradient` 优先于 `impl`：先按当前权限层选 `gradient` 分支，再在该分支内运行上述算法。

## 3. 引用完整性规则

| 检查项 | 规则 |
|---|---|
| 路径形态 | 相对包根，`MUST NOT` 含 `..`、绝对路径、通配符展开 |
| 存在性 | T1–T5 的文件 `MUST` 存在 |
| 架构一致性 | T2/T3/T5 产物架构 `MUST` ⊆ `abis` |
| 类符号 | `kotlin` 的 `#Class` 部分 `MUST NOT` 为空 |
| 远程端点 | `url` 的 host `MUST` 出现在 `network.egress:<host>` 声明中 |
| 未声明文件 | 包内存在但未被清单引用的可执行文件 `MUST NOT` 被宿主执行 |

## 4. 与热加载的关系

| 形态 | 替换方式 | 附加要求 |
|---|---|---|
| `js` / `.md` / `.yaml` / `panel.json` | 直接换文件 + 重新解析 | 无 |
| `kotlin` / `wasm` / `bin` | 新隔离类加载器 / 新实例 | `hotReload.classloader = "isolated"` |
| `native` | 卸载旧库后加载新库 | 需 `uiRebuild` 至少 `recreate-activity` |
| `proc` / `url` | 重启进程 / 切换端点 | `strategy` 建议 `graceful` |

详见 [`08-hot-reload.md`](08-hot-reload.md)。

## 5. 明确不在格式内的东西

- 进程间消息格式、序列化方式、方法名表
- 握手、能力协商、心跳
- 任何外部插件格式的运行时语义

这些都属于宿主实现，宿主可以任意选择，只要满足清单声明的组件契约。
