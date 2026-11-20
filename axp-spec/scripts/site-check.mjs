#!/usr/bin/env node
/** 规范仓构建/发布前数据自检（零依赖，Node 18+）。原站点 standalone 检查已随拆仓移除。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const AXP = path.join(ROOT, 'axp');
const errors = [], ok = [];
const need = (p, label) => fs.existsSync(p) ? ok.push(label) : errors.push(label + ' -> ' + p);
const DATA_FILES = [
  'spec/01-format.md','spec/02-manifest.schema.json','spec/03-impl-reference.md','spec/04-capabilities.md',
  'spec/05-domains.md','spec/06-ui-vocab.md','spec/07-expression-map.md','spec/08-hot-reload.md','spec/09-versioning.md',
  'spec/10-distribution-index.md','spec/10-index.schema.json','spec/11-plugin-management-agent.md','spec/12-host-conformance.md',
  'spec/13-glossary-conventions.md','spec/14-manifest-reference.md','spec/15-ui-dsl.md','spec/15-panel.schema.json',
  'spec/16-host-context.md','spec/16-registry.schema.json','spec/16-install-intent.schema.json',
  'spec/17-domains-reference.md','spec/18-security-model.md','spec/19-error-codes.md','spec/20-compatibility-governance.md',
  'validator/src/validate.mjs','validator/test/run-tests.mjs','validator/test/schema-crosscheck.py',
  'cli/bin/axp.mjs','cli/lib/host.mjs','runtime/test/smoke.mjs','tools/conformance.mjs','tools/spec-lint.mjs',
  'docs/cookbook-no-ui.md','docs/cookbook-android-host.md','docs/cli-reference.md',
  'README.md','CHANGELOG.md','CONTRIBUTING.md',
];
for (const f of DATA_FILES) need(path.join(AXP, f), 'axp/' + f);
const FX = path.join(AXP, 'test', 'fixtures');
let n = 0;
for (const d of fs.readdirSync(FX, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  n++;
  const mf = path.join(FX, d.name, 'axp.json');
  if (!fs.existsSync(mf)) { errors.push('fixture ' + d.name + ' lacks axp.json'); continue; }
  try { const m = JSON.parse(fs.readFileSync(mf, 'utf8')); if (m.axp !== '1.0' || !m.id) errors.push('fixture ' + d.name + ' invalid'); else ok.push('fixture ' + d.name); }
  catch (e) { errors.push('fixture ' + d.name + ': ' + e.message); }
}
if (n < 5) errors.push('fixture count should be >= 5, got ' + n);
try { const mod = await import(path.join(AXP, 'validator/src/validate.mjs')); if (typeof mod.validate === 'function') ok.push('validator.validate importable'); else errors.push('validator export missing'); }
catch (e) { errors.push('validator import: ' + e.message); }
try { const mod = await import(path.join(AXP, 'cli/lib/host.mjs')); if (typeof mod.install === 'function' && typeof mod.invoke === 'function') ok.push('cli host exports'); else errors.push('cli host exports missing'); }
catch (e) { errors.push('cli host import: ' + e.message); }
console.log(`[prebuild] 规范仓数据完整性：${ok.length} 项通过，${errors.length} 项失败`);
errors.forEach(e => console.error('  x ' + e));
console.log(errors.length ? 'PREBUILD CHECK FAILED' : 'PREBUILD CHECK PASSED');
process.exit(errors.length ? 1 : 0);
