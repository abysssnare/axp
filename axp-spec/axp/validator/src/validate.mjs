#!/usr/bin/env node
/**
 * axp-validate — offline, dependency-free validator for AXP v1.0 manifests.
 * Spec: ../spec/01-format.md  |  Schema: ../spec/02-manifest.schema.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(HERE, '../../spec/02-manifest.schema.json');
const PRIV = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 };
const EXEC_EXT = new Set(['.js', '.dex', '.so', '.wasm', '.html']);

const EXACT_REQUESTS = new Set([
  'accessibility.read', 'accessibility.gestures', 'accessibility.takeScreenshot',
  'accessibility.windowChange', 'shizuku.binder', 'root.su', 'system.inject',
  'notification.listen', 'notification.post', 'clipboard.read', 'clipboard.write',
  'sensor.gps', 'sensor.motion', 'sensor.biometric', 'sensor.light',
  'telephony.sms.read', 'telephony.state', 'intent.send', 'intent.receive',
  'pm.list', 'pm.install', 'logcat.read', 'sysprop.read', 'media.capture',
  'net.stat', 'foreground.service',
]);

function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

/* ---------------- minimal JSON Schema engine (spec/02 subset) ---------------- */

function resolveRef(ref, root) {
  if (!ref.startsWith('#/')) throw new Error('unsupported $ref: ' + ref);
  let cur = root;
  for (const raw of ref.slice(2).split('/')) {
    cur = cur[raw.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  return cur;
}

function schemaCheck(val, schema, root, p, errors) {
  if (schema === true) return true;
  if (schema === false) { errors.push({ code: 'SCHEMA_FALSE', msg: 'schema forbids value', path: p }); return false; }
  if (schema.$ref) return schemaCheck(val, resolveRef(schema.$ref, root), root, p, errors);
  let ok = true;

  if (schema.type) {
    const t = schema.type;
    const good =
      t === 'object' ? isObj(val) :
      t === 'array' ? Array.isArray(val) :
      t === 'string' ? typeof val === 'string' :
      t === 'integer' ? Number.isInteger(val) :
      t === 'number' ? typeof val === 'number' :
      t === 'boolean' ? typeof val === 'boolean' : false;
    if (!good) { errors.push({ code: 'SCHEMA_TYPE', msg: `expected ${t}`, path: p }); ok = false; }
  }
  if (schema.enum && !schema.enum.some(e => deepEq(e, val))) {
    errors.push({ code: 'SCHEMA_ENUM', msg: `value not in enum ${JSON.stringify(schema.enum)}`, path: p }); ok = false;
  }
  if ('const' in schema && !deepEq(schema.const, val)) {
    errors.push({ code: 'SCHEMA_CONST', msg: `must be ${JSON.stringify(schema.const)}`, path: p }); ok = false;
  }
  if (typeof val === 'string') {
    if (schema.minLength !== undefined && val.length < schema.minLength) {
      errors.push({ code: 'SCHEMA_MINLENGTH', msg: 'string too short', path: p }); ok = false;
    }
  }
  if (typeof val === 'number') {
    if (schema.minimum !== undefined && val < schema.minimum) { errors.push({ code: 'SCHEMA_MINIMUM', msg: 'below minimum', path: p }); ok = false; }
    if (schema.maximum !== undefined && val > schema.maximum) { errors.push({ code: 'SCHEMA_MAXIMUM', msg: 'above maximum', path: p }); ok = false; }
  }

  if (isObj(val)) {
    const props = schema.properties || {};
    const patterns = Object.entries(schema.patternProperties || {}).map(([k, v]) => [new RegExp(k), v]);
    for (const r of schema.required || []) {
      if (!(r in val)) { errors.push({ code: 'SCHEMA_REQUIRED', msg: `missing required '${r}'`, path: p }); ok = false; }
    }
    if (schema.minProperties !== undefined && Object.keys(val).length < schema.minProperties) {
      errors.push({ code: 'SCHEMA_MINPROPERTIES', msg: 'too few properties', path: p }); ok = false;
    }
    for (const [k, v] of Object.entries(val)) {
      const cp = p ? `${p}.${k}` : k;
      // JSON Schema draft 2020-12: a key may be validated by BOTH `properties`
      // and any matching `patternProperties`; `additionalProperties` only applies
      // to keys matched by neither.
      const inProps = Object.prototype.hasOwnProperty.call(props, k);
      if (inProps) {
        if (!schemaCheck(v, props[k], root, cp, errors)) ok = false;
      }
      let matched = false;
      for (const [re, sub] of patterns) {
        if (re.test(k)) { matched = true; if (!schemaCheck(v, sub, root, cp, errors)) ok = false; }
      }
      if (inProps || matched) continue;
      if (schema.additionalProperties === false) {
        errors.push({ code: 'SCHEMA_ADDITIONAL_PROPERTY', msg: `unknown field '${k}'`, path: cp }); ok = false;
      } else if (isObj(schema.additionalProperties)) {
        if (!schemaCheck(v, schema.additionalProperties, root, cp, errors)) ok = false;
      }
    }
  }

  if (Array.isArray(val)) {
    if (schema.minItems !== undefined && val.length < schema.minItems) {
      errors.push({ code: 'SCHEMA_MINITEMS', msg: 'too few items', path: p }); ok = false;
    }
    if (schema.items) val.forEach((v, i) => { if (!schemaCheck(v, schema.items, root, `${p}[${i}]`, errors)) ok = false; });
    if (schema.contains) {
      const hit = val.some(v => trySchema(v, schema.contains, root));
      if (!hit) { errors.push({ code: 'SCHEMA_CONTAINS', msg: 'no matching item', path: p }); ok = false; }
    }
  }

  if (schema.anyOf) {
    const hit = schema.anyOf.some(s => trySchema(val, s, root));
    if (!hit) { errors.push({ code: 'SCHEMA_ANYOF', msg: 'no alternative matched', path: p }); ok = false; }
  }
  if (schema.if) {
    const matched = trySchema(val, schema.if, root);
    if (matched && schema.then) { if (!schemaCheck(val, schema.then, root, p, errors)) ok = false; }
    if (!matched && schema.else) { if (!schemaCheck(val, schema.else, root, p, errors)) ok = false; }
  }
  if (schema.not && trySchema(val, schema.not, root)) {
    errors.push({ code: 'SCHEMA_NOT', msg: 'negated schema matched', path: p }); ok = false;
  }
  return ok;
}

function trySchema(val, schema, root) {
  const tmp = [];
  return schemaCheck(val, schema, root, '', tmp) && tmp.length === 0;
}

/* ---------------- filesystem helpers ---------------- */

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

function implPaths(impl, add) {
  if (!isObj(impl)) return;
  for (const k of ['js', 'kotlin', 'native', 'wasm', 'bin']) {
    if (typeof impl[k] === 'string') add(impl[k].split('#')[0]);
  }
  if (isObj(impl.proc) && typeof impl.proc.cmd === 'string' && impl.proc.cmd.includes('/')) {
    add(impl.proc.cmd);
  }
}

function collectRefs(m) {
  const refs = [];
  const add = p => { if (typeof p === 'string' && p) refs.push(p); };
  if (isObj(m.entry)) add(m.entry.js);
  for (const t of m.tools || []) {
    implPaths(t.impl, add);
    for (const g of Object.values(t.gradient || {})) implPaths(g && g.impl, add);
    if (isObj(t.input) && typeof t.input.$ref === 'string') add(t.input.$ref);
    if (isObj(t.output) && typeof t.output.$ref === 'string') add(t.output.$ref);
  }
  for (const s of m.surfaces || []) implPaths(s.impl, add);
  for (const k of m.knowledge || []) add(k.entry);
  for (const a of m.agents || []) add(a.prompt);
  for (const e of m.events || []) implPaths(e.run, add);
  const ui = m.ui || {};
  for (const slot of ['panel', 'widget', 'web', 'activity']) {
    if (isObj(ui[slot])) add(ui[slot].entry);
  }
  for (const i of ui.inject || []) add(i.run);
  for (const cb of ['onLoad', 'onReload', 'onUnload']) {
    if (isObj(ui.lifecycle)) add(ui.lifecycle[cb]);
  }
  if (isObj(m.hotReload) && isObj(m.hotReload.state)) add(m.hotReload.state.migrate);
  return refs;
}

function allImpls(m) {
  const out = [];
  const push = x => { if (isObj(x)) out.push(x); };
  for (const t of m.tools || []) {
    push(t.impl);
    for (const g of Object.values(t.gradient || {})) push(g && g.impl);
  }
  for (const s of m.surfaces || []) push(s.impl);
  for (const e of m.events || []) push(e.run);
  return out;
}

/* ---------------- main validation ---------------- */

export function validate(dir, preM) {
  const errors = [], warnings = [], info = [];
  const err = (code, msg, p = '') => errors.push({ code, msg, path: p });
  const warn = (code, msg, p = '') => warnings.push({ code, msg, path: p });
  const abs = path.resolve(dir);

  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    err('MANIFEST_MISSING', `plugin directory not found: ${dir}`);
    return { ok: false, errors, warnings, info, summary: null };
  }
  const mf = path.join(abs, 'axp.json');
  if (!fs.existsSync(mf)) {
    err('MANIFEST_MISSING', 'axp.json not found');
    return { ok: false, errors, warnings, info, summary: null };
  }
  let m;
  if (preM !== undefined && preM !== null) {
    // 调用方（运行时装载流水线）已解析过同一份清单：复用它，
    // 消除「校验读一份、注册用另一份」的窗口
    m = preM;
  } else {
    try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); }
    catch (e) { err('MANIFEST_PARSE', e.message); return { ok: false, errors, warnings, info, summary: null }; }
  }

  // 2. schema
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const raw = [];
  schemaCheck(m, schema, schema, '', raw);
  const seen = new Set();
  for (const e of raw) {
    const key = e.code + '|' + e.path + '|' + e.msg;
    if (!seen.has(key)) { seen.add(key); errors.push({ ...e, path: e.path || 'axp.json' }); }
  }

  // 3. identity
  if (typeof m.id !== 'string' || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(m.id)) err('ID_INVALID', 'id must be reverse-domain', 'id');
  if (typeof m.version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][\w.]+)?$/.test(m.version)) err('VERSION_INVALID', 'version must be semver', 'version');
  const pub = m.distribution && m.distribution.publisher;
  if (typeof pub !== 'string' || !/^sha256:[0-9a-fA-F]{64}$/.test(pub)) err('PUBLISHER_INVALID', 'publisher must be sha256:<64hex>', 'distribution.publisher');

  const allFiles = walk(abs);

  // 4. reference integrity
  const refs = collectRefs(m);
  for (const r of refs) {
    if (r.includes('..') || path.isAbsolute(r) || r.startsWith('http')) { err('UNSAFE_PATH', `unsafe reference: ${r}`, r); continue; }
    if (!allFiles.includes(r)) err('IMPL_FILE_MISSING', `referenced file missing: ${r}`, r);
  }

  // 5. undeclared executables
  const declared = new Set(refs);
  for (const f of allFiles) {
    if (EXEC_EXT.has(path.extname(f).toLowerCase()) && !declared.has(f)) {
      err('UNDECLARED_EXECUTABLE', `executable not declared in axp.json: ${f}`, f);
    }
  }

  // 6. abis
  const hasBinary = allFiles.some(f => ['.so', '.dex'].includes(path.extname(f).toLowerCase()));
  const abis = m.abis || [];
  if (hasBinary && abis.length === 0) err('ABI_MISSING', 'package contains .so/.dex but abis is empty', 'abis');
  if (!hasBinary && abis.length > 0) warn('WARN_ABI_EMPTY', 'abis declared but no binary artifacts found', 'abis');

  // 7. duplicate ids
  for (const [key, arr, field] of [
    ['tool', m.tools || [], 'id'], ['surface', m.surfaces || [], 'uri'],
    ['knowledge', m.knowledge || [], 'id'], ['agent', m.agents || [], 'id'],
  ]) {
    const s = new Set();
    for (const x of arr) {
      const v = x && x[field];
      if (!v) continue;
      if (s.has(v)) err('DUP_ID', `duplicate ${key} ${field}: ${v}`, `${key}s[].${field}`);
      s.add(v);
    }
  }

  // 8. capabilities
  const caps = m.capabilities || {};
  const ceiling = PRIV[caps.privilege] ?? 0;
  for (const r of caps.requests || []) {
    if (EXACT_REQUESTS.has(r)) continue;
    if (/^network\.egress:[^*]+$/.test(r)) continue;
    if (/^network\.egress:/.test(r)) { err('CAP_WILDCARD_EGRESS', 'wildcard host not allowed', 'capabilities.requests'); continue; }
    if (/^fs\.(read|write):(app|shared|external)$/.test(r)) continue;
    err('CAP_UNKNOWN_REQUEST', `unknown capability request: ${r}`, 'capabilities.requests');
  }
  for (const d of caps.dangerous || []) {
    if (!(caps.requests || []).includes(d)) err('DANGEROUS_NOT_REQUESTED', `dangerous item not requested: ${d}`, 'capabilities.dangerous');
  }
  for (const t of m.tools || []) {
    if (t.sideEffects === 'destructive' && t.confirm !== true) err('TOOL_CONFIRM_REQUIRED', 'destructive tool requires confirm:true', `tools[${t.id}]`);
    for (const k of Object.keys(t.gradient || {})) {
      if (PRIV[k] === undefined || PRIV[k] > ceiling) err('GRADIENT_EXCEEDS_PRIVILEGE', `gradient ${k} > privilege ${caps.privilege}`, `tools[${t.id}].gradient`);
    }
  }
  for (const a of m.agents || []) {
    if (a.privilege && PRIV[a.privilege] > ceiling) err('AGENT_EXCEEDS_PRIVILEGE', `agent privilege > ${caps.privilege}`, `agents[${a.id}]`);
  }

  // url egress
  for (const impl of allImpls(m)) {
    if (typeof impl.url === 'string') {
      let host = '';
      try { host = new URL(impl.url).host; } catch { host = ''; }
      if (host && !(caps.requests || []).includes(`network.egress:${host}`)) {
        err('NET_EGRESS_UNDECLARED', `impl.url host ${host} needs network.egress:${host}`, 'capabilities.requests');
      }
    }
  }

  // 9. UI references
  const ui = m.ui || {};
  const toolIds = new Set((m.tools || []).map(t => t.id));
  for (const a of ui.actions || []) {
    if (!toolIds.has(a.tool)) err('UI_ACTION_TOOL_MISSING', `action points to unknown tool: ${a.tool}`, `ui.actions[${a.id}]`);
  }
  const surfaceMap = new Map((m.surfaces || []).map(s => [s.uri, s]));
  let panelNodeIds = null;
  if (isObj(ui.panel) && ui.panel.kind === 'dsl') {
    const pf = path.join(abs, ui.panel.entry || '');
    if (fs.existsSync(pf)) {
      try {
        const pj = JSON.parse(fs.readFileSync(pf, 'utf8'));
        panelNodeIds = new Set((pj.nodes || []).map(n => n.id));
      } catch (e) { err('UI_BIND_TARGET_MISSING', `panel.json parse failed: ${e.message}`, 'ui.panel.entry'); }
    }
  }
  for (const b of ui.bind || []) {
    const s = surfaceMap.get(b.from);
    if (!s) err('SURFACE_UNDECLARED', `bind source not declared in surfaces: ${b.from}`, 'ui.bind[].from');
    else if (!s.watchable) err('SURFACE_NOT_WATCHABLE', `bind source is not watchable: ${b.from}`, 'ui.bind[].from');
    if (panelNodeIds) {
      const parts = String(b.to).split('.');
      const node = parts[2];
      if (!node || !panelNodeIds.has(node)) err('UI_BIND_TARGET_MISSING', `bind target node not found: ${b.to}`, 'ui.bind[].to');
    }
  }
  for (const e of m.events || []) {
    const s = surfaceMap.get(e.on);
    if (s && !s.watchable) err('SURFACE_NOT_WATCHABLE', `event source is not watchable: ${e.on}`, 'events[].on');
  }

  // 10. hot reload
  const hr = m.hotReload;
  if (isObj(hr) && hr.enabled) {
    if (hr.signature !== 'on-every-load') err('HOT_SIGNATURE_POLICY', 'hot reload requires signature:on-every-load', 'hotReload.signature');
    if ((hr.sources || []).includes('network-unsigned')) err('HOT_UNSIGNED_SOURCE', 'unsigned network source forbidden', 'hotReload.sources');
    if (hr.classloader !== 'isolated') err('HOT_CLASSLOADER', 'hot reload requires classloader:isolated', 'hotReload.classloader');
    if (!(hr.targets || []).length) err('HOT_NO_TARGETS', 'hotReload.targets must not be empty', 'hotReload.targets');
    const touchesUi = (hr.targets || []).some(t => t === 'ui' || t.startsWith('ui.'));
    if (touchesUi && (!isObj(ui.lifecycle) || !ui.lifecycle.onReload || !ui.lifecycle.onUnload)) {
      err('HOT_UI_LIFECYCLE', 'targets include ui.* → lifecycle.onReload and onUnload are required', 'ui.lifecycle');
    }
    const dyn = m.runtime && m.runtime.allowDynamicCode;
    if (dyn === false) info.push('allowDynamicCode:false does NOT block hot reload — signature/sources policy verified instead.');
  }

  const summary = {
    id: m.id, version: m.version, axp: m.axp,
    tools: (m.tools || []).length, surfaces: (m.surfaces || []).length,
    knowledge: (m.knowledge || []).length, agents: (m.agents || []).length,
    events: (m.events || []).length, ui: isObj(ui) && Object.keys(ui).length > 0,
    hotReload: !!(hr && hr.enabled), privilege: caps.privilege,
    refs: refs.length, files: allFiles.length,
  };
  return { ok: errors.length === 0, errors, warnings, info, summary };
}

/* ---------------- CLI ---------------- */

const isMain = (() => {
  // 用 realpath 对比：经 axp-validate 符号链接调用时 argv[1] 与模块真实路径不同
  const real = p => { try { return fs.realpathSync(p); } catch { return p; } };
  return process.argv[1] && real(path.resolve(process.argv[1])) === real(fileURLToPath(import.meta.url));
})();
if (isMain) {
  const args = process.argv.slice(2);
  const dir = args.find(a => !a.startsWith('--'));
  const json = args.includes('--json');
  const strict = args.includes('--strict');
  if (!dir) {
    console.error('usage: node validator/src/validate.mjs <plugin-dir> [--json] [--strict]');
    process.exit(2);
  }
  const r = validate(dir);
  if (json) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    if (r.summary) {
      console.log(`✔ axp.json parsed  (${r.summary.id}@${r.summary.version}, AXP ${r.summary.axp})`);
      console.log(`✔ schema OK`);
      console.log(`✔ references OK  (${r.summary.refs} refs / ${r.summary.files} files)`);
      console.log(`✔ capabilities OK  (privilege ${r.summary.privilege})`);
      console.log(`✔ ui OK  (${r.summary.ui ? 'present' : 'none'})`);
      console.log(`✔ hotReload OK  (${r.summary.hotReload ? 'enabled' : 'disabled'})`);
      console.log(`   components: tools=${r.summary.tools} surfaces=${r.summary.surfaces} knowledge=${r.summary.knowledge} agents=${r.summary.agents} events=${r.summary.events}`);
    }
    for (const i of r.info) console.log(`   info: ${i}`);
    for (const w of r.warnings) console.log(`   WARN ${w.code}: ${w.msg}${w.path ? ' @ ' + w.path : ''}`);
    for (const e of r.errors) console.error(`✖ ${e.code}: ${e.msg}${e.path ? ' @ ' + e.path : ''}`);
    if (r.ok) console.log('ALL CHECKS PASSED');
    else console.error(`FAILED — ${r.errors.length} error(s)`);
  }
  process.exit(r.ok && !(strict && r.warnings.length) ? 0 : 1);
}
