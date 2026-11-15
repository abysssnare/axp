# Security Policy

> 适用：`Ultra-Guru/axp` 全仓（规范 / 校验器 / CLI / 参考运行时 / 文档站点）
> 规范依据：[`axp/spec/12-security.md`](axp/spec/12-security.md)

## 支持范围

| 组件 | 是否受理安全问题 |
|---|---|
| `axp/validator/`（校验器与 schema） | ✅ 最高优先级 |
| `axp/runtime/`（参考宿主） | ✅ |
| `axp/cli/`（打包 / 校验） | ✅ |
| 文档站点 `/api/doc` / `/api/validate` | ✅ |
| `axp/spec/*`（规范条款中的安全歧义） | ✅ |
| `reference-host/android/`（未编译骨架） | ⚠️ 受理，但需注明「未编译验证」 |
| 第三方宿主实现 | ❌ 请向对应项目报告 |

## 不要做什么

**`MUST NOT` 在公开 Issue 中提交未修复的可利用细节**（路径穿越 payload、可用的未签名热替换包、提权链等）。

请用 GitHub 私有漏洞报告（Security → Report a vulnerability），或邮件联系仓库维护者并在标题含 `AXP-SEC`。

## 报告内容

请尽量包含：

- 受影响组件与版本 / commit
- 复现步骤与最小 `axp.json`（或包）
- 实际行为 vs 期望行为（对应 `spec/12` 的 S1–S12 编号更好）
- 影响范围（是否能绕过装载校验 / 提权 / 执行未声明文件）
- 是否已公开

## 响应流程

| 阶段 | 目标时限 |
|---|---|
| 确认收到 | 3 个工作日 |
| 初步分级与复现 | 10 个工作日 |
| 修复或缓解方案 | 30 个工作日（视复杂度） |
| 公开披露 | 修复发布后，与报告者协商时间 |

分级：

- **Critical**：可执行未声明文件、绕过验签、热加载提权
- **High**：路径穿越、权限梯度越权、审计绕过
- **Medium**：校验器误判导致合法包被拒或非法包被放过
- **Low**：文档歧义、错误信息泄露非敏感路径

## 修复与发布

1. 修复 `MUST` 同时补一条 `validator/test/run-tests.mjs` 行为用例
2. 涉及 schema 语义时 `MUST` 通过 `schema-crosscheck.py` 双引擎复核
3. `MUST` 更新 `axp/spec/12-security.md` 的威胁映射（若新增规则）
4. `MUST` 在 `axp/CHANGELOG.md` 记录，必要时提升 `specVersion`
5. 安全修复 `SHOULD` 单独发版，不与其他改动混在一起

## 依赖与供应链

- `axp/validator/` / `cli/` / `runtime/` 遵守零 npm 依赖原则（[`axp/spec/10-infrastructure.md`](axp/spec/10-infrastructure.md) §3）
- 站点依赖由 `bun.lock` 锁定；Dependabot 配置见 `.github/dependabot.yml`
- 引入新依赖 `MUST` 说明用途；删除依赖 `MUST` 同步重生成 lockfile

## 相关

- 威胁模型与 MUST 条款 → [`axp/spec/12-security.md`](axp/spec/12-security.md)
- 宿主合规自检 → [`axp/docs/host-checklist.md`](axp/docs/host-checklist.md)
- 一致性认证 → [`axp/spec/11-conformance.md`](axp/spec/11-conformance.md)
