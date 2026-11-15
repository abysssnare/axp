#!/usr/bin/env node
/**
 * AXP 文档站点产物自检（零依赖，Node 18+）。
 *
 *   node scripts/site-check.mjs --prebuild   # 构建前：axp/ 数据完整性（可在任何环境跑）
 *   node scripts/site-check.mjs              # 构建后：standalone 自包含性（bun run build 之后跑）
 *
 * 背景：站点在运行时用 path.join(process.cwd(), "axp") 读取规范项目。
 * 按 Next.js 官方方式把 .next/standalone/ 整个目录作为部署根时，axp/ 必须随产物一起分发，
 * 否则 /api/doc（文档库）与 /api/validate（演练场）都会失效。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const prebuild = process.argv.includes('--prebuild');
const errors = [];
const ok = [];

const AXP = path.join(ROOT, 'axp');
const STANDALONE = path.join(ROOT, '.next', 'standalone');

function need(p, label) {
  if (fs.existsSync(p)) ok.push(label);
  else errors.push(label + '  →  ' + p);
}

/* ---------- 构建前：axp/ 数据完整性 ---------- */
const DATA_FILES = [
  'spec/01-format.md',
  'spec/02-manifest.schema.json',
  'spec/03-impl-reference.md',
  'spec/04-capabilities.md',
  'spec/05-domains.md',
  'spec/06-ui-vocab.md',
  'spec/07-expression-map.md',
  'spec/08-hot-reload.md',
  'spec/09-versioning.md',
  'spec/10-infrastructure.md',
  'spec/11-conformance.md',
  'spec/12-security.md',
  'spec/13-registry.md',
  'spec/index.json',
  'docs/deployment.md',
  'docs/release.md',
  'conformance/axp-conformance.template.json',
  'validator/src/validate.mjs',
  'validator/test/run-tests.mjs',
  'validator/test/schema-crosscheck.py',
  'cli/bin/axp.mjs',
  'runtime/test/smoke.mjs',
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
];

for (const f of DATA_FILES) need(path.join(AXP, f), 'axp/' + f);

// 示例插件：目录存在 + axp.json 可解析
const EX_DIR = path.join(AXP, 'examples');
let exampleCount = 0;
if (fs.existsSync(EX_DIR)) {
  for (const d of fs.readdirSync(EX_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    exampleCount++;
    const mf = path.join(EX_DIR, d.name, 'axp.json');
    if (!fs.existsSync(mf)) { errors.push(`axp/examples/${d.name}/axp.json 缺失`); continue; }
    try {
      const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
      if (m.axp !== '1.0' || !m.id) errors.push(`axp/examples/${d.name}/axp.json 关键字段异常`);
      else ok.push(`example ${d.name} (${m.id})`);
    } catch (e) {
      errors.push(`axp/examples/${d.name}/axp.json 解析失败: ${e.message}`);
    }
  }
} else errors.push('axp/examples/ 目录缺失');
if (exampleCount !== 4) errors.push(`示例数量应为 4，实际 ${exampleCount}`);

// 校验器可执行性（不执行插件实现体，只做语法加载）
try {
  const mod = await import(path.join(AXP, 'validator/src/validate.mjs'));
  if (typeof mod.validate === 'function') ok.push('validator.validate 可导入');
  else errors.push('validator/src/validate.mjs 未导出 validate()');
} catch (e) {
  errors.push('validator 导入失败: ' + e.message);
}

if (prebuild) {
  console.log(`[prebuild] axp/ 数据完整性：${ok.length} 项通过，${errors.length} 项失败`);
  errors.forEach(e => console.error('  ✖ ' + e));
  console.log(errors.length ? 'PREBUILD CHECK FAILED' : 'PREBUILD CHECK PASSED');
  process.exit(errors.length ? 1 : 0);
}

/* ---------- 构建后：standalone 自包含性 ---------- */
if (!fs.existsSync(STANDALONE)) {
  console.error('[standalone] 未找到 .next/standalone/ —— 请先运行 bun run build');
  console.error('  提示：只想检查 axp/ 数据时用 node scripts/site-check.mjs --prebuild');
  process.exit(1);
}

need(path.join(STANDALONE, 'server.js'), 'standalone/server.js');
need(path.join(STANDALONE, '.next', 'static'), 'standalone/.next/static');
need(path.join(STANDALONE, 'public'), 'standalone/public');
// 关键：运行时数据必须随产物分发
for (const f of [
  'axp/spec/01-format.md',
  'axp/spec/02-manifest.schema.json',
  'axp/spec/index.json',
  'axp/validator/src/validate.mjs',
  'axp/examples/01-hello/axp.json',
  'axp/examples/04-domains/axp.json',
]) need(path.join(STANDALONE, f), 'standalone/' + f);

// 文档库白名单里的文件是否都在产物内
// 动态扫描 spec/ 全量，避免新增章节后产物检查漏掉
const DOC_PATHS = [
  ...fs.readdirSync(path.join(AXP, 'spec'))
    .filter(f => /\.(md|json)$/.test(f))
    .map(f => 'spec/' + f),
  'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md',
  'docs/deployment.md', 'docs/release.md',
  'runtime/README.md', 'validator/README.md', 'reference-host/README.md',
  'conformance/README.md', 'conformance/axp-conformance.template.json',
];
for (const f of DOC_PATHS) need(path.join(STANDALONE, 'axp', f), 'standalone/axp/' + f);

console.log(`[standalone] 产物自包含性：${ok.length} 项通过，${errors.length} 项失败`);
errors.forEach(e => console.error('  ✖ ' + e));
if (errors.length) {
  console.error('\n常见原因：build 脚本未包含 cp -r axp .next/standalone/，或 outputFileTracingIncludes 未配置。');
  process.exit(1);
}
console.log('STANDALONE CHECK PASSED — 容器化部署时文档库与演练场可用');
