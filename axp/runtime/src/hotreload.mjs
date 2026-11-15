/** 热加载状态机 — spec/01-format.md §7 / spec/08-hot-reload.md */
import fs from 'node:fs';
import path from 'node:path';
import { componentIds } from './signature.mjs';

export class HotReloadAgent {
  constructor(host) { this.host = host; this.snapshots = new Map(); }

  prepare(plugin) {
    const cfg = plugin.manifest.hotReload;
    if (!cfg || !cfg.enabled) return;
    this.snapshots.set(plugin.id, []);
    this.host.audit.record('hot-prepare', {
      plugin: plugin.id, unit: cfg.unit, targets: cfg.targets,
      strategy: cfg.strategy, classloader: cfg.classloader,
    });
  }

  /** 返回 { ok, state, reason, phases[] }；失败不改 plugin 状态 */
  apply(plugin, newDir) {
    const cfg = plugin.manifest.hotReload;
    const phases = [];
    const phase = (n, data = {}) => { phases.push({ phase: n, ...data }); this.host.audit.record('hot-phase', { plugin: plugin.id, phase: n, ...data }); };
    if (!cfg || !cfg.enabled) return { ok: false, reason: 'HOT_DISABLED', phases };

    phase('VERIFYING');
    let newM;
    try { newM = JSON.parse(fs.readFileSync(path.join(newDir, 'axp.json'), 'utf8')); }
    catch (e) { return { ok: false, reason: 'MANIFEST_PARSE', phases }; }

    const v = this.host.signature.verifyReplace(plugin.manifest, newM);
    if (!v.ok) { phase('REJECTED', { reason: v.reason }); return { ok: false, reason: v.reason, phases }; }
    phase('VERIFIED', { mode: v.mode });

    // targets 之外不允许换：changed 统一为组件前缀（如 tools.ledger.ocr / ui.panel）
    this._oldDir = plugin.dir;
    const changed = this.changedComponents(plugin.manifest, newM, newDir);
    const targets = cfg.targets || [];
    const allowed = c => targets.some(t => c === t || (t.endsWith('*') && c.startsWith(t.slice(0, -1))));
    const outside = changed.filter(c => !allowed(c));
    if (outside.length) { phase('REJECTED', { reason: 'HOT_TARGET_MISMATCH', outside }); return { ok: false, reason: 'HOT_TARGET_MISMATCH', outside, phases }; }

    phase('STAGING');
    const snap = { manifest: plugin.manifest, dir: plugin.dir, state: { ...(plugin.ui?.state || {}) }, at: Date.now() };
    const hist = this.snapshots.get(plugin.id) || [];
    hist.push(snap);
    while (hist.length > (cfg.rollback?.keep ?? 2)) hist.shift();
    this.snapshots.set(plugin.id, hist);

    phase('MIGRATE');
    let state;
    try { state = this.migrateState(snap.state, cfg, newDir); }
    catch (e) {
      phase('ROLLED_BACK', { reason: 'STATE_MIGRATE_FAILED' });
      return { ok: false, reason: 'STATE_MIGRATE_FAILED', phases };
    }

    // onUnload 在旧实现回收前
    let unloadErr = null;
    try { plugin.ui?.unmount(); } catch (e) { unloadErr = e; }
    if (unloadErr && cfg.rollback?.onError !== false) {
      phase('ROLLED_BACK', { reason: 'ONUNLOAD_FAILED' });
      return { ok: false, reason: 'ONUNLOAD_FAILED', phases };
    }

    phase('SWAPPING', { uiRebuild: cfg.uiRebuild });
    plugin.manifest = newM;
    plugin.dir = newDir;
    plugin.registry.swap(newM);
    if (plugin.ui) plugin.ui = new (plugin.ui.constructor)(this.host, plugin);

    let mountErr = null;
    try {
      if (plugin.ui) { plugin.ui.mount(); plugin.ui.state = { ...state }; }
    } catch (e) { mountErr = e; }
    if (mountErr && cfg.rollback?.onError !== false) {
      this.rollback(plugin, phases);
      return { ok: false, reason: 'UI_MOUNT_FAILED', phases };
    }

    // onReload 在界面重建之后、可见之前；抛错则回滚
    try {
      if (plugin.ui) plugin.ui.lifecycle('onReload', { oldState: snap.state, newState: state, changed });
    } catch (e) {
      if (cfg.rollback?.onError !== false) {
        this.rollback(plugin, phases);
        return { ok: false, reason: 'ONRELOAD_FAILED', phases };
      }
    }

    phase('SWAPPED', { version: newM.version, changed: changed.length });
    this.host.audit.record('hot-swap', { plugin: plugin.id, from: snap.manifest.version, to: newM.version, changed });
    return { ok: true, state, changed, phases, version: newM.version };
  }

  changedComponents(oldM, newM, newDir) {
    const out = new Set();
    const oldIds = componentIds(oldM), newIds = componentIds(newM);
    const KIND2PREFIX = { tool: 'tools', surface: 'surfaces', knowledge: 'knowledge', agent: 'agents', event: 'events', ui: 'ui' };
    for (const id of newIds) {
      if (oldIds.has(id)) continue;
      const [kind, ...rest] = id.split(':');
      out.add((KIND2PREFIX[kind] || kind) + '.' + rest.join(':'));
    }
    // 实现体内容变化 → 归属到组件前缀（热加载换的就是实现体，不算新增组件）
    const refs = this.collectRefs(newM);
    for (const r of refs) {
      const oldF = path.join(this._oldDir || '', r);
      const newF = path.join(newDir, r);
      if (fs.existsSync(newF) && (!fs.existsSync(oldF) || fs.readFileSync(newF, 'utf8') !== fs.readFileSync(oldF, 'utf8'))) {
        out.add(this.filePrefix(r));
      }
    }
    return [...out];
  }

  filePrefix(rel) {
    if (rel.startsWith('tools/')) return 'tools.*';
    if (rel.startsWith('surfaces/')) return 'surfaces.*';
    if (rel.startsWith('skills/')) return 'knowledge.*';
    if (rel.startsWith('agents/')) return 'agents.*';
    if (rel.startsWith('events/')) return 'events.*';
    if (rel.startsWith('ui/')) return 'ui.*';
    return 'misc.' + rel;
  }

  collectRefs(m) {
    const out = [];
    for (const t of m.tools || []) { if (t.impl?.js) out.push(t.impl.js); for (const g of Object.values(t.gradient || {})) if (g?.impl?.js) out.push(g.impl.js); }
    for (const k of m.knowledge || []) if (k.entry) out.push(k.entry);
    if (m.ui?.panel?.entry) out.push(m.ui.panel.entry);
    if (m.ui?.lifecycle) for (const v of Object.values(m.ui.lifecycle)) out.push(v);
    if (m.hotReload?.state?.migrate) out.push(m.hotReload.state.migrate);
    return out;
  }

  migrateState(oldState, cfg, dir) {
    const s = { ...oldState };
    const preserve = cfg.state?.preserve || [];
    const keep = {};
    for (const key of preserve) {
      const re = new RegExp('^' + key.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      for (const k of Object.keys(s)) if (re.test(k)) keep[k] = s[k];
    }
    const mf = cfg.state?.migrate;
    if (mf) {
      const abs = path.join(dir, mf);
      if (!fs.existsSync(abs)) throw new Error('STATE_MIGRATE_MISSING');
      const spec = JSON.parse(fs.readFileSync(abs, 'utf8'));
      for (const d of spec.drop || []) delete s[d];
      for (const m of spec.map || []) {
        if (m.transform !== 'identity') continue;
        if (m.src in s) { s[m.dst] = s[m.src]; if (m.src !== m.dst) delete s[m.src]; }
      }
    }
    return { ...s, ...keep };
  }

  rollback(plugin, phases = []) {
    const hist = this.snapshots.get(plugin.id) || [];
    const snap = hist.pop();
    if (!snap) return { ok: false, reason: 'NO_SNAPSHOT' };
    // 回滚同样要验签（防降级攻击）
    const v = this.host.signature.verifyReplace(plugin.manifest, snap.manifest);
    if (!v.ok) { this.host.audit.record('hot-rollback-rejected', { plugin: plugin.id, reason: v.reason }); return { ok: false, reason: 'ROLLBACK_VERIFY_FAILED' }; }
    plugin.manifest = snap.manifest;
    plugin.dir = snap.dir;
    plugin.registry.swap(snap.manifest);
    if (plugin.ui) {
      plugin.ui = new (plugin.ui.constructor)(this.host, plugin);
      plugin.ui.mount();
      plugin.ui.state = { ...snap.state };
    }
    phases.push({ phase: 'ROLLED_BACK', to: snap.manifest.version });
    this.host.audit.record('hot-rollback', { plugin: plugin.id, to: snap.manifest.version });
    return { ok: true, to: snap.manifest.version };
  }
}
