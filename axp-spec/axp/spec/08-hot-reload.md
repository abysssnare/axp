# 08 · 热加载

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本文件展开 [`01-format.md`](01-format.md) §7。热加载在 AXP 里是**格式字段**，不是宿主私有能力：插件作者声明「哪些组件可以被换、换的时候怎么保状态、怎么验签、怎么回滚」，宿主按声明执行。

## 1. 字段全表

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | bool | `false` | 关闭时宿主 `MUST NOT` 接受任何运行时替换 |
| `unit` | enum | `component` | `package`（整包换）/ `component`（单组件换） |
| `targets` | string[] | `[]` | 可替换前缀，如 `ui.*` / `tools.screen.*` / `knowledge.*` |
| `strategy` | enum | `graceful` | `immediate` / `graceful`（等会话空闲）/ `next-session` |
| `signature` | enum | `on-install` | 启用时 `MUST` 为 `on-every-load` |
| `sources` | enum[] | `["package"]` | `package` / `trusted-channel` / `preinstall`；`MUST NOT` 有 `network-unsigned` |
| `state.migrate` | path | | 状态迁移映射文件 |
| `state.preserve` | string[] | `[]` | 原样保留的状态键，支持 `*` |
| `rollback.keep` | int | `2` | 保留历史代数 |
| `rollback.onError` | bool | `true` | 新版本初始化失败时自动回滚 |
| `uiRebuild` | enum | `recompose` | `recompose` / `recreate-activity` / `restart-host` |
| `classloader` | enum | `isolated` | `dex` / `wasm` 实现体 `MUST` 为 `isolated` |

## 2. 状态机

```
   ┌──────────┐  替换请求   ┌───────────┐  验签通过  ┌──────────┐
   │  ACTIVE  │ ──────────▶ │ VERIFYING │ ─────────▶ │ STAGING  │
   └──────────┘             └───────────┘            └──────────┘
        ▲                         │ 验签失败               │
        │                         ▼                       ▼
        │                    ┌──────────┐           ┌──────────┐
        │  回滚成功           │ REJECTED │◀──────────│ MIGRATE  │
        │                    └──────────┘  迁移失败   └──────────┘
        │                                                  │
        │                       ┌──────────┐               │ 成功
        └───────────────────────┤ ROLLED   │◀──────────────┤
            初始化失败 或 onError │  BACK    │               ▼
                                └──────────┘          ┌──────────┐
                                                      │ SWAPPED  │
                                                      └──────────┘
```

`MUST` 保证：任何时刻用户可见的要么是旧版本，要么是新版本，`MUST NOT` 出现半新半旧。

## 3. Android 实现约束

### 3.1 类加载器隔离

`dex` / `wasm` 实现体 `MUST` 使用独立类加载器（推荐 `InMemoryDexClassLoader` 或每代一个 `DexClassLoader`）：

- 每一代替换创建新实例，旧实例在无强引用后由 GC 回收
- `MUST NOT` 把插件类注入宿主 `PathClassLoader`（无法卸载）
- 启用热加载的插件 `MUST` 声明 `classloader: "isolated"`（校验器按 `HOT_CLASSLOADER` 拒绝其余取值）；`"shared"` 的旧宽松规则仅保留给未启用热加载的包，且仅限纯 `js` / `.md` / `panel.json` 实现体

### 3.2 资源与 UI

| 变更类型 | 建议 `uiRebuild` | 说明 |
|---|---|---|
| `panel.json` / 文案 / 样式 | `recompose` | 重放声明式节点树，保留 state |
| `.dex` 中的自定义 View / Activity | `recreate-activity` | 重建 Activity，按 `state.migrate` 恢复 |
| `.so` / 宿主级注入 | `restart-host` | 最后手段，`strategy` 建议 `next-session` |

`onReload` `MUST` 在界面重建**之后**、界面可见**之前**调用；`onUnload` `MUST` 在旧类加载器回收**之前**完成。

### 3.3 每次加载验签

```
verify(newBundle, distribution.publisher):
    1. 校验 APK Signature Scheme v3 签名块
    2. 比对发布者证书指纹 == distribution.publisher
    3. 校验新包 axp.json 的 id / capabilities.privilege 不扩大
    4. 校验 targets 内组件 id 集合 ⊆ 旧包声明
    5. 任一失败 → REJECTED，保留旧版本，写审计
```

第 3 条特别重要：**热加载 `MUST NOT` 用来提权**。权限变更只能走完整重装流程。

### 3.4 状态迁移

`state.migrate` 是一个 JSON 映射：

```jsonc
{
  "from": "1.0.0",
  "to": "1.1.0",
  "map": [
    { "src": "ui.panel.scroll", "dst": "ui.panel.listScroll", "transform": "identity" },
    { "src": "agents.walker.history", "dst": "agents.walker.history", "transform": "identity" }
  ],
  "drop": ["ui.panel.legacyFlag"]
}
```

`state.preserve` 中的键 `MUST` 跳过 `map` 直接原样保留。迁移失败 → 按 `rollback.onError` 回滚。

### 3.5 回滚

宿主 `MUST` 保留最近 `rollback.keep` 代的完整实现体快照与签名。触发条件：

- `onReload` 抛错或超时
- 新版本初始化失败
- 用户主动回退

回滚同样 `MUST` 走 §3.3 的验签流程（防降级攻击）。

## 4. 与 `allowDynamicCode` 的边界

| 配置 | 结果 |
|---|---|
| `allowDynamicCode: false` + `hotReload.signature: on-every-load` + `sources ⊆ {package, trusted-channel, preinstall}` | ✅ 合法 |
| `allowDynamicCode: false` + `sources` 含 `network-unsigned` | ❌ `HOT_UNSIGNED_SOURCE` |
| `allowDynamicCode: false` + `signature: on-install` | ❌ `HOT_SIGNATURE_POLICY` |
| 运行时 `eval` 从任意 URL 取得的代码 | ❌ 无条件禁止 |

校验器 `MUST NOT` 把 `allowDynamicCode: false` 单独当作拒绝热加载的理由。

## 5. 宿主 MUST 清单

- [ ] 替换前重新验签，且比对 `id` / `privilege` 未扩大
- [ ] `targets` 之外的组件保持旧实现
- [ ] 隔离类加载器，旧代可回收
- [ ] 状态迁移 → `onReload` → 界面可见，顺序不可颠倒
- [ ] 失败自动回滚，回滚也验签
- [ ] 全程写审计日志，含发起方、代号、结果
- [ ] `strategy: graceful` 时等待当前会话空闲，`immediate` 时提示用户

## 6. 明确禁止

- 用热加载扩大 `capabilities.privilege` 或新增 `requests`
- 用热加载引入清单未声明的组件 id
- 从任意 URL 拉取未签名实现体直接执行
- 在 `onReload` 中阻塞主线程超过宿主声明的超时

## 7. 教程

接入步骤见 [`docs/hot-reload-tutorial.md`](../docs/hot-reload-tutorial.md)；最小可运行配置见 [`examples/03-hot-reload`](../test/fixtures/03-hot-reload)。
