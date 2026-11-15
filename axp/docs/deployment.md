# 部署指南 · AXP 交互式文档站点

> 适用：仓库根 Next.js 站点 · 规范依据 [`../spec/10-infrastructure.md`](../spec/10-infrastructure.md) §7
> 状态：Stable（构建实测见任务 E03）

## 0. 一句话

站点在运行时用 `path.join(process.cwd(), "axp")` 读规范项目，所以**部署根必须自带 `axp/`**。只搬 `.next/standalone/` 而不带数据，文档库和校验器演练场会静默失效。

## 1. 本地开发

```bash
bun install --frozen-lockfile
bun run dev                       # http://localhost:3000
node scripts/site-check.mjs --prebuild   # 构建前数据完整性（零依赖）
```

站点只有一个用户路由 `/`；`/api/doc` 与 `/api/validate` 是服务端接口，前者白名单读文档，后者调用仓库内真实的零依赖校验器 CLI。

## 2. 构建

```bash
bun install --frozen-lockfile
bun run build
node scripts/site-check.mjs       # 断言 standalone 自包含
```

`build` 脚本做四件事：

```
next build
cp -r .next/static  .next/standalone/.next/
cp -r public        .next/standalone/
cp -r axp           .next/standalone/     ← 关键
```

`next.config.ts` 另有 `outputFileTracingIncludes: { "/**": ["./axp/**/*"] }` 作为双保险（[`../spec/10-infrastructure.md`](../spec/10-infrastructure.md) §6.3）。两条都做，是因为 tracing 行为可能随 Next 版本变化，而部署脚本也可能只搬 standalone 目录。

## 3. standalone 直接运行

```bash
cd .next/standalone
NODE_ENV=production PORT=3000 node server.js
```

`MUST` 把工作目录设为 standalone 根，否则 `process.cwd()/axp` 解析不到数据。

冒烟：

```bash
curl -s "http://localhost:3000/api/doc?path=spec/index.json" | head -c 200
curl -s -X POST "http://localhost:3000/api/validate" \
  -H 'Content-Type: application/json' \
  -d '{"mode":"example","example":"01-hello"}'
```

第二条应返回 `ok: true`。若返回 `VALIDATOR_RUN_FAILED`，几乎都是 `axp/` 没随产物分发。

## 4. 容器化

仓库根提供 `Dockerfile` / `.dockerignore`：

```bash
docker build -t axp-site:1.1.0 .
docker run --rm -p 3000:3000 -e PORT=3000 axp-site:1.1.0
```

镜像内 `WORKDIR` 是 standalone 根，`HEALTHCHECK` 命中 `/api/doc?path=spec/index.json`，同时验证服务端进程与数据层可用。

`MUST NOT` 在镜像内写入密钥或 `.env`；环境变量说明见 `.env.example`。

## 5. 环境变量

| 变量 | 必需 | 默认 | 说明 |
|---|---|---|---|
| `NODE_ENV` | 建议 | `production` | 生产模式 |
| `PORT` | 否 | `3000` | 监听端口 |
| `HOSTNAME` | 否 | `0.0.0.0` | 绑定地址 |
| `DATABASE_URL` | 否 | — | Prisma 模板残留，站点当前**不读数据库**；见任务 G07 |

> 站点当前不依赖数据库；`prisma/` 与 `src/lib/db.ts` 是脚手架残留，清理见 [`../../ROADMAP-ALL-TASKS.md`](../../ROADMAP-ALL-TASKS.md) G07。

## 6. 构建依赖的外网访问

`src/app/layout.tsx` 使用 `next/font/google`（Geist / Geist_Mono），`next build` 需要访问 `fonts.googleapis.com`。离线或受限网络 `MUST` 改为本地 / 自托管字体（任务 D19），否则构建会失败。

## 7. 部署后检查清单

- [ ] `node scripts/site-check.mjs` → `STANDALONE CHECK PASSED`
- [ ] `/api/doc?path=spec/index.json` 返回 200 且含 `specVersion`
- [ ] `/api/validate` 的 `example` 模式返回 `ok: true`
- [ ] `/` 的示例插件清单、文档库列表与仓库内 `axp/` 一致
- [ ] 日志无 `VALIDATOR_RUN_FAILED` / `ENOENT ... axp/`
- [ ] 容器 `HEALTHCHECK` 为 healthy

## 8. 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 文档库一直「正在读取…」 | `/api/doc` 读不到 `axp/` | 检查 standalone 内是否有 `axp/` |
| 演练场返回 `VALIDATOR_RUN_FAILED` | 校验器路径不存在 | 同上 |
| 构建期字体报错 | 外网不可达 | 改本地字体（D19） |
| 更新 `axp/` 后站点没变 | 首页可能在 build 期被静态化 | 重新 `bun run build` 并重新分发产物 |

## 9. 相关

- 基础设施规范 → [`../spec/10-infrastructure.md`](../spec/10-infrastructure.md)
- 发布流程 → [`release.md`](release.md)
- 完成度审计 → [`../../AUDIT.md`](../../AUDIT.md)
