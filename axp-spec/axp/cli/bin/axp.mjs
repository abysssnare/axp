#!/usr/bin/env node
/** axp — AXP plugin tooling (spec/10 完整实现). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../../validator/src/validate.mjs';
import * as H from '../lib/host.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);
const opt = (n, def) => { const i = rest.indexOf(n); return i >= 0 && rest[i + 1] ? rest[i + 1] : def; };
const has = n => rest.includes(n);
const out = v => console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
const done = r => { out(r); if (r && r.ok === false) process.exitCode = 1; };
function fail(msg, code = 2) { console.error('axp: ' + msg); process.exit(code); }

function cmdNew(id, o) {
  if (!id || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(id)) fail('usage: axp new <reverse.domain.id> [-o <dir>]');
  const dir = path.resolve(o || path.join(process.cwd(), id.split('.').pop()));
  fs.mkdirSync(path.join(dir, 'tools'), { recursive: true });
  const m = { axp: '1.0', id, name: { en: id.split('.').pop(), zh: id.split('.').pop() },
    version: '1.0.0', minAndroid: 26, abis: [],
    tools: [{ id: 'demo.echo', description: 'Echo the input text',
      input: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      impl: { js: 'tools/hello.js' }, sideEffects: 'none', cost: 'fast' }],
    capabilities: { privilege: 'L0', requests: [] },
    distribution: { channel: 'session-install', publisher: 'sha256:' + '0'.repeat(64), signatureScheme: 'apk-v3' } };
  fs.writeFileSync(path.join(dir, 'axp.json'), JSON.stringify(m, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'tools/hello.js'), 'export function run(args) { return { text: args.text, at: Date.now() }; }\n');
  fs.writeFileSync(path.join(dir, 'README.md'), '# ' + id + '\n\nAXP v1.0 plugin. `axp validate .` / `axp install . --dev`\n');
  out('created ' + dir);
}
function cmdValidate(d) {
  if (!d) fail('usage: axp validate <plugin-dir>');
  const r = validate(d);
  for (const e of r.errors) console.error(`x ${e.code}: ${e.msg}${e.path ? ' @ ' + e.path : ''}`);
  if (!r.ok) { console.error(`FAILED - ${r.errors.length} error(s)`); process.exit(1); }
  out(`OK ${r.summary.id}@${r.summary.version} tools=${r.summary.tools} ui=${r.summary.ui}`);
}
function cmdPack(d, o) {
  if (!d) fail('usage: axp pack <plugin-dir> -o <file.axp>');
  const r = validate(d);
  if (!r.ok) { r.errors.forEach(e => console.error('x ' + e.code + ': ' + e.msg)); fail('pack aborted: validation failed', 1); }
  H.seal(d);
  out('packed ' + H.pack(d, o || (path.basename(path.resolve(d)) + '.axp')));
}
function cmdInspect(t) {
  if (!t) fail('usage: axp inspect <dir|file.axp>');
  let m;
  if (fs.existsSync(t) && fs.statSync(t).isDirectory()) m = JSON.parse(fs.readFileSync(path.join(t, 'axp.json'), 'utf8'));
  else {
    const p = H.unpack(t, path.join(process.env.TMPDIR || '/tmp', 'axp-inspect-' + Date.now()));
    if (!p.ok) fail(p.error, 1);
  }
  if (m) out(`AXP ${m.axp} ${m.id} ${m.version}\n  tools ${(m.tools||[]).length}  ui ${m.ui?'yes':'no'}  privilege ${m.capabilities.privilege}`);
}

switch (cmd) {
  case 'new': cmdNew(rest[0], opt('-o')); break;
  case 'validate': cmdValidate(rest[0]); break;
  case 'pack': cmdPack(rest[0], opt('-o')); break;
  case 'inspect': cmdInspect(rest[0]); break;
  case 'seal': done(H.seal(rest[0] || '.')); break;
  case 'publish': done(H.publish(rest[0], opt('--index', path.resolve(process.cwd(), 'index.json')))); break;
  case 'index': {
    const o = opt('-o', path.resolve(process.cwd(), 'index.json'));
    const dirs = rest.filter(x => x !== '-o' && x !== o && !x.startsWith('--'));
    done(H.buildIndex(dirs, o)); break;
  }
  case 'install': done(H.install(rest[0], { index: opt('--index'), dev: has('--dev'), force: has('--force') })); break;
  case 'uninstall': done(H.uninstall(rest[0])); break;
  case 'list': done(H.list()); break;
  case 'enable': done(H.setEnabled(rest[0], true)); break;
  case 'disable': done(H.setEnabled(rest[0], false)); break;
  case 'agent-tools': out(H.agentTools({ json: true })); break;
  case 'invoke': done(H.invoke(rest[0], rest[1], rest[2] ? JSON.parse(rest[2]) : {}, { confirm: has('--confirm') })); break;
  case 'ui': done(H.ui(rest[0])); break;
  case 'conformance': done((await import('../../tools/conformance.mjs')).run()); break;
  case undefined: case 'help': case '--help':
    out(`axp ${JSON.parse(fs.readFileSync(path.join(ROOT, 'cli/package.json'), 'utf8')).version}
usage:
  axp new <id> [-o dir]                  scaffold a plugin
  axp validate <dir>                     validate axp.json
  axp pack <dir> -o x.axp                seal(digest) + zip
  axp inspect <dir|file.axp>              print component summary
  axp seal <dir>                         write META-INF digest + dev signature
  axp publish <dir> --index index.json   pack + sha256 + index entry
  axp index <dir...> -o index.json       rebuild index
  axp install <dir|file.axp|id@range> [--index f] [--dev] [--force]
  axp uninstall <id> | list | enable <id> | disable <id>
  axp agent-tools [--json]               Agent visible tool set (spec/11)
  axp invoke <plugin> <tool> '<json>' [--confirm]
  axp ui <plugin>                        plugin panel + live bindings
  axp conformance                        C01-C26 conformance suite
`); break;
  default: fail('unknown command: ' + cmd);
}
