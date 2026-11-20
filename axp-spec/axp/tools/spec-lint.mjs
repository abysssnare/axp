#!/usr/bin/env node
/**
 * AXP 规范静态一致性校验器 —— spec/12 §5 的 S01..S08
 * 零依赖：只用 Node 内置模块 + 本仓 cli/lib/host.mjs + validator/src/validate.mjs
 *   node axp/tools/spec-lint.mjs --json
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AXP = path.resolve(HERE, '..');                 // axp-spec/axp
const SPEC = path.join(AXP, 'spec');
const DELIVERY = path.resolve(AXP, '../..');          // axp-delivery
const EXAMPLES = path.join(DELIVERY, 'axp-examples');

const results = [];
async function check(id, fn) {
  try { const d = (await fn()) || 'ok'; results.push({ id, ok: true, detail: String(d) }); }
  catch (e) { results.push({ id, ok: false, detail: e.message }); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const rd = p => fs.readFileSync(p, 'utf8');
const jd = p => JSON.parse(rd(p));
const files = d => fs.readdirSync(d, { withFileTypes: true }).filter(x => x.isFile()).map(x => x.name);
const walk = (d, ext) => {
  if (!fs.existsSync(d)) return [];
  const out = [];
  (function go(x) {
    for (const e of fs.readdirSync(x, { withFileTypes: true })) {
      const p = path.join(x, e.name);
      if (e.isDirectory()) go(p);
      else if (!ext || p.endsWith(ext)) out.push(p);
    }
  })(d);
  return out;
};

/* ---------- 迷你 draft-2020-12 校验器（覆盖本仓 schema 用到的关键字） ---------- */
function schemaErrors(v, schema, root, p = '$') {
  if (schema === undefined || schema === true) return [];
  if (schema === false) return [p + ': schema=false'];
  if (schema.$ref) {
    const seg = schema.$ref.replace(/^#\//, '').split('/');
    let t = root; for (const s of seg) t = t[s];
    assert(t, 'unresolved $ref ' + schema.$ref);
    return schemaErrors(v, t, root, p);
  }
  const errs = [];
  if (schema.anyOf) {
    const hits = schema.anyOf.filter(sub => schemaErrors(v, sub, root, p).length === 0);
    if (!hits.length) errs.push(p + ': no anyOf alternative matched (' + schema.anyOf.map(x => x.title || '?').join(',') + ')');
  }
  if (schema.allOf) for (const sub of schema.allOf) errs.push(...schemaErrors(v, sub, root, p));
  if (schema.if) {
    const hit = schemaErrors(v, schema.if, root, p).length === 0;
    const branch = hit ? schema.then : schema.else;
    if (branch) errs.push(...schemaErrors(v, branch, root, p));
  }
  if (schema.type) {
    const ts = Array.isArray(schema.type) ? schema.type : [schema.type];
    const got = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
    const okType = ts.some(t => t === got || (t === 'integer' && got === 'number' && Number.isInteger(v)) || (t === 'number' && got === 'integer'));
    if (!okType) errs.push(p + ': expected ' + ts.join('|') + ', got ' + got);
  }
  if (schema.const !== undefined && JSON.stringify(v) !== JSON.stringify(schema.const)) errs.push(p + ': const mismatch');
  if (schema.enum && !schema.enum.some(x => JSON.stringify(x) === JSON.stringify(v))) errs.push(p + ': not in enum');
  if (schema.pattern && typeof v === 'string' && !new RegExp(schema.pattern).test(v)) errs.push(p + ': pattern mismatch');
  if (schema.minLength !== undefined && typeof v === 'string' && v.length < schema.minLength) errs.push(p + ': too short');
  if (schema.minimum !== undefined && typeof v === 'number' && v < schema.minimum) errs.push(p + ': below minimum');
  if (schema.maximum !== undefined && typeof v === 'number' && v > schema.maximum) errs.push(p + ': above maximum');
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    if (schema.required) for (const r of schema.required) if (!(r in v)) errs.push(p + '.' + r + ': required');
    if (schema.minProperties !== undefined && Object.keys(v).length < schema.minProperties) errs.push(p + ': too few properties');
    if (schema.properties) {
      for (const k of Object.keys(v)) {
        if (!(k in schema.properties)) {
          if (schema.additionalProperties === false) errs.push(p + '.' + k + ': additional property');
        } else errs.push(...schemaErrors(v[k], schema.properties[k], root, p + '.' + k));
      }
    }
  }
  if (Array.isArray(v)) {
    if (schema.minItems !== undefined && v.length < schema.minItems) errs.push(p + ': too few items');
    if (schema.contains) {
      const hit = v.some(x => schemaErrors(x, schema.contains, root, p).length === 0);
      if (!hit) errs.push(p + ': contains not satisfied');
    }
    if (schema.items) v.forEach((x, i) => errs.push(...schemaErrors(x, schema.items, root, p + '[' + i + ']')));
  }
  return errs;
}
const validateBy = (v, schema) => schemaErrors(v, schema, schema);

/* ---------- S01 编号连续 + schema 可解析 ---------- */
await check('S01', () => {
  const all = files(SPEC);
  const md = all.filter(f => f.endsWith('.md'));
  for (let i = 1; i <= 21; i++) {
    const n = String(i).padStart(2, '0');
    assert(all.some(f => f.startsWith(n + '-') && (f.endsWith('.md') || f.endsWith('.json'))),
      'missing spec/' + n + '-*');
  }
  const schemas = ['02-manifest.schema.json', '10-index.schema.json', '15-panel.schema.json',
                   '16-registry.schema.json', '16-install-intent.schema.json',
                   '21-host-capabilities.schema.json'];
  for (const f of schemas) JSON.parse(rd(path.join(SPEC, f)));
  return md.length + ' md, ' + schemas.length + ' schemas parseable';
});

/* ---------- S02 14 字段表 vs 02 schema ---------- */
await check('S02', () => {
  const props = Object.keys(jd(path.join(SPEC, '02-manifest.schema.json')).properties).sort();
  const sec1 = rd(path.join(SPEC, '14-manifest-reference.md')).split('## 2. 子结构')[0];
  const listed = [...sec1.matchAll(/^\| `([A-Za-z][A-Za-z0-9]*)` \|/gm)].map(m => m[1]).sort();
  const missing = props.filter(x => !listed.includes(x));
  const extra = listed.filter(x => !props.includes(x));
  assert(!missing.length && !extra.length, 'missing=' + missing + ' extra=' + extra);
  return props.length + ' top-level fields aligned';
});

/* ---------- S03 panel schema + id 引用 ---------- */
await check('S03', () => {
  const schema = jd(path.join(SPEC, '15-panel.schema.json'));
  const panels = [
    ...walk(path.join(AXP, 'test/fixtures'), 'panel.json'),
    ...walk(path.join(EXAMPLES, 'plugins'), 'panel.json'),
  ];
  assert(panels.length >= 5, 'too few panels: ' + panels.length);
  const withExamples = fs.existsSync(path.join(EXAMPLES, 'plugins'));
  for (const f of panels) {
    const d = jd(f);
    const e = validateBy(d, schema);
    assert(!e.length, path.relative(DELIVERY, f) + ': ' + e.slice(0, 3).join('; '));
    const ids = new Set((d.nodes || []).map(n => n.id));
    assert(ids.size === (d.nodes || []).length, path.relative(DELIVERY, f) + ': duplicate node id');
    for (const n of d.nodes || []) {
      for (const c of (n.children || [])) {
        if (typeof c === 'string') assert(ids.has(c), path.relative(DELIVERY, f) + ': ' + n.id + ' -> missing child ' + c);
      }
    }
    if (d.root) assert(ids.has(d.root), path.relative(DELIVERY, f) + ': root not found');
  }
  return panels.length + ' panels valid, all child refs resolve' + (withExamples ? ' (incl. examples repo)' : ' (examples repo absent, skipped)');
});

/* ---------- S04 宿主层三个 schema 现场生成并校验 ---------- */
await check('S04', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axp-speclint-'));
  process.env.AXP_HOME = path.join(tmp, 'home');
  const H = await import('../cli/lib/host.mjs');
  H.install(path.join(AXP, 'test/fixtures/01-hello'), { dev: true });
  const reg = jd(path.join(tmp, 'home', 'registry.json'));
  const intent = jd(path.join(tmp, 'home', 'inbox', 'com.example.hello.install-intent.json'));
  const idxPath = path.join(tmp, 'index.json');
  H.publish(path.join(AXP, 'test/fixtures/01-hello'), idxPath);
  const idx = jd(idxPath);
  const cases = [
    ['16-registry.schema.json', reg],
    ['16-install-intent.schema.json', intent],
    ['10-index.schema.json', idx],
  ];
  for (const [f, v] of cases) {
    const e = validateBy(v, jd(path.join(SPEC, f)));
    assert(!e.length, f + ': ' + e.slice(0, 4).join('; '));
  }
  return 'registry / intent / index all conform';
});

/* ---------- S05 错误码双向核对 ---------- */
await check('S05', () => {
  const src = rd(path.join(AXP, 'validator/src/validate.mjs'));
  const codes = new Set([
    ...[...src.matchAll(/\berr\(\s*'([A-Z][A-Z0-9_]+)'/g)].map(m => m[1]),
    ...[...src.matchAll(/code:\s*'([A-Z][A-Z0-9_]+)'/g)].map(m => m[1]),
  ]);
  const doc = rd(path.join(SPEC, '19-error-codes.md'));
  const table = [...doc.matchAll(/^\| `([A-Z][A-Z0-9_]+)` \|/gm)].map(m => m[1]);
  assert(new Set(table).size === table.length, 'duplicate code in 19-error-codes.md');
  const missing = [...codes].filter(c => !table.includes(c));
  assert(!missing.length, 'validator codes missing from spec: ' + missing.join(','));
  return codes.size + ' validator codes all documented, ' + table.length + ' total codes, 0 duplicates';
});

/* ---------- S06 tools/*.js ES5 基线 ---------- */
await check('S06', () => {
  const bad = [];
  const js = [
    ...walk(path.join(AXP, 'test/fixtures'), '.js').filter(f => f.includes(path.sep + 'tools' + path.sep)),
    ...walk(path.join(EXAMPLES, 'plugins'), '.js').filter(f => f.includes(path.sep + 'tools' + path.sep)),
  ];
  for (const f of js) {
    const t = rd(f);
    const hits = ['??', '?.', '=>', '`', /\bconst\b/, /\blet\b/].filter(x => x instanceof RegExp ? x.test(t) : t.includes(x));
    if (hits.length) bad.push(path.relative(DELIVERY, f) + ': ' + hits.join(','));
  }
  assert(!bad.length, 'ES2020 syntax in executable tools:\n  ' + bad.join('\n  '));
  return js.length + ' tools/*.js ES5-clean' + (fs.existsSync(path.join(EXAMPLES,'plugins')) ? ' (incl. examples repo)' : ' (examples repo absent, skipped)');
});

/* ---------- S07 v1.0 基线回归 ---------- */
await check('S07', async () => {
  const { validate } = await import('../validator/src/validate.mjs');
  const base = ['01-hello', '02-ui-panel', '03-hot-reload', '04-domains'];
  for (const n of base) {
    const r = validate(path.join(AXP, 'test/fixtures', n));
    assert(r.ok, n + ' no longer valid: ' + r.errors.map(e => e.code).join(','));
  }
  return base.length + ' v1.0 fixtures still valid under v1.1 validator';
});

/* ---------- S08 spec 内相对链接 ---------- */
await check('S08', () => {
  const bad = [];
  for (const f of walk(SPEC, '.md')) {
    // 链接可能带 #fragment：先剥掉 fragment 再检查文件部分是否存在
    for (const m of rd(f).matchAll(/\]\(([^)\s]+)\)/g)) {
      const h = m[1].split('#')[0];
      if (!h || /^https?:|^mailto:/.test(h)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(f), h))) bad.push(path.basename(f) + ': ' + m[1]);
    }
  }
  assert(!bad.length, bad.join('; '));
  return walk(SPEC, '.md').length + ' spec markdown files, 0 broken links';
});

/* ---------- S09 host.json 能力声明（21 章 I01 的机器部分） ---------- */
await check('S09', () => {
  const schema = jd(path.join(SPEC, '21-host-capabilities.schema.json'));
  const candidates = [
    path.join(DELIVERY, 'axp-android-host/app/src/main/assets/axp/host.json'),
  ];
  assert(candidates.some(f => fs.existsSync(f)), 'no host.json shipped with reference host');
  for (const f of candidates.filter(x => fs.existsSync(x))) {
    const d = jd(f);
    const e = validateBy(d, schema);
    assert(!e.length, path.relative(DELIVERY, f) + ': ' + e.slice(0, 4).join('; '));
    assert(['AXP-0','AXP-1','AXP-2','AXP-3'].includes(d.hostLevel), 'hostLevel invalid');
    assert(d.conformance.failed === 0, 'conformance.failed must be 0');
    if (d.hostLevel !== 'AXP-3')
      assert((d.conformance.notImplemented || []).length > 0,
        'hostLevel ' + d.hostLevel + ' must list notImplemented (21 §5.2)');
    if ((d.uiForms || []).includes('panel'))
      assert((d.panelForms || []).length > 0, 'uiForms contains panel but panelForms empty');
    const services = d.services || {};
    for (const k of ['sampling','elicitation'])
      assert(!services[k] || (d.ctx || []).length >= 0, 'services/ctx inconsistent: ' + k);
  }
  return 'host.json conforms; hostLevel=' + jd(candidates[0]).hostLevel +
         ', notImplemented=' + jd(candidates[0]).conformance.notImplemented.length + ' items';
});

const passed = results.filter(r => r.ok).length;
const failed = results.length - passed;
const report = { suite: 'axp-spec-lint/1.0', specVersion: '1.1.0', passed, failed, total: results.length, cases: results };
console.log(JSON.stringify(report, null, 2));
process.exitCode = failed ? 1 : 0;
