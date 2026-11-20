# AXP Reference Runtime（M2 最小宿主参考实现）

> 状态：Stable（可运行）
> 适用：AXP v1.x · 声明等级 **AXP-3**
> 最后更新：2026-11-14

一个**可运行**的参考宿主，用于验证规范不是纸面文章：它按 [`../spec/01-format.md`](../spec/01-format.md) §8 的 9 步装载流水线装载真实 `.axp` 目录，注册组件、按权限梯度选实现、订阅 Surface、绑定 UI、执行热加载状态机。

| 能做什么 | 不能做什么 |
|---|---|
| 装载 `test/fixtures/*` 三个真实插件 | 不是 Android 应用，不能跑在手机上 |
| 调用工具、验证 `gradient` 降级 | 不实现 QuickJS/Hermes/dex/WASM 完整运行时 |
| Surface 增量 → `ui.bind` / `events` 联动 | 不实现真实无障碍/Shizuku/root 通道 |
| 热加载：验签 → 迁移 → 重建 → 回滚 | 不实现真实 APK v3 证书链校验（见下方签名策略） |
| 产出结构化审计日志 | 不渲染真实 Compose 界面（Android 落点见 [`../reference-host/android`](../reference-host/android)） |

**定位**：它是「规范的可执行注释」——把字段语义跑一遍，让宿主开发者照着实现真机版本。集成教程见 [`../docs/integration-guide.md`](../docs/integration-guide.md)，端到端指南见 [`../docs/runtime-guide.md`](../docs/runtime-guide.md)。

## 快速开始

```bash
node runtime/test/smoke.mjs
```

预期输出包含装载、工具调用、Surface 推送、热替换、回滚 5 组断言全绿。

```js
import { AxpHost } from './runtime/src/host.mjs';

const host = new AxpHost({ privileges: ['L0', 'L1', 'L2', 'L3'] });
const plugin = host.load('test/fixtures/03-hot-reload');

host.invoke(plugin.id, 'ledger.ocr', { src: 'screen' });
host.publish('axp://vision/screen', { type: 'delta', text: '转账 128.00' });
host.applyHotReplace(plugin.id, 'test/fixtures/03-hot-reload-v110');
console.log(host.audit.all());
```

## 模块

| 文件 | 对应规范 | 职责 |
|---|---|---|
| `src/loader.mjs` | §8 步骤 1–7 | 9 步装载流水线，任一步失败整包拒绝 |
| `src/registry.mjs` | §5.1 / §6.2 | 组件注册、`gradient` 权限梯度选择、`sideEffects` 确认 |
| `src/surfaces.mjs` | §5.2 / `05-domains.md` | 订阅 / 退订 / 增量 / 背压 |
| `src/ui.mjs` | §5.6 / `06-ui-vocab.md` | `panel.json` 解析、`bind`、`actions`、`lifecycle` |
| `src/hotreload.mjs` | §7 / `08-hot-reload.md` | 状态机、每次验签、状态迁移、回滚、UI 重建 |
| `src/signature.mjs` | §9 分发 | `dev` / `strict` 两种签名策略 |
| `src/audit.mjs` | §5.7 | 结构化审计日志 |
| `src/impl.mjs` | `03-impl-reference.md` | 脚本实现体加载（仅 T1 `js`） |

## 签名策略（重要）

| 策略 | 行为 | 用途 |
|---|---|---|
| `dev`（默认） | 校验 `publisher` 格式、`id` / `privilege` 未扩大、组件 id 未新增；**不**校验证书 | 本地开发、示例、CI |
| `strict` | 额外要求 `bundle.certFingerprint` 与 `distribution.publisher` 严格相等 | 生产宿主必须实现，且必须用真实 APK Signature Scheme v3 |

示例插件的 `publisher` 是 64 个 `0` 的占位指纹，所以默认 `dev`。**生产环境必须切 `strict` 并换成真实证书**，否则热加载的信任链是空的。校验器无法替你检查这一点，见 [`../docs/host-checklist.md`](../docs/host-checklist.md)。

## 实现体边界

参考运行时只执行 T1 `impl.js` 与 `ui.lifecycle` / `ui.inject` 中的脚本：读源码 → 去掉 `export` → 在隔离 `vm` 上下文执行 → 取约定函数（`run` / `init` / `subscribe` / `onLoad` / `onReload` / `onUnload`）。

T2–T7（`kotlin` / `native` / `wasm` / `bin` / `url` / `proc`）在本运行时中登记为 `unsupported`，宿主按 [`../spec/03-impl-reference.md`](../spec/03-impl-reference.md) 的选择算法降级到可用形态；全不可用则组件 `unavailable`，不抛异常。这是规范 §4 的行为，不是缺陷。

## 一键自检

```bash
node validator/test/run-tests.mjs          # 正面 + 负面用例
python3 validator/test/schema-crosscheck.py # 独立引擎交叉复核
node runtime/test/smoke.mjs                # 端到端
```
