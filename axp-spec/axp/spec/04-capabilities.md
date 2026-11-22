# 04 · 权限阶梯与能力词汇表

> 状态：Stable
> 适用：AXP v1.x · Android API 26+
> 最后更新：2026-11-14

本文件展开 [`01-format.md`](01-format.md) §6。

## 1. L0–L5 权限阶梯

| 层 | 通道 | 典型能力 | 宿主获取方式 | 用户确认 |
|---|---|---|---|---|
| L0 | 沙箱 | 纯计算、本地模型推理 | 无 | 不需要 |
| L1 | 标准权限 | 文件、网络、相机、通知读取 | Android 运行时权限 | 系统弹窗 |
| L2 | AccessibilityService | 读屏、手势、跨 App 操作 | 无障碍服务开关 | **必须单独确认** |
| L3 | Shizuku | shell 身份、`pm` / `dumpsys` / 隐藏 API | Shizuku 授权 | **必须单独确认** |
| L4 | Root | `su` | Root 授权 | **必须单独确认** |
| L5 | System / Hook | 注入、系统签名 | 签名白名单 | 仅预装 |

`capabilities.privilege` 是插件声明的**最高权限层**。宿主 `MUST NOT` 向插件提供高于该层的通道。

## 2. `capabilities.requests` 完整词汇表

### 无障碍
```
accessibility.read
accessibility.gestures
accessibility.takeScreenshot
accessibility.windowChange
```

### 提权
```
shizuku.binder
root.su
system.inject
```

### 通知与剪贴板
```
notification.listen
notification.post
clipboard.read
clipboard.write
```

### 传感器
```
sensor.gps
sensor.motion
sensor.biometric
sensor.light
```

### 通信
```
telephony.sms.read
telephony.state
intent.send
intent.receive
```

### 包与系统
```
pm.list
pm.install
logcat.read
sysprop.read
media.capture
net.stat
```

### 网络与服务
```
network.egress:<host>        // <host> 为具体域名或 IP，禁止通配符 *
foreground.service
```

### 本地文件
```
fs.read:<scope>              // scope ∈ app | shared | external
fs.write:<scope>
```

**规则**：

1. 声明超出本表的请求 → 校验失败（错误码 `CAP_UNKNOWN_REQUEST`）。
2. `dangerous[]` `MUST` ⊆ `requests[]`；L2 及以上的请求 `SHOULD` 列入 `dangerous[]`。
3. `network.egress:<host>` `MUST` 与 `impl.url` 的 host 一致；`MUST NOT` 使用 `*`。
4. `agents[].privilege` `MUST` ≤ `capabilities.privilege`。
5. `tools[].gradient` 的键 `MUST` ≤ `capabilities.privilege`。
6. 词汇表扩展走 spec-change 提案，需同步更新 `02-manifest.schema.json` 与 `validator/src/validate.mjs`。

## 3. `gradient` 权限梯度

```jsonc
"gradient": {
  "L1": { "impl": { "js": "tools/tap-safe.js" } },
  "L2": { "impl": { "js": "tools/tap-a11y.js" } },
  "L3": { "impl": { "bin": "tools/tap-shell" } }
}
```

宿主选择算法：

```
available = 宿主当前已获授权的层集合 ∩ [L0, capabilities.privilege]
for L from max(available) down to L0:
    if gradient[L] 的实现体可用 → 选用，break
若 gradient 无命中且存在顶层 impl → 用顶层 impl
否则 → 工具 unavailable
```

`MUST` 记录每次选用结果到审计日志（`audit.read` 可读）。

## 4. `runtimeServices` 反向通道

| 值 | 含义 | 宿主义务 |
|---|---|---|
| `sampling` | 插件请求宿主推理 | 提供推理入口，按 `runtime.memoryMB` 限额 |
| `elicitation` | 插件请求用户输入 | 弹 UI，返回结构化结果 |
| `ui.push` | 插件主动更新界面 | 需在 `ui{}` 存在时才有意义 |
| `audit.read` | 读审计日志 | 仅返回本插件产生的记录 |

声明即授权；调用方式由宿主定义，格式不规定方法签名。

## 5. 与动态代码的边界

`runtime.allowDynamicCode` 只控制「是否允许运行时取得**未签名**代码」。

| 场景 | `false` 时是否允许 |
|---|---|
| 装载包内已声明、已签名的实现体 | ✅ 允许 |
| 热加载可信源已签名的新实现体 | ✅ 允许（见 [`08`](08-hot-reload.md)） |
| 从网络下载未签名脚本并 eval | ❌ 禁止 |
| `distribution.channel` 指向任意 URL 直接执行 | ❌ 禁止 |

这条边界必须在校验器里显式实现，避免一刀切把合法热加载判非法。
