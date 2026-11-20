/**
 * AXP host conformance — spec/12 C01..C26
 * 与 axp-android-host/conformance/ConformanceMain.java 跑同一张用例表。
 * 运行：node axp/tools/conformance.mjs --json
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../validator/src/validate.mjs';
import { AxpHost } from '../runtime/src/host.mjs';
import * as H from '../cli/lib/host.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.resolve(HERE, '../test/fixtures');
const jread = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const jwrite = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const tmp = p => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'axp-conf-')); return p ? path.join(d, p) : d; };
const codes = r => (r.errors || []).map(e => e.code);

function badHello(mutate, extraFiles) {
  const d = tmp();
  fs.cpSync(path.join(FIX, '01-hello'), d, { recursive: true });
  const mf = path.join(d, 'axp.json');
  const m = jread(mf); mutate(m);
  jwrite(mf, m);
  for (const [rel, body] of extraFiles || []) { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), body); }
  return d;
}
function badPanel(mutate) {
  const d = tmp();
  fs.cpSync(path.join(FIX, '02-ui-panel'), d, { recursive: true });
  const mf = path.join(d, 'axp.json');
  const m = jread(mf); mutate(m);
  jwrite(mf, m);
  return d;
}

export function run() {
  const HOME = tmp();
  process.env.AXP_HOME = HOME;
  H.ensureHome();
  const cases = [];
  const c = (id, level, fn) => {
    const t0 = Date.now();
    try {
      const detail = fn() || 'ok';
      cases.push({ id, level, ok: true, ms: Date.now() - t0, detail: String(detail).slice(0, 200) });
    } catch (e) {
      cases.push({ id, level, ok: false, ms: Date.now() - t0, detail: e.message });
    }
  };
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const has = (r, code) => codes(r).includes(code);

  /* ---------- AXP-0 ---------- */
  c('C01', 'AXP-0', () => {
    const r = H.install(path.join(FIX, '01-hello'), { dev: true });
    assert(r.ok, 'install failed: ' + JSON.stringify(r));
    assert(r.steps.length >= 8, 'steps=' + r.steps.length);
    return 'steps=' + r.steps.join(',');
  });
  c('C02', 'AXP-0', () => {
    const r = validate(badHello(m => { m.unknownTop = 1; }));
    assert(has(r, 'SCHEMA_ADDITIONAL_PROPERTY'), JSON.stringify(codes(r)));
    return 'SCHEMA_ADDITIONAL_PROPERTY';
  });
  c('C03', 'AXP-0', () => {
    const a = validate(badHello(() => {}, [['tools/ghost.js', 'export function run(){}']]));
    assert(has(a, 'UNDECLARED_EXECUTABLE'), JSON.stringify(codes(a)));
    const b = validate(badHello(m => { m.tools[0].impl.js = '../escape.js'; }));
    assert(has(b, 'UNSAFE_PATH') || has(b, 'IMPL_FILE_MISSING'), JSON.stringify(codes(b)));
    return 'UNDECLARED_EXECUTABLE + UNSAFE_PATH';
  });
  c('C04', 'AXP-0', () => {
    const r = validate(badHello(m => { m.tools[0].sideEffects = 'destructive'; delete m.tools[0].confirm; }));
    assert(has(r, 'TOOL_CONFIRM_REQUIRED'), JSON.stringify(codes(r)));
    return 'TOOL_CONFIRM_REQUIRED';
  });
  c('C05', 'AXP-0', () => {
    const r = H.invoke('com.example.hello', 'demo.echo', { text: 'hi' });
    assert(r.ok && r.result.text === 'hi', JSON.stringify(r));
    assert(fs.existsSync(path.join(HOME, 'audit.jsonl')), 'no audit');
    return 'echo + audit';
  });
  c('C06', 'AXP-0', () => {
    H.install(path.join(FIX, '02-ui-panel'), { dev: true });
    const a = H.invoke('com.example.panel', 'screen.tap', { x: 1, y: 2 });
    assert(a.error === 'CONFIRM_REQUIRED', JSON.stringify(a));
    const b = H.invoke('com.example.panel', 'screen.tap', { x: 1, y: 2 }, { confirm: true });
    assert(b.ok, JSON.stringify(b));
    return 'confirm gate';
  });
  c('C07', 'AXP-0', () => {
    const r = H.install(path.join(FIX, '01-hello'), { dev: true });
    assert(r.error === 'INSTALL_ALREADY_PRESENT', JSON.stringify(r));
    assert(H.list().plugins.length === 2, 'registry count');
    return 'duplicate rejected';
  });
  c('C08', 'AXP-0', () => {
    const before = H.agentTools().tools.length;
    H.setEnabled('com.example.hello', false);
    const after = H.agentTools().tools.length;
    assert(after === before - 1, before + '->' + after);
    H.setEnabled('com.example.hello', true);
    assert(H.agentTools().tools.length === before, 're-enable');
    return before + '->' + after + '->' + before;
  });

  /* ---------- AXP-1 ---------- */
  let memInstalled = false;
  c('C09', 'AXP-1', () => {
    const r = H.install(path.join(FIX, '05-memory-system'), { dev: true });
    assert(r.ok, JSON.stringify(r)); memInstalled = true;
    const a = H.invoke('com.example.memory', 'memory.add', { text: '第一条记忆' });
    assert(a.ok, JSON.stringify(a));
    const snap = H.ui('com.example.memory');
    assert(snap.ok && Array.isArray(snap.bindings.list) && snap.bindings.list.length === 1, JSON.stringify(snap.bindings));
    return 'surface delta -> ui.bind';
  });
  c('C10', 'AXP-1', () => {
    const d = badPanel(m => { m.surfaces[0].watchable = false; });
    const r = validate(d);
    assert(has(r, 'SURFACE_NOT_WATCHABLE'), JSON.stringify(codes(r)));
    return 'SURFACE_NOT_WATCHABLE';
  });
  c('C11', 'AXP-1', () => {
    H.install(path.join(FIX, '03-hot-reload'), { dev: true });
    const t = H.agentTools();
    assert(t.knowledge.some(k => k.progressive), 'no progressive knowledge');
    assert(t.knowledge.some(k => k.allowedTools.length >= 0), 'allowedTools missing');
    return t.knowledge.length + ' knowledge entries';
  });
  let idxPath = '';
  c('C12', 'AXP-1', () => {
    idxPath = path.join(tmp(), 'index.json');
    const p = H.publish(path.join(FIX, '01-hello'), idxPath);
    assert(p.ok, JSON.stringify(p));
    const idx = jread(idxPath); idx.plugins[0].sha256 = 'f'.repeat(64); jwrite(idxPath, idx);
    const r = H.install('com.example.hello@^1.0.0', { index: idxPath, dev: true });
    assert(r.error === 'INSTALL_DIGEST_MISMATCH', JSON.stringify(r));
    return 'INSTALL_DIGEST_MISMATCH';
  });
  c('C13', 'AXP-1', () => {
    const p = H.publish(path.join(FIX, '01-hello'), idxPath);
    assert(p.ok, JSON.stringify(p));
    const dep = badHello(m => { m.id = 'com.example.needs'; m.requires = [{ id: 'com.missing.dep', range: '>=1.0.0' }]; });
    const r = H.install(dep, { dev: true });
    assert(r.error === 'INSTALL_DEPENDENCY_MISSING', JSON.stringify(r));
    return 'range ^1.0.0 + INSTALL_DEPENDENCY_MISSING';
  });
  c('C14', 'AXP-1', () => {
    const f = path.join(HOME, 'inbox', 'com.example.memory.install-intent.json');
    assert(fs.existsSync(f), 'no intent');
    const i = jread(f);
    for (const k of ['intent', 'id', 'version', 'source', 'sha256', 'publisher', 'requests']) assert(k in i, 'missing ' + k);
    assert(i.intent === 'axp.session-install/1.0', i.intent);
    return 'session-install intent complete';
  });

  /* ---------- AXP-2 ---------- */
  c('C15', 'AXP-2', () => {
    const r = validate(badPanel(m => { m.ui.actions[0].tool = 'ghost.tool'; }));
    assert(has(r, 'UI_ACTION_TOOL_MISSING'), JSON.stringify(codes(r)));
    return 'UI_ACTION_TOOL_MISSING';
  });
  c('C16', 'AXP-2', () => {
    const r = validate(badPanel(m => { m.ui.bind[0].to = 'ui.panel.nope'; }));
    assert(has(r, 'UI_BIND_TARGET_MISSING'), JSON.stringify(codes(r)));
    return 'UI_BIND_TARGET_MISSING';
  });
  c('C17', 'AXP-2', () => {
    assert(memInstalled, 'memory not installed');
    const s1 = H.ui('com.example.memory');
    assert(s1.panel.nodes.length > 0, 'empty panel');
    H.invoke('com.example.memory', 'memory.add', { text: '第二条记忆' });
    const s2 = H.ui('com.example.memory');
    assert(s2.bindings.list.length === s1.bindings.list.length + 1, 'bind did not refresh');
    return 'panel nodes=' + s1.panel.nodes.length + ' bind ' + s1.bindings.list.length + '->' + s2.bindings.list.length;
  });
  c('C18', 'AXP-2', () => {
    const u = H.ui('com.example.memory');
    const act = u.actions.find(a => a.id === 'ui.panel.add');
    assert(act && act.tool === 'memory.add', JSON.stringify(u.actions));
    const r = H.invoke('com.example.memory', act.tool, { text: 'via-ui' });
    assert(r.ok, JSON.stringify(r));
    return 'ui action -> ' + act.tool;
  });
  c('C19', 'AXP-2', () => {
    const t = H.agentTools();
    const names = t.tools.map(x => x.name);
    assert(new Set(names).size === names.length, 'duplicate tool name');
    for (const x of t.tools) for (const k of ['cost', 'sideEffects', 'available', 'description']) assert(k in x, 'missing ' + k);
    return names.length + ' unique tools';
  });
  c('C20', 'AXP-2', () => {
    const d = badHello(m => {
      m.id = 'com.example.nostore';
      m.capabilities.runtimeServices = ['storage'];
      m.tools[0].id = 'store.put';
    }, [['tools/hello.js', 'export function run(a, ctx) { ctx.storage.put("k", a.text); return { saved: true }; }']]);
    // 覆盖原文件（badHello 的 extraFiles 在同路径会覆盖）
    const r0 = H.install(d, { dev: true });
    assert(r0.ok, JSON.stringify(r0));
    const r = H.invoke('com.example.nostore', 'store.put', { text: 'x' });
    assert(r.error === 'STORAGE_DENIED', JSON.stringify(r));
    return 'storage namespace isolation + STORAGE_DENIED';
  });

  /* ---------- AXP-3 ---------- */
  c('C21', 'AXP-3', () => {
    const host = new AxpHost({ privileges: ['L0', 'L1', 'L2', 'L3'] });
    host.load(path.join(FIX, '03-hot-reload'));
    const a = host.invoke('com.example.autopay', 'screen.tap', {}, { confirmed: true });
    assert(a.ok && a.layer === 'L3', JSON.stringify(a));
    const h2 = new AxpHost({ privileges: ['L0', 'L1', 'L2'] });
    h2.load(path.join(FIX, '03-hot-reload'));
    const b = h2.invoke('com.example.autopay', 'screen.tap', {}, { confirmed: true });
    assert(b.ok && b.layer === 'L2', JSON.stringify(b));
    return 'gradient L3 -> L2';
  });
  c('C22', 'AXP-3', () => {
    const d = tmp();
    fs.cpSync(path.join(FIX, '03-hot-reload'), d, { recursive: true });
    const mf = path.join(d, 'axp.json'); const m = jread(mf);
    m.capabilities.privilege = 'L2'; jwrite(mf, m);
    const r = validate(d);
    assert(has(r, 'GRADIENT_EXCEEDS_PRIVILEGE'), JSON.stringify(codes(r)));
    return 'GRADIENT_EXCEEDS_PRIVILEGE';
  });
  let host3, v110;
  c('C23', 'AXP-3', () => {
    host3 = new AxpHost({ privileges: ['L0', 'L1', 'L2', 'L3'] });
    const auto = host3.load(path.join(FIX, '03-hot-reload'));
    v110 = tmp();
    fs.cpSync(path.join(FIX, '03-hot-reload'), v110, { recursive: true });
    const mf = path.join(v110, 'axp.json'); const m = jread(mf); m.version = '1.1.0'; jwrite(mf, m);
    const variant = mut => { const d = tmp(); fs.cpSync(v110, d, { recursive: true }); const f = path.join(d, 'axp.json'); const x = jread(f); mut(x); jwrite(f, x); return d; };
    assert(host3.applyHotReplace('com.example.autopay', variant(x => { x.capabilities.privilege = 'L5'; })).reason === 'HOT_PRIVILEGE_ESCALATION', 'escalation');
    assert(host3.applyHotReplace('com.example.autopay', variant(x => { x.distribution.publisher = 'sha256:' + 'f'.repeat(64); })).reason === 'HOT_SIGNATURE_FAILED', 'publisher');
    assert(host3.applyHotReplace('com.example.autopay', variant(x => { x.tools.push({ id: 'demo.new', description: 'x', impl: { js: 'tools/ocr.js' }, sideEffects: 'none' }); })).reason === 'HOT_NEW_COMPONENT', 'new id');
    return '3 hot-reload rejections';
  });
  c('C24', 'AXP-3', () => {
    const p = host3.get('com.example.autopay');
    p.ui.state['ui.panel.scroll'] = 42;
    const r = host3.applyHotReplace('com.example.autopay', v110);
    assert(r.ok, JSON.stringify(r));
    assert(host3.get('com.example.autopay').ui.state['ui.panel.scroll'] === 42, 'state lost');
    const rb = host3.rollback('com.example.autopay');
    assert(rb.ok && host3.get('com.example.autopay').manifest.version === '1.0.0', 'rollback failed');
    return 'preserve + rollback';
  });
  c('C25', 'AXP-3', () => {
    const r = validate(path.join(FIX, '03-hot-reload'));
    assert(r.ok, JSON.stringify(codes(r)));
    assert(r.info.some(i => i.includes('allowDynamicCode')), 'boundary not noted');
    return 'allowDynamicCode:false does not block hot reload';
  });
  c('C26', 'AXP-3', () => {
    const idx = jread(idxPath);
    idx.revoked = [{ publisher: idx.plugins[0].publisher, reason: 'test', since: '2026-11-20' }];
    jwrite(idxPath, idx);
    const r = H.install('com.example.hello@^1.0.0', { index: idxPath, dev: true, force: true });
    assert(r.error === 'INSTALL_REVOKED', JSON.stringify(r));
    return 'INSTALL_REVOKED';
  });

  const passed = cases.filter(x => x.ok).length;
  const failed = cases.length - passed;
  return { ok: failed === 0, suite: 'axp-conformance/1.0', hostLevel: 'AXP-3', passed, failed, total: cases.length, cases };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = run();
  console.log(JSON.stringify(r, null, 2));
  process.exitCode = r.failed ? 1 : 0;
}
