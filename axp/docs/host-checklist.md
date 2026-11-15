# 宿主合规自检表

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

宿主达到哪个等级，见 [`../spec/01-format.md`](../spec/01-format.md) §11。发布前逐项勾选。

## 装载与校验（AXP-0，全部 MUST）

- [ ] 按 §8 的 1–7 步顺序执行，任一步失败整包拒绝
- [ ] 用 `spec/02-manifest.schema.json` 做结构校验（`additionalProperties: false`）
- [ ] 校验 APK v3 签名与 `distribution.publisher` 一致
- [ ] 所有包内相对路径存在，无 `..` / 绝对路径 / 通配符展开
- [ ] `abis` 声明与包内 `.dex` / `.so` / `.wasm` 一致
- [ ] `requires[]` 闭包解析且无环
- [ ] `requests` 全在词汇表内；`dangerous ⊆ requests`
- [ ] `agents[].privilege ≤ capabilities.privilege`；`gradient` 键同理
- [ ] **未在清单声明的文件一律不执行**
- [ ] `tools[].sideEffects = destructive` 时强制确认
- [ ] 失败给出结构化错误（字段路径 + 错误码），不部分注册

## 感知与知识（AXP-1，全部 MUST）

- [ ] 13 个标准域可用，自定义域前缀 `axp://x/<自身 id>/`
- [ ] `watchable` Surface 支持订阅 / 退订 / 增量 / 背压
- [ ] `knowledge.progressive` 实现三级渐进披露
- [ ] `knowledge.allowedTools` 作为激活期工具白名单生效

## 全组件（AXP-2）

- [ ] `agents[]` 强制 `privilege` 上限、`maxTurns` 生效
- [ ] `events[]` 支持生命周期命名空间与任意 Surface 流 + `filter`
- [ ] `ui{}` 四种形态至少实现 `panel(kind=dsl)` 的最小节点集
- [ ] 校验 `ui.bind[].to` 可解析、`ui.actions[].tool` 指向本包工具
- [ ] `ui.lifecycle` 三个回调按时机调用

## 提权与热加载（AXP-3）

- [ ] `gradient` 按「当前可用最高层」选择并逐级回退，无路径时 `unavailable` 不崩
- [ ] 每次选用结果写审计日志
- [ ] 热加载**每次**重新验签，比对 `publisher` / `id` / `privilege` 未扩大
- [ ] `targets` 之外的组件保持旧实现
- [ ] 隔离类加载器，旧代可回收
- [ ] 顺序：`state.migrate` → `onUnload` → 组件换 → `uiRebuild` → `onReload` → 可见
- [ ] 失败自动回滚，回滚也验签；保留 `rollback.keep` 代
- [ ] `runtime.allowDynamicCode: false` **不**误杀合法热加载
- [ ] 拒绝 `sources` 含 `network-unsigned` / `signature != on-every-load`

## SHOULD

- [ ] README 声明所达等级（AXP-0 ~ AXP-3）
- [ ] 提供 `runtimeServices` 的 `sampling` / `elicitation` / `ui.push` / `audit.read`
- [ ] 资源上限 `runtime.memoryMB` / `cpuPct` 生效
- [ ] `instances.multi` 多实例隔离

## 规范引用

- 可验证断言与认证流程：[`../spec/11-conformance.md`](../spec/11-conformance.md)
- 威胁模型与安全 MUST：[`../spec/12-security.md`](../spec/12-security.md)
- 基础设施与 CI 门禁：[`../spec/10-infrastructure.md`](../spec/10-infrastructure.md)

## 参考实现一致性

- [ ] 宿主行为与 [`../runtime`](../runtime) 参考运行时一致：9 步顺序、`gradient` 选择、Surface 增量、`ui.bind` 刷新、热加载 phases 顺序
- [ ] `node runtime/test/smoke.mjs` 的 30 条断言全部能在真机版本找到对应实现或明确降级说明
- [ ] 若使用 [`../reference-host/android`](../reference-host/android) 骨架，已补齐 `ManifestValidator`（接真实 schema）、`HostBridge.verifySignature()`（接真实 APK v3）、QuickJS/Hermes 执行体
- [ ] 生产环境使用 `strict` 签名策略；`dev` 仅用于本地与 CI
- [ ] 明确声明达到的等级（AXP-0 ~ AXP-3）与未实现项

## 一键验证

```bash
node validator/src/validate.mjs examples/01-hello
node validator/src/validate.mjs examples/02-ui-panel
node validator/src/validate.mjs examples/03-hot-reload
node validator/src/validate.mjs examples/04-domains
node validator/test/run-tests.mjs
python3 validator/test/schema-crosscheck.py
node runtime/test/smoke.mjs
```

四个示例全绿 + 三套测试全绿（31 / 43 / 30），是发布的最低门槛。
