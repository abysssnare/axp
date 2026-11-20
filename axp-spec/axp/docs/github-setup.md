# 在 GitHub 上开仓库 · 操作指南

> 状态：Stable
> 适用：AXP v1.x
> 最后更新：2026-11-14

本文件把本目录变成一个可直接 push 的 GitHub 仓库。文档格式约定见 [`doc-templates.md`](doc-templates.md)，贡献规则见 [`../CONTRIBUTING.md`](../CONTRIBUTING.md)。

## 前置条件

| 项 | 要求 |
|---|---|
| Git | 任意近期版本 |
| Node.js | 20+（validator / CLI / CI） |
| Python | 3.x（`axp pack` 用内置 `zipfile`） |
| GitHub CLI | 可选，用于 `gh repo create`；不用也可用网页新建 |
| GitHub 账号 | 有建仓库权限 |

## 步骤 1 · 本地初始化

```bash
cd axp                      # 本目录（含 README.md / spec/ / docs/ / .github/）
git init -b main
```

目录本身就是仓库根，**不要**再套一层 `axp/`：

```
<repo>/
├── README.md               ← GitHub 首屏
├── spec/
├── docs/
├── validator/ cli/ sdk/ runtime/ examples/
└── .github/
```

## 步骤 2 · 替换 `OWNER` 占位符

`README.md` 的徽章链接用了 `OWNER/axp` 占位。改成你的用户名或组织名：

```bash
OWNER=your-github-name
sed -i "s|OWNER/axp|${OWNER}/axp|g" README.md
```

同时把 `LICENSE` 里的 `Copyright (c) 2026 AXP Contributors` 改成实际主体（可选）。

## 步骤 3 · 首次自检（push 前 MUST）

```bash
# 1. schema 可解析
node -e "JSON.parse(require('fs').readFileSync('spec/02-manifest.schema.json','utf8')); console.log('schema OK')"

# 2. 四个示例全绿
for d in examples/*/; do node validator/src/validate.mjs "$d" || exit 1; done

# 3. pack 可用
node cli/bin/axp.mjs pack examples/01-hello -o /tmp/hello.axp

# 3b. 四套自检（CI 会跑同一组）
node validator/test/run-tests.mjs
python3 validator/test/schema-crosscheck.py      # 需 pip install jsonschema==4.26.0
node runtime/test/smoke.mjs

# 4. README 本地链接无断链
node - <<'NODE'
const fs=require('fs');
const links=[...fs.readFileSync('README.md','utf8').matchAll(/\]\(([^)#]+)\)/g)].map(m=>m[1]);
const bad=links.filter(l=>!l.startsWith('http')&&!fs.existsSync(l));
console.log(bad.length? 'broken: '+bad.join(', ') : 'all local links OK');
if(bad.length) process.exit(1);
NODE
```

## 步骤 4 · 首次提交

```bash
git add .
git commit -m "chore: initial AXP v1.0 spec, validator, CLI, docs and examples"
```

`.gitignore` 已排除 `*.axp`（打包产物）、`node_modules/`、IDE 文件。

## 步骤 5 · 创建远端并推送

二选一。

**A. 用 GitHub CLI**

```bash
gh repo create axp --public --source=. --remote=origin --push \
  --description "AXP — an independent, Android-native plugin description format"
```

**B. 先在网页新建空仓库，再关联**

```bash
git remote add origin https://github.com/<OWNER>/axp.git
git push -u origin main
```

## 步骤 6 · 开启 CI

`.github/workflows/ci.yml` 已就位，push 后自动跑：

- schema 可解析
- 四个示例清单校验
- `axp pack` 打包并确认产物含 `axp.json`
- README 本地链接检查

在仓库 Settings → Branches 建议加一条保护规则：要求 `CI` 通过后才允许合并到 `main`。

## 步骤 7 · 发布规范版本

```bash
git tag -a spec-v1.0.0 -m "AXP Format Specification v1.0.0"
git push origin spec-v1.0.0
```

Release 附件建议包含（见 [`../spec/09-versioning.md`](../spec/09-versioning.md) §6）：

```bash
zip -r axp-spec-v1.0.0.zip spec/ CHANGELOG.md
```

用 `gh release create spec-v1.0.0 axp-spec-v1.0.0.zip --title "AXP v1.0.0" --notes-file CHANGELOG.md` 发布。

## 步骤 8 · 后续协作

| 场景 | 入口 |
|---|---|
| 改格式字段 | `.github/ISSUE_TEMPLATE/spec-change.md` 提案 → PR |
| 改 schema / validator | PR + 新增测试用例 |
| 加教程 / 示例 | PR，按 [`doc-templates.md`](doc-templates.md) 格式 |
| 提交信息 | `<type>(<scope>): <subject>`，见 [`../CONTRIBUTING.md`](../CONTRIBUTING.md) |

## 验证

- [ ] GitHub 首屏 README 正常渲染，徽章指向本仓库
- [ ] Actions 里 `CI` 一次通过（四个示例清单校验）
- [ ] `spec/01-format.md` 在 GitHub 上目录/表格渲染正常
- [ ] `spec-v1.0.0` tag 与 Release 产物可下载
- [ ] 用 `axp new` 生成的插件能 `validate` 全绿

## 常见错误

| 现象 | 原因 | 处理 |
|---|---|---|
| CI 报 `schema OK` 失败 | `02-manifest.schema.json` 里有注释或尾逗号 | schema 必须是严格 JSON，注释只放 `.md` 的 `jsonc` 片段里 |
| CI 报 `UNDECLARED_EXECUTABLE` | 新增了 `.js` 但没在 `axp.json` 引用 | 在 `impl` / `entry` / `ui.lifecycle` 里声明 |
| `axp pack` 报 zip failed | 运行环境无 `python3` | 装 Python 3，或改用系统 `zip` |
| 徽章显示 404 | 没替换 `OWNER` | 执行步骤 2 |
| 多了一层 `axp/axp/` | 在父目录 `git init` 了 | 在 `axp/` 目录内初始化 |

## 关于「在 GitHub 上完成」

仓库内容、CI、模板、教程已全部备齐。远端仓库的创建与 push 需要在你自己的 GitHub 账号下完成（步骤 5）；本指南给出可直接复制的命令。
