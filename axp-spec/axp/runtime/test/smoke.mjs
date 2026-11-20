#!/usr/bin/env node
/** 端到端冒烟：装载 → 调用 → Surface → UI → 热替换 → 回滚 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { AxpHost } from '../src/host.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const ex = p => path.join(REPO, 'test', 'fixtures', p);
let pass = 0;
const ok = (name, cond, extra) => { assert.ok(cond, `${name} ${extra ? JSON.stringify(extra) : ''}`); console.log(`  ✔ ${name}`); pass++; };

console.log('AXP reference runtime — smoke test\n');

/* 1. 装载三个示例 */
console.log('[1] load');
const host = new AxpHost({ privileges: ['L0', 'L1', 'L2', 'L3'] });
const hello = host.load(ex('01-hello'));
ok('01-hello loaded', hello.id === 'com.example.hello');
const panel = host.load(ex('02-ui-panel'));
ok('02-ui-panel loaded with UI', !!panel.ui.panel);
const auto = host.load(ex('03-hot-reload'));
ok('03-hot-reload loaded', host.summary().length === 3);
ok('9 steps recorded', host.audit.of('load-done').length === 3);

/* 2. 工具调用 + gradient */
console.log('[2] invoke / gradient');
const echo = host.invoke('com.example.hello', 'demo.echo', { text: 'hi' });
ok('demo.echo returns text', echo.result?.text === 'hi', echo);
const tap = host.invoke('com.example.autopay', 'screen.tap', { x: 10, y: 20 });
ok('destructive/device tool needs confirm', tap.error === 'CONFIRM_REQUIRED', tap);
const tap2 = host.invoke('com.example.autopay', 'screen.tap', { x: 10, y: 20 }, { confirmed: true });
ok('gradient picks L3 (highest available)', tap2.ok === true && tap2.layer === 'L3', tap2);
ok('L3 falls back from unsupported bin to js', tap2.result?.via === 'L3/shell-fallback', tap2.result);
const gradAudit = host.audit.of('gradient').find(a => a.tool === 'screen.tap');
ok('gradient selection audited', gradAudit && gradAudit.reason === 'gradient' && gradAudit.layer === 'L3', gradAudit);

const hostL2 = new AxpHost({ privileges: ['L0', 'L1', 'L2'] });
hostL2.load(ex('03-hot-reload'));
const tapL2 = hostL2.invoke('com.example.autopay', 'screen.tap', {}, { confirmed: true });
const gradL2 = hostL2.audit.of('gradient').find(a => a.tool === 'screen.tap');
ok('gradient degrades to L2 when L3 unavailable', gradL2?.layer === 'L2' && tapL2.ok === true, gradL2);

/* 3. Surface → ui.bind / events */
console.log('[3] surface / ui.bind / events');
const before = host.audit.of('ui-bind-update').length;
const pub = host.publish('axp://vision/screen', { type: 'delta', text: '转账 128.00' });
ok('surface delivered to subscribers', pub.delivered > 0, pub);
ok('ui.bind updated', host.audit.of('ui-bind-update').length > before);
ok('filter~ does not fire on unrelated text', host.audit.of('event-fire').length === 0);
const bp = host.publish('axp://vision/screen', { type: 'delta', text: 'immediate' });
ok('backpressure throttles high-frequency deltas', bp.throttled === true, bp);
await new Promise(r => setTimeout(r, 20));
host.publish('axp://vision/screen', { type: 'delta', text: '验证码 9527' });
const evts = host.audit.of('event-fire');
ok('event fired by filter~', evts.some(e => e.on === 'axp://vision/screen'), { count: evts.length });

/* 4. UI action → tool */
console.log('[4] ui.actions');
const a = host.action('com.example.autopay', 'ui.panel.ocr', { src: 'screen' });
ok('ui action reaches ledger.ocr', a.ok === true && a.toolId === 'ledger.ocr', a);
const bad = host.action('com.example.autopay', 'ui.panel.tap', {});
ok('ui action inherits confirm policy', bad.error === 'CONFIRM_REQUIRED', bad);

/* 5. 热加载：造一个 1.1.0 新版本 */
console.log('[5] hot reload');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'axp-v110-'));
fs.cpSync(ex('03-hot-reload'), tmp, { recursive: true });
const mf = path.join(tmp, 'axp.json');
const nm = JSON.parse(fs.readFileSync(mf, 'utf8'));
nm.version = '1.1.0';
fs.writeFileSync(mf, JSON.stringify(nm, null, 2));
const pf = path.join(tmp, 'ui/panel.json');
const pj = JSON.parse(fs.readFileSync(pf, 'utf8'));
pj.nodes.find(n => n.id === 'title').props.text = '最近识别结果 v1.1';
fs.writeFileSync(pf, JSON.stringify(pj, null, 2));

// 先手动置状态，验证 preserve
auto.ui.state['ui.panel.scroll'] = 42;
const hr = host.applyHotReplace('com.example.autopay', tmp);
ok('hot replace succeeded', hr.ok === true, { reason: hr.reason, phases: hr.phases?.map(p => p.phase) });
ok('version swapped to 1.1.0', host.get('com.example.autopay').manifest.version === '1.1.0');
ok('state.preserve kept scroll=42', host.get('com.example.autopay').ui.state['ui.panel.scroll'] === 42);
ok('phases order correct', ['VERIFYING', 'VERIFIED', 'STAGING', 'MIGRATE', 'SWAPPING', 'SWAPPED'].every(x => hr.phases.some(p => p.phase === x)));
ok('onReload fired', host.audit.of('ui-lifecycle').some(e => e.name === 'onReload' && e.ok));
ok('every replace verified', host.audit.of('hot-phase').some(e => e.phase === 'VERIFIED'));

/* 6. 拒绝越权 / 换证书 / 新增组件 */
console.log('[6] hot reload rejections');
function variant(mut) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'axp-bad-'));
  fs.cpSync(tmp, d, { recursive: true });
  const f = path.join(d, 'axp.json');
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  mut(m, d);
  fs.writeFileSync(f, JSON.stringify(m, null, 2));
  return d;
}
const esc = variant(m => { m.capabilities.privilege = 'L5'; });
const rEsc = host.applyHotReplace('com.example.autopay', esc);
ok('privilege escalation rejected', rEsc.reason === 'HOT_PRIVILEGE_ESCALATION', rEsc);
const cert = variant(m => { m.distribution.publisher = 'sha256:' + 'f'.repeat(64); });
const rCert = host.applyHotReplace('com.example.autopay', cert);
ok('publisher change rejected', rCert.reason === 'HOT_SIGNATURE_FAILED', rCert);
const newcomer = variant(m => { m.tools.push({ id: 'demo.new', description: 'x', impl: { js: 'tools/ocr.js' }, sideEffects: 'none' }); });
const rNew = host.applyHotReplace('com.example.autopay', newcomer);
ok('new component id rejected', rNew.reason === 'HOT_NEW_COMPONENT', rNew);

/* 7. 回滚 */
console.log('[7] rollback');
const rb = host.rollback('com.example.autopay');
ok('rollback succeeded', rb.ok === true, rb);
ok('version back to 1.0.0', host.get('com.example.autopay').manifest.version === '1.0.0');

/* 8. strict 签名模式 */
console.log('[8] strict signature');
const strictHost = new AxpHost({ signatureMode: 'strict' });
let strictRejected = false;
try { strictHost.load(ex('01-hello')); } catch (e) { strictRejected = e.code === 'CERT_MISSING'; }
ok('strict mode rejects missing cert', strictRejected);
const strictOk = new AxpHost({
  signatureMode: 'strict',
  bundleHint: { certFingerprint: 'sha256:' + '0'.repeat(64) },
});
ok('strict mode accepts matching cert', strictOk.load(ex('01-hello')).id === 'com.example.hello');

console.log(`\nALL ${pass} ASSERTIONS PASSED`);
