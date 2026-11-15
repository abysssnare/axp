# 发布流程 · spec 与站点产物

> 规范依据 [`../spec/10-infrastructure.md`](../spec/10-infrastructure.md) §8 · [`../spec/13-registry.md`](../spec/13-registry.md)

## 1. 版本号

| 版本 | 位置 | 是否随本次发布变化 |
|---|---|---|
| `formatVersion` | `spec/index.json` + 各包 `axp.json` 的 `axp` | 仅清单结构不兼容时 |
| `specVersion` | `spec/index.json` + git tag | **是** |
| 站点仓库版本 | 根 `package.json` | 站点 / CI / 文档变化时 |
| 插件版本 | 各 `examples/*/axp.json` | 插件内容变化时 |

tag 形如 `spec-v<specVersion>`（如 `spec-v1.1.0`），`MUST` 与 `index.json.specVersion` 一致——由 `scripts/spec-check.mjs` 断言。

## 2. 发布前必跑

```bash
# 规范一致性（零依赖）
node scripts/spec-check.mjs
node scripts/site-check.mjs --prebuild

# 四套自检
node axp/validator/test/run-tests.mjs
python3 axp/validator/test/schema-crosscheck.py
node axp/runtime/test/smoke.mjs
for d in axp/examples/*/; do node axp/validator/src/validate.mjs "$d"; done

# 站点（需 Bun）
bun install --frozen-lockfile
bun run build
node scripts/site-check.mjs
```

任一失败 `MUST NOT` 发版。

## 3. 打包

```bash
V=$(node -p "require('./axp/spec/index.json').specVersion")
cd axp
zip -r "../axp-spec-${V}.zip" spec CHANGELOG.md README.md LICENSE
cd ..
sha256sum "axp-spec-${V}.zip" > SHA256SUMS
sha256sum -c SHA256SUMS
```

发布物清单（[`../spec/index.json`](../spec/index.json) 的 `artifacts`）：

- `axp-spec-<V>.zip`：`spec/` 全量（含 `index.json`）+ 变更记录
- `SHA256SUMS`：全部产物校验和
- CHANGELOG 差异摘要（Release notes）
- 对应版本的校验器源码（随 zip 内 `axp/` 独立仓库可提供）

## 4. GitHub Release

`.github/workflows/release.yml` 在推送 `spec-v*` tag 时自动执行：

1. 检出代码并跑 `spec-check.mjs`
2. 校验 tag 与 `specVersion` 一致
3. 打 `axp-spec-<V>.zip` 与 `SHA256SUMS`
4. 创建 Release，附加两个产物与 CHANGELOG 摘要

手动触发也可用 `workflow_dispatch`，需填 `version`。

## 5. 发布后

- [ ] `sha256sum -c SHA256SUMS` 通过
- [ ] Release 附件的 zip 解压后 `spec/index.json` 可读
- [ ] `specVersion` / tag / `package.json` 三处一致
- [ ] 站点已用新 `axp/` 重新构建并部署（见 [`deployment.md`](deployment.md)）
- [ ] CHANGELOG 已写「规范语义是否变化」

## 6. 权限与信任

`SHA256SUMS` 只证明完整性，`MUST NOT` 当作签名。插件分发包的 `apk-v3` 签名、发布者指纹 pin 与更新同密钥约束见 [`../spec/12-security.md`](../spec/12-security.md) §3 与 [`../spec/13-registry.md`](../spec/13-registry.md) §4。

## 7. 相关

- 部署 → [`deployment.md`](deployment.md)
- 版本语义 → [`../spec/09-versioning.md`](../spec/09-versioning.md)
- 任务总账 → [`../../ROADMAP-ALL-TASKS.md`](../../ROADMAP-ALL-TASKS.md)
