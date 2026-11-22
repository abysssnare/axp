/** 9 步装载流水线 — spec/01-format.md §8 */
import fs from 'node:fs';
import path from 'node:path';
import { validate } from '../../validator/src/validate.mjs';

export class LoadError extends Error {
  constructor(step, code, msg) { super(`[step ${step}] ${code}: ${msg}`); this.step = step; this.code = code; }
}

export function loadBundle(host, dir, preM) {
  const abs = path.resolve(dir);
  const step = (n, code, msg) => { throw new LoadError(n, code, msg); };

  // 1 解析 + 2 结构校验（复用离线校验器：schema/引用/abis/权限/UI/热加载策略一次跑完）
  if (!fs.existsSync(path.join(abs, 'axp.json'))) step(1, 'MANIFEST_MISSING', 'axp.json not found');
  let m = preM;   // 宿主已预解析时直接复用，避免双读窗口
  if (!m) {
    try { m = JSON.parse(fs.readFileSync(path.join(abs, 'axp.json'), 'utf8')); }
    catch (e) { step(1, 'MANIFEST_PARSE', e.message); }
  }
  const r = validate(abs, m);   // 与后续注册共用同一份解析结果，消除「校验读一份、注册用另一份」的窗口
  if (!r.ok) {
    const e = r.errors[0];
    step(2, e.code, `${e.msg}${e.path ? ' @ ' + e.path : ''}`);
  }
  for (const w of r.warnings) host.audit.record('load-warning', { plugin: m.id, code: w.code, msg: w.msg });

  // 3 签名
  const sig = host.signature.verifyInstall(m, host.bundleHint || {});
  if (!sig.ok) step(3, sig.reason, 'signature verification failed');
  host.audit.record('load-signature', { plugin: m.id, mode: sig.mode, warning: sig.warning || null });

  // 4–6 已由 validate() 覆盖：引用完整性 / abis / 依赖闭包 / 权限上限
  host.audit.record('load-checks', { plugin: m.id, refs: r.summary.refs, files: r.summary.files });

  // 7 注册组件（任一步失败整包拒绝，不部分注册：失败时回滚候选已注册的流/订阅/UI）
  const plugin = {
    id: m.id, manifest: m, dir: abs, registry: null, ui: null,
    _surfaceUnsubs: [], loadedAt: Date.now(),
  };
  try {
    plugin.registry = new host.RegistryCtor(host, plugin);
    for (const s of m.surfaces || []) host.surfaces.register(plugin, s);
    host.audit.record('load-register', {
      plugin: m.id,
      tools: (m.tools || []).length, surfaces: (m.surfaces || []).length,
      knowledge: (m.knowledge || []).length, agents: (m.agents || []).length, events: (m.events || []).length,
    });

    // 8 UI 挂载
    plugin.ui = new host.UiCtor(host, plugin);
    const mounted = plugin.ui.mount();
    host.audit.record('load-ui', { plugin: m.id, ...mounted });

    // 9 Surface 初始全量 + 事件/绑定订阅
    host.surfaces.prime(plugin);
    for (const e of m.events || []) {
      if (!host.surfaces.streams.has(e.on)) {
        // 生命周期事件（lifecycle/*）不在 bus 内：显式登记为不支持，不计入已装载事件，
        // 生产宿主实现 dispatch 后再放开（spec/05-domains.md §events）。
        host.audit.record('event-unsupported', { plugin: m.id, on: e.on, reason: 'EVENT_SOURCE_NOT_IN_BUS' });
        continue;
      }
      const un = host.surfaces.subscribe(e.on, delta => {
        if (e.filter && !matchFilter(e.filter, delta)) return;
        const chosen = (awaitImpl(e.run));
        host.audit.record('event-fire', { plugin: m.id, on: e.on, filter: e.filter || null });
        if (chosen) host.impl.callImpl(plugin.dir, chosen, 'event', { delta }, { log: (...a) => host.log('[event]', ...a) });
      });
      plugin._surfaceUnsubs.push(un);
    }
    host.audit.record('load-events', { plugin: m.id, count: (m.events || []).filter(e => host.surfaces.streams.has(e.on)).length });

    // 热加载就绪
    if (m.hotReload?.enabled) host.hot.prepare(plugin);
  } catch (e) {
    rollbackCandidate(host, plugin);
    throw e;
  }
  host.audit.record('load-done', { plugin: m.id, version: m.version, privilege: m.capabilities.privilege });
  return plugin;
}

/** 装载失败的收尾：回滚候选已注册的流与订阅，不影响已装载插件 */
function rollbackCandidate(host, plugin) {
  plugin._surfaceUnsubs.forEach(f => { try { f(); } catch { /* 已尽力 */ } });
  for (const s of plugin.manifest.surfaces || []) {
    const st = host.surfaces.streams.get(s.uri);
    if (st && st.plugin === plugin) host.surfaces.streams.delete(s.uri);
  }
  try { plugin.ui?.unmount(); } catch { /* 已记录 */ }
  host.audit.record('load-aborted', { plugin: plugin.manifest.id });
}

function awaitImpl(impl) { return impl && impl.js ? { kind: 'js', via: 'js', path: impl.js } : null; }

export function matchFilter(filter, delta) {
  // 参考实现：支持 key=value、key~'子串'、AND；生产宿主按 05-domains.md 定义完整语法
  const text = JSON.stringify(delta);
  const parts = String(filter).split(/\s+AND\s+/);
  return parts.every(p => {
    const m = p.match(/^([\w.]+)~\s*['"]([^'"]+)['"]$/);
    if (m) return text.includes(m[2]);
    const eq = p.match(/^([\w.]+)=(.+)$/);
    if (eq) return text.includes(eq[2].replace(/\*/g, ''));
    return text.includes(p);
  });
}
