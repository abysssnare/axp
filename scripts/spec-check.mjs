#!/usr/bin/env node
/**
 * AXP 规范一致性自检（零依赖，Node 20+）。
 *
 *   node scripts/spec-check.mjs
 *
 * 规范依据 axp/spec/10-infrastructure.md §4 / §5。
 * 把「文档、schema、校验器、站点、CI 是否还互相自洽」变成一条可自动断言的命令，
 * 而不是靠人记住哪几个数字要一起改。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AXP = path.join(ROOT, 'axp');
const SPEC = path.join(AXP, 'spec');
const DOCS = path.join(AXP, 'docs');
const EX = path.join(AXP, 'examples');

let pass = 0;
const failures = [];
const ok = (name, cond, extra) => {
  if (cond) { pass++; return true; }
  failures.push(`${name}${extra ? '  →  ' + extra : ''}`);
  return false;
};
const read = p => fs.readFileSync(p, 'utf8');
const exists = p => fs.existsSync(p);
const has = (s, re) => re.test(s);

/* ---------- 0. 单一事实源 ---------- */
const idxPath = path.join(SPEC, 'index.json');
if (!ok('index.json 存在', exists(idxPath))) {
  console.error('SPEC CHECK FAILED'); failures.forEach(f => console.error('  ✖ ' + f)); process.exit(1);
}
let idx;
try { idx = JSON.parse(read(idxPath)); ok('index.json 可解析', true); }
catch (e) { ok('index.json 可解析', false, e.message); }
if (!idx) { console.error('SPEC CHECK FAILED'); process.exit(1); }
ok('index.json.schema', idx.schema === 'axp-spec-index/1.0', idx.schema);
ok('formatVersion 为 1.0', idx.formatVersion === '1.0', idx.formatVersion);
ok('specVersion 形如 x.y.z', /^\d+\.\d+\.\d+$/.test(idx.specVersion || ''), idx.specVersion);

/* ---------- 1. 文档索引 <-> 文件系统 双向闭合 ---------- */
const specEntries = fs.readdirSync(SPEC).filter(f => /\.(md|json)$/.test(f)).sort();
const indexed = new Set((idx.documents || []).map(d => d.path.replace(/^spec\//, '')));
for (const f of specEntries) ok(`spec/${f} 已登记进 index`, indexed.has(f));
for (const d of idx.documents || []) ok(`index 条目 ${d.path} 存在`, exists(path.join(AXP, d.path)));
ok('index.documents 条数 = spec 文件数', (idx.documents || []).length === specEntries.length,
  `${idx.documents?.length} vs ${specEntries.length}`);
ok('counts.specFiles = spec 文件数', idx.counts?.specFiles === specEntries.length,
  `${idx.counts?.specFiles} vs ${specEntries.length}`);
// 编号章节 = 01-format.md … 13-registry.md（02 是 schema.json，仍算一章）；index.json 不计
const chapters = specEntries.filter(f => /^\d{2}-/.test(f)).length;
ok('counts.specChapters = 编号章节数', idx.counts?.specChapters === chapters, `${idx.counts?.specChapters} vs ${chapters}`);

const guides = fs.readdirSync(DOCS).filter(f => f.endsWith('.md')).length;
ok('counts.docGuides = docs/ 文件数', idx.counts?.docGuides === guides, `${idx.counts?.docGuides} vs ${guides}`);
const exDirs = fs.readdirSync(EX, { withFileTypes: true }).filter(e => e.isDirectory()).length;
ok('counts.examples = 示例目录数', idx.counts?.examples === exDirs, `${idx.counts?.examples} vs ${exDirs}`);

/* ---------- 2. 版本号对齐 ---------- */
let pkg = {};
try { pkg = JSON.parse(read(path.join(ROOT, 'package.json'))); } catch { /* reported below */ }
ok('package.json.version = specVersion', pkg.version === idx.specVersion, `${pkg.version} vs ${idx.specVersion}`);
const changelog = read(path.join(AXP, 'CHANGELOG.md'));
ok(`CHANGELOG 含 [${idx.specVersion}]`, has(changelog, new RegExp(`\\[${idx.specVersion.replace(/\./g, '\\.')}\\]`)));
ok('CHANGELOG 标注格式版本不变', /格式语义不变|规范语义不变/.test(changelog.split(`## [${idx.specVersion}]`)[1]?.slice(0, 1600) || ''));

const schema = JSON.parse(read(path.join(SPEC, '02-manifest.schema.json')));
ok('schema.const axp = formatVersion', schema.properties?.axp?.const === idx.formatVersion,
  `${schema.properties?.axp?.const} vs ${idx.formatVersion}`);
ok('schema $schema = draft 2020-12', /\bdraft\/2020-12\b/.test(schema.$schema || ''), schema.$schema);
for (const e of fs.readdirSync(EX, { withFileTypes: true }).filter(e => e.isDirectory())) {
  const m = JSON.parse(read(path.join(EX, e.name, 'axp.json')));
  ok(`${e.name}/axp.json 的 axp = formatVersion`, m.axp === idx.formatVersion, `${m.axp}`);
}

/* ---------- 3. 主规范章节编号连续 ---------- */
const fmt = read(path.join(SPEC, '01-format.md'));
const h2 = [...fmt.matchAll(/^## (\d+)\. /gm)].map(m => Number(m[1]));
const expectedH2 = Array.from({ length: h2.length }, (_, i) => i);
ok('01 主章节编号连续 (0..N)', JSON.stringify(h2) === JSON.stringify(expectedH2), h2.join(','));
for (const sec of h2) {
  const block = fmt.split(new RegExp(`^## ${sec}\\. `, 'm'))[1]?.split(/^## /m)[0] || '';
  const subs = [...block.matchAll(new RegExp(`^### ${sec}\\.(\\d+)`, 'gm'))].map(m => Number(m[1]));
  const exp = Array.from({ length: subs.length }, (_, i) => i + 1);
  ok(`01 §${sec} 子章节编号连续`, JSON.stringify(subs) === JSON.stringify(exp), `${sec}: ${subs.join(',')}`);
}
ok('01 声明唯一规范性正文', has(fmt, /唯一规范性正文/));
ok('01 声明 RFC 2119 关键字', has(fmt, /RFC 2119/));
ok('01 引用 index.json', has(fmt, /index\.json/));
ok('01 引用 10/11/12/13 章', [10, 11, 12, 13].every(n => has(fmt, new RegExp(`spec/${n}-|\\b${n}-`)) || has(fmt, new RegExp(`§?${n}\\b`))));

/* ---------- 4. URI 一致性：禁止已废弃的 vision 域 ---------- */
const scanRoots = [SPEC, DOCS, EX, path.join(ROOT, 'src'), path.join(AXP, 'runtime')];
const badUri = [];
for (const root of scanRoots) {
  if (!exists(root)) continue;
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name === 'node_modules') continue; walk(p); }
      else if (/\.(md|json|mjs|ts|tsx|js)$/.test(e.name)) {
        const t = read(p);
        if (/axp:\/\/vision\//.test(t)) badUri.push(path.relative(ROOT, p));
      }
    }
  })(root);
}
ok('无已废弃的 axp://vision/ 域', badUri.length === 0, badUri.join(', '));

/* ---------- 5. 错误码闭合：实现 <-> index <-> README ---------- */
const validatorSrc = read(path.join(AXP, 'validator/src/validate.mjs'));
const validatorReadme = read(path.join(AXP, 'validator/README.md'));
const implCodes = new Set([...validatorSrc.matchAll(/['"]([A-Z][A-Z0-9_]{3,})['"]/g)].map(m => m[1]));
const idxCodes = new Set(idx.errorCodes || []);
for (const c of idxCodes) if (!c.startsWith('WARN_')) {
  ok(`index 错误码 ${c} 有实现或文档依据`,
    implCodes.has(c) || c.startsWith('SCHEMA_') || has(validatorReadme, new RegExp(`\\b${c}\\b`)));
}
for (const c of implCodes) {
  if (/^SCHEMA_|^WARN_|^MANIFEST_/.test(c)) continue;
  ok(`实现错误码 ${c} 已登记 index`, idxCodes.has(c));
  ok(`实现错误码 ${c} 出现在 README 错误码表`, has(validatorReadme, new RegExp(`\\b${c}\\b`)));
}
ok('counts.securityRules = S 规则数', idx.counts?.securityRules === (idx.securityRules || []).length,
  `${idx.counts?.securityRules} vs ${idx.securityRules?.length}`);
const sec = read(path.join(SPEC, '12-security.md'));
for (const s of idx.securityRules || []) ok(`12-security.md 含 ${s}`, has(sec, new RegExp(`\\| ${s} \\|`)));

/* ---------- 6. 一致性断言闭合 ---------- */
const conf = idx.conformance || {};
const confDoc = read(path.join(SPEC, '11-conformance.md'));
const allCases = [...(conf.axp0 || []), ...(conf.axp1 || []), ...(conf.axp2 || []), ...(conf.axp3 || [])];
for (const c of allCases) ok(`11-conformance.md 含断言 ${c}`, has(confDoc, new RegExp(`\\| ${c} \\|`)));
ok('conformance.levels = AXP-0..3', JSON.stringify(conf.levels) === JSON.stringify(['AXP-0','AXP-1','AXP-2','AXP-3']));
const tmpl = JSON.parse(read(path.join(AXP, 'conformance/axp-conformance.template.json')));
ok('conformance 模板 schema 对齐', tmpl.schema === conf.schema, `${tmpl.schema} vs ${conf.schema}`);
ok('conformance 模板 summary=0', tmpl.summary?.total === 0 && tmpl.results?.length === 0);

/* ---------- 7. 站点硬编码数字与 index 对齐 ---------- */
const siteData = read(path.join(ROOT, 'src/components/axp/data.ts'));
for (const [label, re, val] of [
  ['data.ts SELF_CHECKS 行为用例', /行为用例[\s\S]{0,160}?n:\s*"(\d+)\/(\d+)"/, idx.counts.validatorTests],
]) {
  const m = siteData.match(re);
  ok(`${label} = index.counts`, m && Number(m[1]) === val && Number(m[2]) === val, m ? `${m[1]}/${m[2]}` : 'pattern miss');
}
ok('data.ts 自检 43 项', /43\/43/.test(siteData), '');
ok('data.ts 自检 30 条', /30\/30/.test(siteData), '');
const server = read(path.join(ROOT, 'src/lib/axp-server.ts'));
ok('axp-server 从 index.json 派生 stats', has(server, /index\.json/));

/* ---------- 8. 基础设施门禁存在 ---------- */
const ci = read(path.join(ROOT, '.github/workflows/ci.yml'));
for (const job of ['axp-selfcheck', 'spec-consistency', 'web-lint', 'web-build', 'docs-links'])
  ok(`CI 含 ${job} job`, has(ci, new RegExp(`^  ${job}:`, 'm')));
ok('CI 无 continue-on-error 掩盖', !/continue-on-error:\s*true/.test(ci));
ok('CI 无 || true 掩盖', !/\|\|\s*true/.test(ci));
const nextCfg = read(path.join(ROOT, 'next.config.ts'));
ok('next.config 有 outputFileTracingIncludes', has(nextCfg, /outputFileTracingIncludes/));
const buildScript = pkg.scripts?.build || '';
ok('build 复制 axp 到 standalone', /cp -r axp \.next\/standalone\//.test(buildScript), buildScript);
ok('Dockerfile 断言 axp 数据', has(read(path.join(ROOT, 'Dockerfile')), /axp\/spec\/index\.json/));
ok('release workflow 校验 tag 与 specVersion', has(read(path.join(ROOT, '.github/workflows/release.yml')), /specVersion/));
ok('SECURITY.md 存在', exists(path.join(ROOT, 'SECURITY.md')));
ok('LICENSE 存在', exists(path.join(ROOT, 'LICENSE')));
ok('index.buildGateStatus 已声明', !!idx.buildGateStatus && typeof idx.buildGateStatus.nextBuildVerified === 'boolean');

/* ---------- 9. 全仓 Markdown 本地链接 ---------- */
const mdFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      // 与 .gitignore 对齐：跳过依赖目录与本沙箱环境目录（upload/ examples/ 等不入库）
      if (['node_modules', '.git', '.next', '_upstream', '_fresh', '_fresh2',
           'upload', 'download', 'mini-services', 'skills', 'tests', '.zscripts'].includes(e.name)) continue;
      walk(p);
    }
    else if (e.name.endsWith('.md')) mdFiles.push(p);
  }
})(ROOT);
const broken = [];
let linkCount = 0;
for (const f of mdFiles) {
  for (const m of read(f).matchAll(/\]\(([^)#\s]+)\)/g)) {
    const l = m[1];
    if (/^(https?:|mailto:)/.test(l)) continue;
    linkCount++;
    if (!exists(path.resolve(path.dirname(f), l))) broken.push(`${path.relative(ROOT, f)} -> ${l}`);
  }
}
ok(`全仓 ${mdFiles.length} md / ${linkCount} 本地链接零断链`, broken.length === 0, broken.slice(0, 8).join(' | '));

/* ---------- 结果 ---------- */
console.log(`\nSPEC CHECK · ${pass} 项通过，${failures.length} 项失败`);
if (failures.length) {
  failures.forEach(f => console.error('  ✖ ' + f));
  console.error('SPEC CHECK FAILED');
  process.exit(1);
}
console.log('SPEC CHECK PASSED');
