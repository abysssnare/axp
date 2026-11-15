#!/usr/bin/env node
/**
 * AXP validator 行为固化测试（零外部依赖）。
 *   node validator/test/run-tests.mjs
 *   node validator/test/run-tests.mjs --json
 *
 * 31 条：4 个正面示例 + 25 个变异体 + 未声明可执行文件 / abis / allowDynamicCode 边界。
 * 每个变异体必须命中指定错误码；新增字段时 MUST 同步加用例（见 CONTRIBUTING.md）。
 * 标准引擎复核另见 schema-crosscheck.py（区分 schema 层与业务层）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../src/validate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const EX = path.join(REPO, 'examples');
const jsonMode = process.argv.includes('--json');

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`${ok ? '✔' : '✖'} ${name.padEnd(52)} ${detail || ''}`);
}
function withCopy(src, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axp-test-'));
  fs.cpSync(path.join(EX, src), dir, { recursive: true });
  const mf = path.join(dir, 'axp.json');
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const extra = fn(m, dir);
  fs.writeFileSync(mf, JSON.stringify(m, null, 2));
  const r = validate(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  return { r, extra };
}

/* ---------- 正面 ---------- */
for (const d of ['01-hello', '02-ui-panel', '03-hot-reload', '04-domains']) {
  const r = validate(path.join(EX, d));
  record(`positive: ${d}`, r.ok, r.ok
    ? `tools=${r.summary.tools} surfaces=${r.summary.surfaces} ui=${r.summary.ui} hot=${r.summary.hotReload}`
    : r.errors.map(e => e.code).join(','));
}

/* ---------- 负面：热加载 / 权限 / UI / 引用 / 身份 / schema ---------- */
const NEG = [
  ['HOT_SIGNATURE_POLICY', '热加载未设每次验签', m => { m.hotReload.signature = 'on-install'; }],
  ['HOT_UNSIGNED_SOURCE', '来源含未签名网络', m => { m.hotReload.sources = ['package', 'network-unsigned']; }],
  ['HOT_CLASSLOADER', '类加载器非隔离', m => { m.hotReload.classloader = 'shared'; }],
  ['HOT_NO_TARGETS', 'targets 为空', m => { m.hotReload.targets = []; }],
  ['HOT_UI_LIFECYCLE', '替换 ui.* 但缺生命周期', m => { delete m.ui.lifecycle.onReload; }],
  ['GRADIENT_EXCEEDS_PRIVILEGE', 'gradient 高于 privilege', m => { m.tools[1].gradient.L4 = { impl: { js: 'tools/ocr.js' } }; }],
  ['AGENT_EXCEEDS_PRIVILEGE', '子代理权限越界', m => { m.agents[0].privilege = 'L4'; }],
  ['UI_ACTION_TOOL_MISSING', 'UI 动作指向不存在的工具', m => { m.ui.actions[0].tool = 'nope.missing'; }],
  ['UI_BIND_TARGET_MISSING', '绑定节点不存在', m => { m.ui.bind[0].to = 'ui.panel.noSuchNode'; }],
  ['SURFACE_NOT_WATCHABLE', '绑定源不可订阅', m => { m.surfaces[0].watchable = false; }],
  ['TOOL_CONFIRM_REQUIRED', 'destructive 无确认', m => { m.tools[0].sideEffects = 'destructive'; delete m.tools[0].confirm; }],
  ['CAP_UNKNOWN_REQUEST', '词汇表外的权限', m => { m.capabilities.requests.push('magic.doEverything'); }],
  ['CAP_WILDCARD_EGRESS', '网络出口用通配符', m => { m.capabilities.requests.push('network.egress:*'); }],
  ['DANGEROUS_NOT_REQUESTED', 'dangerous 未申请', m => { m.capabilities.dangerous.push('root.su'); }],
  ['DUP_ID', '组件 id 重复', m => { m.tools.push({ ...m.tools[0] }); }],
  ['NET_EGRESS_UNDECLARED', 'url host 未声明', m => { m.tools[0].impl.url = 'https://evil.example.com/run'; }],
  ['PUBLISHER_INVALID', '指纹格式错误', m => { m.distribution.publisher = 'not-a-fingerprint'; }],
  ['VERSION_INVALID', '版本号非语义化', m => { m.version = 'one'; }],
  ['ID_INVALID', 'id 不是反向域名', m => { m.id = 'NotAReverseDomain'; }],
  ['UNSAFE_PATH', '路径穿越', m => { m.tools[0].impl.js = '../outside.js'; }],
  ['IMPL_FILE_MISSING', '实现体文件不存在', m => { m.tools[0].impl.js = 'tools/gone.js'; }],
  ['SCHEMA_ADDITIONAL_PROPERTY', '未知顶层字段', m => { m.surprise = true; }],
  ['SCHEMA_CONST', '格式版本不匹配', m => { m.axp = '2.0'; }],
  ['SCHEMA_ENUM', '权限层枚举越界', m => { m.capabilities.privilege = 'L9'; }],
];

for (const [expect, label, fn] of NEG) {
  const { r } = withCopy('03-hot-reload', fn);
  const hit = r.errors.some(e => e.code === expect);
  record(`negative: ${expect}`, hit,
    hit ? `caught (${r.errors.length} error(s)) ${label}`
        : `MISSED — got ${r.errors.map(e => e.code).join(',') || 'no errors'} (${label})`);
}

/* ---------- 未声明可执行文件 ---------- */
{
  const { r } = withCopy('01-hello', (m, dir) => {
    fs.writeFileSync(path.join(dir, 'evil.js'), 'export function run(){}');
  });
  const hit = r.errors.some(e => e.code === 'UNDECLARED_EXECUTABLE');
  record('negative: UNDECLARED_EXECUTABLE', hit, hit ? 'caught' : 'MISSED');
}

/* ---------- abis 一致性 ---------- */
{
  const { r } = withCopy('01-hello', (m, dir) => {
    fs.writeFileSync(path.join(dir, 'libfoo.so'), 'fake');
  });
  const hit = r.errors.some(e => e.code === 'ABI_MISSING');
  record('negative: ABI_MISSING', hit, hit ? 'caught' : 'MISSED');
}

/* ---------- allowDynamicCode 边界（必须是"不误杀"） ---------- */
{
  const r = validate(path.join(EX, '03-hot-reload'));
  const ok = r.ok && r.info.length > 0;
  record('boundary: allowDynamicCode=false 不误杀热加载', ok,
    ok ? r.info[0] : 'MISSED');
}

const passed = results.filter(r => r.ok).length;
const failed = results.length - passed;
if (jsonMode) {
  console.log(JSON.stringify({ total: results.length, passed, failed, results }, null, 2));
} else {
  console.log('─'.repeat(72));
  console.log(`${results.length} tests · ${passed} passed · ${failed} failed`);
  if (failed === 0) console.log(`ALL ${results.length} TESTS PASSED`);
}
process.exit(failed === 0 ? 0 : 1);
