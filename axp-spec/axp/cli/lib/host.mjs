/**
 * AXP 宿主核心（CLI 侧）—— spec/10 §3 的真实实现。
 * 与 Android 宿主 conformance/ 下的 Java core 共用同一套注册表与用例表。
 * 零依赖：只用 Node 内置模块 + 本仓 validator。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { validate } from '../../validator/src/validate.mjs';

export const PRIVS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const jread = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const jwrite = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };
const exists = p => fs.existsSync(p);

export function home() { return path.resolve(process.env.AXP_HOME || path.join(process.cwd(), '.axp-host')); }
export function ensureHome() {
  const h = home();
  for (const d of ['plugins', 'storage', 'surfaces', 'inbox', 'dist']) fs.mkdirSync(path.join(h, d), { recursive: true });
  if (!exists(path.join(h, 'registry.json'))) jwrite(path.join(h, 'registry.json'), { axpRegistry: '1.0', hostLevel: 'AXP-3', plugins: [] });
  return h;
}
export function registry() { ensureHome(); return jread(path.join(home(), 'registry.json')); }
export function saveRegistry(r) { jwrite(path.join(home(), 'registry.json'), r); }
export function entry(id) { return registry().plugins.find(p => p.id === id); }

/** 规范化摘要：除 META-INF/AXP-* 签名块外全部文件，按路径排序 */
export function digestDir(dir) {
  const files = [];
  (function walk(d, base) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name), rel = path.relative(base, f).split(path.sep).join('/');
      if (e.isDirectory()) walk(f, base);
      else if (!rel.startsWith('META-INF/AXP-')) files.push(rel);
    }
  })(dir, dir);
  files.sort();
  const h = crypto.createHash('sha256');
  for (const f of files) { h.update(f + '\n'); h.update(sha(fs.readFileSync(path.join(dir, f))) + '\n'); }
  return h.digest('hex');
}

const PY_ZIP = `import sys,os,zipfile
src,out=sys.argv[1],sys.argv[2]
skip={'.DS_Store','.git','node_modules'}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
  for root,dirs,files in os.walk(src):
    dirs[:]=[d for d in dirs if d not in skip]
    for f in sorted(files):
      if f in skip: continue
      full=os.path.join(root,f); z.write(full,os.path.relpath(full,src))
print(os.path.abspath(out))
`;
export function pack(dir, out) {
  const p = spawnSync('python3', ['-c', PY_ZIP, path.resolve(dir), path.resolve(out)], { encoding: 'utf8' });
  if (p.status !== 0) throw new Error('PACK_FAILED: ' + (p.stderr || '').trim());
  return path.resolve(out);
}
const PY_UNZIP = `import sys,os,zipfile
src,dst=sys.argv[1],sys.argv[2]
with zipfile.ZipFile(src) as z:
  for n in z.namelist():
    if n.startswith('/') or '..' in n.split('/'): print('UNSAFE:'+n); sys.exit(3)
  z.extractall(dst)
print('OK')
`;
export function unpack(file, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const p = spawnSync('python3', ['-c', PY_UNZIP, path.resolve(file), path.resolve(dest)], { encoding: 'utf8' });
  if (p.status === 3) return { error: 'INSTALL_UNSAFE_ENTRY', detail: (p.stdout || '').trim() };
  if (p.status !== 0) return { error: 'INSTALL_UNPACK_FAILED', detail: (p.stderr || '').trim() };
  return { ok: true };
}

export function semver(v) { const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v); return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0]; }
export function satisfies(v, range) {
  if (!range || range === '*') return true;
  const a = semver(v);
  for (const part of range.trim().split(/\s+/)) {
    const m = /^(\^|~|>=|<=|>|<|=)?(\d+)\.(\d+)\.(\d+)/.exec(part);
    if (!m) continue;
    const op = m[1] || '=', b = [+m[2], +m[3], +m[4]];
    const cmp = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    const c = cmp(a, b);
    if (op === '^' && !(c >= 0 && cmp(a, [b[0] + 1, 0, 0]) < 0)) return false;
    else if (op === '~' && !(c >= 0 && cmp(a, [b[0], b[1] + 1, 0]) < 0)) return false;
    else if (op === '>=' && !(c >= 0)) return false;
    else if (op === '<=' && !(c <= 0)) return false;
    else if (op === '>' && !(c > 0)) return false;
    else if (op === '<' && !(c < 0)) return false;
    else if (op === '=' && c !== 0) return false;
  }
  return true;
}

function fail(code, detail) { return { ok: false, error: code, detail }; }
function ok(v) { return { ok: true, ...v }; }

/** spec/10 §3：十步安装 */
export function install(target, opts = {}) {
  let tmp = null;
  try {
    const r = installSteps(target, opts, t => { tmp = t; });
    return r;
  } finally {
    // 解包临时目录无论成败都在用完后清理（Minor：避免 /tmp 残留）
    if (tmp) { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* 已尽力 */ } }
  }
}

function installSteps(target, opts, rememberTmp) {
  const h = ensureHome();
  const steps = [];
  const step = s => steps.push(s);
  let srcDir = null, idxItem = null;

  // 1 解析目标
  if (target.includes('@') && opts.index) {
    const [id, range] = target.split('@', 2);
    const idx = jread(path.resolve(opts.index));
    const cand = idx.plugins.filter(p => p.id === id && satisfies(p.version, range)).sort((x, y) => semver(y.version).join('.').localeCompare(semver(x.version).join('.')));
    if (!cand.length) return fail('INSTALL_NOT_FOUND', target);
    idxItem = cand[0];
    target = path.resolve(path.dirname(opts.index), idxItem.source);
    if (!exists(target)) return fail('INSTALL_SOURCE_MISSING', target);
    step('resolve-index');
  }
  if (exists(target) && fs.statSync(target).isDirectory()) { srcDir = path.resolve(target); step('resolve-dir'); }
  else if (exists(target) && target.endsWith('.axp')) {
    const t = fs.mkdtempSync(path.join(os.tmpdir(), 'axp-install-'));
    rememberTmp(t);
    const u = unpack(target, t);
    if (!u.ok) return u;
    srcDir = t; step('resolve-axp');
  } else return fail('INSTALL_SOURCE_MISSING', target);

  // 2 解包防护
  const sigFile = path.join(srcDir, 'META-INF/AXP-SIG.json');
  if (exists(sigFile)) {
    const sig = jread(sigFile);
    if (sig.digest !== digestDir(srcDir)) return fail('INSTALL_DIGEST_MISMATCH', sig.digest);
    step('verify-digest');
  } else step('digest-absent-dev');

  // 3 校验（与 CI 同一个校验器）
  const r = validate(srcDir);
  if (!r.ok) return { ok: false, error: r.errors[0].code, detail: r.errors.map(e => e.code + ': ' + e.msg), steps };
  const m = jread(path.join(srcDir, 'axp.json'));
  step('validate');

  // 4 验签（spec/18 §2：生产路径 fail-closed）
  if (exists(sigFile)) {
    const sig = jread(sigFile);
    if (sig.publisher !== m.distribution.publisher) return fail('INSTALL_PUBLISHER_MISMATCH', sig.publisher);
    if (sig.signatureScheme !== 'apk-v3') return fail('INSTALL_SIGNATURE_FAILED', sig.signatureScheme);
    if (opts.dev) {
      step('verify-signature-dev');
    } else {
      // 生产模式：本参考 CLI 未接入 apksig 公钥验签，不能把「signature 非空」
      // 当作发布者身份证明 —— seal() 产出的 dev: 标记、自声明 certChain 一律拒绝，
      // 由接入 apksig 的生产宿主或显式 --dev 承担开发安装。
      const s = typeof sig.signature === 'string' ? sig.signature : '';
      const hasChain = Array.isArray(sig.certChain) && sig.certChain.length > 0;
      const detail = s.startsWith('dev:') ? 'dev signature requires --dev'
        : (!s || !hasChain) ? 'missing signature / certChain'
        : 'reference CLI host cannot verify apk-v3 signatures; use a production host with apksig or --dev for dev-signed packages';
      return fail('INSTALL_SIGNATURE_FAILED', detail);
    }
  } else if (!opts.dev) {
    // 开发/示例包允许无签名块，但必须显式 --dev；生产宿主 MUST 拒绝
    return fail('INSTALL_SIGNATURE_FAILED', 'AXP-SIG.json missing (use --dev for examples)');
  } else step('verify-signature-dev');

  // 5 索引一致性
  if (idxItem) {
    if (idxItem.sha256 !== sha(fs.readFileSync(target))) return fail('INSTALL_DIGEST_MISMATCH', idxItem.sha256);
    if (idxItem.publisher !== m.distribution.publisher) return fail('INSTALL_PUBLISHER_MISMATCH', idxItem.publisher);
    step('verify-index');
  }
  if (opts.index) {
    const idx = jread(path.resolve(opts.index));
    if ((idx.revoked || []).some(x => x.publisher === m.distribution.publisher)) return fail('INSTALL_REVOKED', m.distribution.publisher);
  }

  // 6 权限确认清单（宿主侧逐项确认）
  const confirmList = [...new Set([...(m.capabilities.dangerous || []), ...(m.capabilities.requests || []).filter(x => /^(accessibility|shizuku|root|system)/.test(x))])];
  step('confirm-list');

  // 7 依赖闭包
  for (const dep of m.requires || []) {
    const e = entry(dep.id);
    if (!e || !e.enabled || !satisfies(e.version, dep.range)) return fail('INSTALL_DEPENDENCY_MISSING', dep.id + '@' + dep.range);
  }
  step('resolve-deps');

  // 8 写注册表（先完整暂存，再原子切换：更新失败时旧版本保持可用 —— spec/10 §3）
  if (entry(m.id) && !opts.force) return fail('INSTALL_ALREADY_PRESENT', m.id);
  const dest = path.join(h, 'plugins', m.id);
  const staging = path.join(h, 'plugins', '.' + m.id + '.staging-' + Date.now());
  let backup = null;
  try {
    fs.mkdirSync(staging, { recursive: true });
    fs.cpSync(srcDir, staging, { recursive: true });
    // 暂存副本完整性自检：清单可读、摘要一致
    JSON.parse(fs.readFileSync(path.join(staging, 'axp.json'), 'utf8'));
    if (exists(sigFile) && jread(sigFile).digest !== digestDir(staging)) return fail('INSTALL_DIGEST_MISMATCH', 'staged copy');
    const rec = {
      id: m.id, version: m.version, path: path.relative(h, dest).split(path.sep).join('/'),
      publisher: m.distribution.publisher, sha256: sha(fs.readFileSync(path.join(staging, 'axp.json'))),
      enabled: true, installedAt: new Date().toISOString(),
      privilege: m.capabilities.privilege, requests: m.capabilities.requests || [],
      ui: !!m.ui && Object.keys(m.ui).length > 0,
      tools: (m.tools || []).map(t => t.id),
    };

    // 9 宿主投递（intent 先落盘，注册表发布是提交点；失败时活动版本不动）
    jwrite(path.join(h, 'inbox', m.id + '.install-intent.json'), {
      intent: 'axp.session-install/1.0', id: m.id, version: m.version,
      source: dest, sha256: rec.sha256, publisher: rec.publisher,
      requestedPrivilege: rec.privilege, requests: rec.requests, createdAt: rec.installedAt,
    });

    if (exists(dest)) { backup = dest + '.old-' + Date.now(); fs.renameSync(dest, backup); }
    try { fs.renameSync(staging, dest); }
    catch (e) {
      // 切换失败：恢复旧代，活动版本不受影响
      if (backup && !exists(dest)) { try { fs.renameSync(backup, dest); backup = null; } catch { /* 保住备份目录 */ } }
      throw e;
    }
    const reg = registry();
    reg.plugins = reg.plugins.filter(p => p.id !== m.id).concat(rec);
    saveRegistry(reg);
    step('write-registry');
    step('session-install-intent');
    if (backup) { try { fs.rmSync(backup, { recursive: true, force: true }); } catch { /* 旧代清理失败不影响安装结果 */ } }

    // 10 输出
    return ok({ id: m.id, version: m.version, path: dest, privilege: rec.privilege,
                tools: rec.tools, ui: rec.ui, confirmList, steps });
  } catch (e) {
    // 暂存/切换失败：清理暂存目录，旧版本原样保留
    try { if (!exists(dest)) fs.rmSync(staging, { recursive: true, force: true }); } catch { /* 已尽力 */ }
    return fail('IO_FAILED', e.message);
  }
}

export function uninstall(id) {
  const reg = registry();
  if (!reg.plugins.find(p => p.id === id)) return fail('INSTALL_NOT_FOUND', id);
  const dest = path.join(home(), 'plugins', id);
  if (exists(dest)) fs.rmSync(dest, { recursive: true, force: true });
  reg.plugins = reg.plugins.filter(p => p.id !== id); saveRegistry(reg);
  return ok({ id });
}
export function list() { return registry(); }
export function setEnabled(id, enabled) {
  const reg = registry(); const p = reg.plugins.find(x => x.id === id);
  if (!p) return fail('INSTALL_NOT_FOUND', id);
  p.enabled = enabled; saveRegistry(reg); return ok({ id, enabled });
}

/** spec/10 §2：发布/重建索引 */
export function publish(dir, indexFile) {
  const m = jread(path.join(path.resolve(dir), 'axp.json'));
  const idxPath = path.resolve(indexFile);
  const idx = exists(idxPath) ? jread(idxPath) : { axpIndex: '1.0', publisher: m.distribution.publisher, updated: '', plugins: [] };
  const dist = path.join(path.dirname(idxPath), 'dist');
  fs.mkdirSync(dist, { recursive: true });
  const out = path.join(dist, m.id + '-' + m.version + '.axp');
  pack(dir, out);
  const item = {
    id: m.id, version: m.version, name: m.name, description: m.description || '',
    channel: m.distribution.channel, publisher: m.distribution.publisher,
    sha256: sha(fs.readFileSync(out)), source: path.relative(path.dirname(idxPath), out).split(path.sep).join('/'),
    signatureScheme: m.distribution.signatureScheme, minHost: m.minHost || '0.1.0',
    minAndroid: m.minAndroid, abis: m.abis || [], requires: m.requires || [],
    capabilities: { privilege: m.capabilities.privilege, requests: m.capabilities.requests || [] },
    ui: !!m.ui, tools: (m.tools || []).map(t => t.id),
  };
  idx.plugins = idx.plugins.filter(p => !(p.id === item.id && p.version === item.version)).concat(item);
  idx.updated = new Date().toISOString();
  jwrite(idxPath, idx);
  return ok({ item, index: idxPath, package: out });
}
export function buildIndex(dirs, indexFile) {
  for (const d of dirs) { const r = publish(d, indexFile); if (!r.ok) return r; }
  return ok({ index: path.resolve(indexFile), count: jread(path.resolve(indexFile)).plugins.length });
}

/** spec/11 §3：Agent 可见工具集 */
export function agentTools(opts = {}) {
  const out = { tools: [], knowledge: [] };
  for (const p of registry().plugins.filter(x => x.enabled)) {
    const m = jread(path.join(home(), p.path, 'axp.json'));
    for (const t of m.tools || []) {
      out.tools.push({
        name: p.id + '.' + t.id, plugin: p.id, id: t.id,
        description: t.description, input: t.input || { type: 'object' },
        cost: t.cost || 'fast', sideEffects: t.sideEffects,
        confirm: !!(t.confirm || t.sideEffects === 'destructive'),
        privilege: p.privilege, available: !!(t.impl || t.gradient),
      });
    }
    for (const k of m.knowledge || []) {
      out.knowledge.push({ plugin: p.id, id: k.id, kind: k.kind,
        progressive: !!k.progressive, allowedTools: k.allowedTools || [] });
    }
  }
  if (opts.json) return out;
  return out;
}

function makeCtx(p, m, opts) {
  const h = home();
  const sf = path.join(h, 'storage', p.id + '.json');
  const surfDir = path.join(h, 'surfaces', p.id);
  const req = m.capabilities.requests || [];
  const canWrite = req.some(x => /^fs\.write:/.test(x));
  const canRead = req.some(x => /^fs\.read:/.test(x));
  const store = () => exists(sf) ? jread(sf) : {};
  const declared = new Set((m.surfaces || []).map(s => s.uri));
  const audit = e => fs.appendFileSync(path.join(h, 'audit.jsonl'), JSON.stringify({ at: Date.now(), plugin: p.id, ...e }) + '\n');
  return {
    storage: {
      get: k => { if (!canRead) throw new Error('STORAGE_DENIED'); return store()[k] ?? null; },
      put: (k, v) => { if (!canWrite) throw new Error('STORAGE_DENIED'); const s = store(); s[k] = v; jwrite(sf, s); return true; },
      list: () => { if (!canRead) throw new Error('STORAGE_DENIED'); return Object.entries(store()); },
      remove: k => { if (!canWrite) throw new Error('STORAGE_DENIED'); const s = store(); delete s[k]; jwrite(sf, s); return true; },
    },
    surface: {
      publish: (uri, delta) => {
        if (!declared.has(uri)) throw new Error('SURFACE_UNDECLARED:' + uri);
        fs.mkdirSync(surfDir, { recursive: true });
        const f = path.join(surfDir, encodeURIComponent(uri) + '.json');
        jwrite(f, { uri, value: delta, at: Date.now() });
        return true;
      },
      read: uri => { const f = path.join(h, 'surfaces', p.id, encodeURIComponent(uri) + '.json'); return exists(f) ? jread(f).value : null; },
    },
    audit: { log: audit },
    ui: { push: (node, value) => { audit({ kind: 'ui.push', node, value }); return true; } },
    agent: { request: prompt => ({ prompt, model: 'host-default' }) },
    elicit: schema => ({ schema, confirmed: !!opts.confirm }),
    confirm: !!opts.confirm,
  };
}

/**
 * 在 vm 沙箱里执行 impl.js —— 边界模型（spec/18 §3）：
 * 1. 沙箱只含 VM 原生全局，不注入任何宿主 realm 的对象 / 构造器；
 * 2. 宿主能力（storage/surface/audit/ui/agent/elicit）经「序列化消息桥」进出：
 *    宿主函数只存在于 VM 闭包内，跨 realm 数据一律 JSON 字符串往返；
 * 3. 工具调用本身在 vm.runInContext 的 timeout 之内，非返回型实现不会挂起宿主。
 * 注意：node:vm 不是权限边界（Node 官方立场），生产宿主应使用独立进程 / isolate。
 */
function hostDispatch(ctx) {
  return (op, arr) => {
    switch (op) {
      case 'storage.get': return ctx.storage.get(arr[0]);
      case 'storage.put': return ctx.storage.put(arr[0], arr[1]);
      case 'storage.list': return ctx.storage.list();
      case 'storage.remove': return ctx.storage.remove(arr[0]);
      case 'surface.publish': return ctx.surface.publish(arr[0], arr[1]);
      case 'surface.read': return ctx.surface.read(arr[0]);
      case 'audit.log': return ctx.audit.log(arr[0]);
      case 'ui.push': return ctx.ui.push(arr[0], arr[1]);
      case 'agent.request': return ctx.agent.request(arr[0]);
      case 'elicit': return ctx.elicit(arr[0]);
      default: throw new Error('CTX_OP_UNKNOWN: ' + op);
    }
  };
}

const BRIDGE_SRC = `
globalThis.__axpInstall = function (hd, confirmFlag) {
  function call(op, arg) {
    var resp = hd(op, JSON.stringify(arg));
    if (!resp || resp.ok !== true) {
      var msg = (resp && resp.err) ? String(resp.err) : 'IMPL_ERROR';
      var e = new Error(msg); e.code = msg; throw e;
    }
    return resp.json === undefined ? undefined : JSON.parse(resp.json);
  }
  globalThis.__axpCtx = {
    storage: {
      get: function (k) { return call('storage.get', [k]); },
      put: function (k, v) { return call('storage.put', [k, v]); },
      list: function () { return call('storage.list', []); },
      remove: function (k) { return call('storage.remove', [k]); },
    },
    surface: {
      publish: function (u, d) { return call('surface.publish', [u, d]); },
      read: function (u) { return call('surface.read', [u]); },
    },
    audit: { log: function (e) { return call('audit.log', [e]); } },
    ui: { push: function (n, v) { return call('ui.push', [n, v]); } },
    agent: { request: function (p) { return call('agent.request', [p]); } },
    elicit: function (s) { return call('elicit', [s]); },
    confirm: confirmFlag === true,
  };
};
globalThis.__axpCall = function () {
  var args = JSON.parse(globalThis.__axpArgsJson);
  var r = globalThis.__axpRun(args, globalThis.__axpCtx);
  return JSON.stringify({ ok: true, result: r === undefined ? null : r });
};
`;

/** 在 vm 沙箱里执行 impl.js；只允许 run(args, ctx) */
export function runJs(file, args, ctx) {
  let code = fs.readFileSync(file, 'utf8').replace(/^\s*export\s+/gm, '');
  const sandbox = Object.create(null);
  const context = vm.createContext(sandbox);
  // 1) 插件源码在 VM realm 定义 run（定义阶段即受 timeout 约束）
  const hasRun = vm.runInContext('(function(){' + code + '\n;if (typeof run === "function") globalThis.__axpRun = run; return typeof run === "function";})()', context, { timeout: 2000, filename: file });
  if (!hasRun) return { ok: false, error: 'IMPL_NO_RUN', detail: file };
  // 2) 安装序列化能力桥：宿主函数仅存于 VM 闭包
  vm.runInContext(BRIDGE_SRC, context, { timeout: 200 });
  const dispatch = hostDispatch(ctx);
  sandbox.__axpInstall((op, argsJson) => {
    try {
      const v = dispatch(op, JSON.parse(argsJson));
      return { ok: true, json: JSON.stringify(v === undefined ? null : v) };
    } catch (e) { return { ok: false, err: String(e && e.message || e) }; }
  }, ctx.confirm);
  // 3) 调用阶段同样在 timeout 内：非返回型工具被终止而非挂起
  sandbox.__axpArgsJson = JSON.stringify(args === undefined ? {} : args);
  try {
    const out = vm.runInContext('__axpCall()', context, { timeout: 2000 });
    const parsed = JSON.parse(out);
    return { ok: true, result: parsed.result };
  } catch (e) {
    const msg = String(e && e.message || e);
    return { ok: false, error: /STORAGE_DENIED|SURFACE_UNDECLARED/.test(msg) ? msg : 'IMPL_ERROR', detail: msg };
  }
}

/** spec/11 §3-§5：调用一个工具 */
export function invoke(pluginId, toolId, args = {}, opts = {}) {
  const p = entry(pluginId);
  if (!p) return fail('TOOL_NOT_FOUND', pluginId);
  if (!p.enabled) return fail('PLUGIN_DISABLED', pluginId);
  const dir = path.join(home(), p.path);
  const m = jread(path.join(dir, 'axp.json'));
  const t = (m.tools || []).find(x => x.id === toolId);
  if (!t) return fail('TOOL_NOT_FOUND', toolId);
  if ((t.confirm || t.sideEffects === 'destructive') && !opts.confirm) return fail('CONFIRM_REQUIRED', toolId);

  // gradient：选当前可用最高层（CLI 宿主默认授予到插件声明上限）
  let impl = t.impl, layer = null;
  const ceiling = PRIVS.indexOf(m.capabilities.privilege);
  if (t.gradient) {
    for (let i = ceiling; i >= 0; i--) {
      const g = t.gradient[PRIVS[i]];
      if (g && g.impl) { impl = g.impl; layer = PRIVS[i]; break; }
    }
  }
  const pick = ['native', 'kotlin', 'wasm', 'bin', 'js', 'proc', 'url'].find(k => impl && impl[k]);
  const ctx = makeCtx(p, m, opts);
  ctx.audit.log({ kind: 'invoke', tool: toolId, layer, pick, args });
  if (pick !== 'js') return { ok: false, error: 'IMPL_UNAVAILABLE', detail: 'only impl.js executed by CLI host', layer, pick };
  const r = runJs(path.join(dir, impl.js), args, ctx);
  if (!r.ok) return r;
  ctx.audit.log({ kind: 'invoke-done', tool: toolId, layer });
  return ok({ plugin: pluginId, tool: toolId, layer, impl: pick, result: r.result });
}

/** spec/11 §5：点开插件 UI 时宿主计算出的绑定快照 */
export function ui(pluginId) {
  const p = entry(pluginId);
  if (!p) return fail('INSTALL_NOT_FOUND', pluginId);
  const dir = path.join(home(), p.path);
  const m = jread(path.join(dir, 'axp.json'));
  if (!m.ui || !m.ui.panel) return fail('NO_UI', pluginId);
  const panel = jread(path.join(dir, m.ui.panel.entry));
  const bindings = {};
  for (const b of m.ui.bind || []) {
    const node = String(b.to).split('.')[2];
    const f = path.join(home(), 'surfaces', p.id, encodeURIComponent(b.from) + '.json');
    bindings[node] = exists(f) ? jread(f).value : null;
  }
  return ok({ id: pluginId, panel, bindings, actions: m.ui.actions || [], lifecycle: m.ui.lifecycle || {} });
}

/** 生成 META-INF 签名块（dev：digest + publisher；生产由 apksigner 补 signature） */
export function seal(dir) {
  const m = jread(path.join(path.resolve(dir), 'axp.json'));
  const meta = path.join(path.resolve(dir), 'META-INF');
  fs.mkdirSync(meta, { recursive: true });
  const digest = digestDir(path.resolve(dir));
  fs.writeFileSync(path.join(meta, 'AXP-MANIFEST.DIGEST'), digest + '\n');
  jwrite(path.join(meta, 'AXP-SIG.json'), {
    publisher: m.distribution.publisher, digest, signatureScheme: 'apk-v3',
    signature: 'dev:' + digest.slice(0, 16), certChain: [],
  });
  return ok({ digest, dir: path.resolve(dir) });
}
