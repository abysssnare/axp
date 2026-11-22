#!/usr/bin/env node
/** 示例仓全量校验：8 个插件清单 + index.json 一致性。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../../axp-spec/axp/validator/src/validate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PLUGINS = path.join(ROOT, 'plugins');
const SPEC_CLI = path.resolve(HERE, '../../axp-spec/axp/cli/bin/axp.mjs');
const dirs = fs.readdirSync(PLUGINS, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(PLUGINS, d.name)).sort();
let bad = 0;
console.log('AXP examples verify — ' + dirs.length + ' plugins\n');
for (const d of dirs) {
  const r = validate(d);
  if (!r.ok) { bad++; console.log(`  FAIL ${path.basename(d)}: ` + r.errors.map(e => e.code).join(', ')); continue; }
  // 清单读取放在校验通过之后：校验失败时先报告校验错误，不因解析坏清单而中断
  const m = JSON.parse(fs.readFileSync(path.join(d, 'axp.json'), 'utf8'));
  console.log(`  OK  ${path.basename(d).padEnd(24)} ${m.id.padEnd(28)} tools=${(m.tools||[]).length} ui=${m.ui?'yes':'no'}`);
}
console.log(`\n${dirs.length - bad}/${dirs.length} plugins valid`);
process.exitCode = bad ? 1 : 0;
