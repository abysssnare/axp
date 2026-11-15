#!/usr/bin/env node
/** axp — AXP plugin tooling. Docs: ../../docs/cli-reference.md */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validate } from '../../validator/src/validate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);
const opt = (name, def) => { const i = rest.indexOf(name); return i >= 0 && rest[i + 1] ? rest[i + 1] : def; };

function fail(msg, code = 2) { console.error('axp: ' + msg); process.exit(code); }

function cmdNew(id, out) {
  if (!id || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(id)) fail('usage: axp new <reverse.domain.id> [-o <dir>]');
  const dir = path.resolve(out || path.join(process.cwd(), id.split('.').pop()));
  fs.mkdirSync(path.join(dir, 'tools'), { recursive: true });
  const manifest = {
    axp: '1.0', id,
    name: { en: id.split('.').pop(), zh: id.split('.').pop() },
    version: '1.0.0', minAndroid: 26, abis: [],
    entry: { js: 'main.js', engine: 'quickjs' },
    tools: [{
      id: 'demo.echo', description: 'Echo the input text',
      input: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      output: { type: 'object' },
      impl: { js: 'tools/hello.js' },
      sideEffects: 'none', cost: 'fast',
    }],
    capabilities: { privilege: 'L0', requests: [] },
    instances: { multi: false },
    runtime: { memoryMB: 32, cpuPct: 5, allowDynamicCode: false },
    distribution: {
      channel: 'session-install',
      publisher: 'sha256:' + '0'.repeat(64),
      signatureScheme: 'apk-v3',
    },
  };
  fs.writeFileSync(path.join(dir, 'axp.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'main.js'), 'export function init() { return { ok: true }; }\n');
  fs.writeFileSync(path.join(dir, 'tools/hello.js'), 'export function run(args) { return { text: args.text, at: Date.now() }; }\n');
  fs.writeFileSync(path.join(dir, 'README.md'), `# ${id}\n\n> AXP v1.0 · privilege L0 · host AXP-0\n\n## 做什么\n最小示例插件：原样返回输入文本。\n\n## 组件\n| 类型 | id | 说明 |\n|---|---|---|\n| tool | \`demo.echo\` | echo |\n\n## 安装\n\`\`\`bash\naxp validate .\naxp pack . -o ${id.split('.').pop()}.axp\napksigner sign --v3 --ks release.jks ${id.split('.').pop()}.axp\n\`\`\`\n\n> 发布前把 \`distribution.publisher\` 换成真实证书指纹。\n`);
  console.log('created ' + dir);
}

function cmdValidate(dir) {
  if (!dir) fail('usage: axp validate <plugin-dir>');
  const r = validate(dir);
  for (const e of r.errors) console.error(`✖ ${e.code}: ${e.msg}${e.path ? ' @ ' + e.path : ''}`);
  for (const w of r.warnings) console.log(`  WARN ${w.code}: ${w.msg}`);
  if (!r.ok) { console.error(`FAILED — ${r.errors.length} error(s)`); process.exit(1); }
  const s = r.summary;
  console.log(`✔ ${s.id}@${s.version}  tools=${s.tools} surfaces=${s.surfaces} knowledge=${s.knowledge} agents=${s.agents} events=${s.events} ui=${s.ui} hotReload=${s.hotReload}`);
  console.log('ALL CHECKS PASSED');
}

const PY_ZIP = `import sys, os, zipfile
src, out = sys.argv[1], sys.argv[2]
skip = {'.DS_Store', '.git', 'node_modules'}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in skip]
        for f in sorted(files):
            if f in skip: continue
            full = os.path.join(root, f)
            z.write(full, os.path.relpath(full, src))
print(os.path.abspath(out))
`;

function cmdPack(dir, out) {
  if (!dir) fail('usage: axp pack <plugin-dir> -o <file.axp>');
  const r = validate(dir);
  if (!r.ok) {
    for (const e of r.errors) console.error(`✖ ${e.code}: ${e.msg}${e.path ? ' @ ' + e.path : ''}`);
    fail('pack aborted: validation failed', 1);
  }
  const target = path.resolve(out || (path.basename(path.resolve(dir)) + '.axp'));
  const p = spawnSync('python3', ['-c', PY_ZIP, path.resolve(dir), target], { encoding: 'utf8' });
  if (p.status !== 0) fail('zip failed: ' + (p.stderr || '').trim(), 1);
  console.log('packed ' + target + '  (unsigned — sign with apksigner --v3 before publishing)');
}

function cmdInspect(target) {
  if (!target) fail('usage: axp inspect <plugin-dir | file.axp>');
  let m;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    m = JSON.parse(fs.readFileSync(path.join(target, 'axp.json'), 'utf8'));
  } else {
    // zip: use python3 to read axp.json without executing anything
    const p = spawnSync('python3', ['-c',
      'import sys,zipfile;print(zipfile.ZipFile(sys.argv[1]).read("axp.json").decode())', target],
      { encoding: 'utf8' });
    if (p.status !== 0) fail('cannot read .axp: ' + (p.stderr || '').trim());
    m = JSON.parse(p.stdout);
  }
  console.log(`AXP ${m.axp}  ${m.id}  ${m.version}`);
  console.log(`  tools      ${(m.tools || []).length}   ${(m.tools || []).map(t => t.id).join(', ')}`);
  console.log(`  surfaces   ${(m.surfaces || []).length}   ${(m.surfaces || []).map(s => s.uri).join(', ')}`);
  console.log(`  knowledge  ${(m.knowledge || []).length}`);
  console.log(`  agents     ${(m.agents || []).length}`);
  console.log(`  events     ${(m.events || []).length}`);
  console.log(`  ui         ${m.ui ? 'yes' : 'no'}`);
  console.log(`  hotReload  ${m.hotReload && m.hotReload.enabled ? 'yes' : 'no'}`);
  console.log(`  privilege  ${m.capabilities.privilege}`);
}

switch (cmd) {
  case 'new': cmdNew(rest[0], opt('-o')); break;
  case 'validate': cmdValidate(rest[0]); break;
  case 'pack': cmdPack(rest[0], opt('-o')); break;
  case 'inspect': cmdInspect(rest[0]); break;
  case 'install': fail('install is performed by the Android host (session-install). See docs/integration-guide.md'); break;
  case undefined:
  case 'help':
  case '--help':
    console.log(`axp ${JSON.parse(fs.readFileSync(path.join(ROOT, 'cli/package.json'), 'utf8')).version}
usage:
  axp new <reverse.domain.id> [-o <dir>]   scaffold a plugin
  axp validate <dir>                       validate axp.json
  axp pack <dir> -o <file.axp>             validate + zip
  axp inspect <dir|file.axp>               print component summary
  axp install <file.axp>                   host-side (see integration guide)
`);
    break;
  default: fail(`unknown command: ${cmd}`);
}
