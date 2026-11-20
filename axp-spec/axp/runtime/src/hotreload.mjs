/** 热加载状态机 — spec/01-format.md §7 / spec/08-hot-reload.md */
import fs from 'node:fs';
import path from 'node:path';
import { componentIds } from './signature.mjs';

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

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

    // 新版本的回滚保留数必须非负整数：负值会让后续回滚历史被清空
    const newKeep = newM.hotReload?.rollback?.keep;
    if (newKeep !== undefined && (!Number.isInteger(newKeep) || newKeep < 0)) {
      phase('REJECTED', { reason: 'HOT_ROLLBACK_KEEP_INVALID' });
      return { ok: false, reason: 'HOT_ROLLBACK_KEEP_INVALID', phases };
    }

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
    // 迁移与 onUnload 都在旧实现回收前；全部通过后才把快照入栈 ——
    // 预交换阶段的失败不会留下面目全非的「幽灵快照」挤掉真正的恢复代。
    phase('MIGRATE');
    let state;
    try { state = this.migrateState(plugin.ui?.state || {}, cfg, newDir); }
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

    // 验签证据随快照保留：回滚时确认这次替换当初是在验签通过下发生的
    const snap = { manifest: plugin.manifest, dir: plugin.dir, state: { ...(plugin.ui?.state || {}) }, at: Date.now(), verified: v };
    const hist = this.snapshots.get(plugin.id) || [];
    hist.push(snap);
    const keep = Number.isInteger(cfg.rollback?.keep) ? cfg.rollback.keep : 2;
    while (hist.length > 0 && hist.length > keep) hist.shift();
    this.snapshots.set(plugin.id, hist);

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
      const rb = this.rollback(plugin, phases);
      if (!rb.ok) {
        // 回滚被拒：快照未消费，明确暴露「恢复失败」而不是假装回滚成功
        phase('RECOVERY_FAILED', { reason: rb.reason });
        return { ok: false, reason: 'UI_MOUNT_FAILED', recovery: rb.reason, phases };
      }
      return { ok: false, reason: 'UI_MOUNT_FAILED', phases };
    }

    // onReload 在界面重建之后、可见之前；抛错则回滚
    try {
      if (plugin.ui) plugin.ui.lifecycle('onReload', { oldState: snap.state, newState: state, changed });
    } catch (e) {
      if (cfg.rollback?.onError !== false) {
        const rb = this.rollback(plugin, phases);
        if (!rb.ok) {
          phase('RECOVERY_FAILED', { reason: rb.reason });
          return { ok: false, reason: 'ONRELOAD_FAILED', recovery: rb.reason, phases };
        }
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
    // 实现体内容变化 → 归属到具体组件 id（如 tools.ledger.ocr），
    // 精确 targets（tools.ledger.ocr）与通配 targets（tools.*）都能命中
    const oldRefs = new Map(this.collectRefs(oldM).map(r => [r.ref, r.comp]));
    for (const { ref, comp } of this.collectRefs(newM)) {
      const oldF = path.join(this._oldDir || '', ref);
      const newF = path.join(newDir, ref);
      if (fs.existsSync(newF) && (!fs.existsSync(oldF) || fs.readFileSync(newF, 'utf8') !== fs.readFileSync(oldF, 'utf8'))) {
        out.add(comp || this.filePrefix(ref));
      } else if (oldRefs.has(ref) && !fs.existsSync(newF)) {
        // 实现文件被移除：同样是所属组件的变更
        out.add(oldRefs.get(ref));
      }
    }
    // 旧有断无的引用（旧实现文件在新版中彻底消失）
    for (const { ref, comp } of this.collectRefs(oldM)) {
      const newF = path.join(newDir, ref);
      if (!fs.existsSync(newF)) out.add(comp || this.filePrefix(ref));
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

  /** 引用 → 所属组件 id：tools/ocr.js → tools.ledger.ocr（精确 targets 可命中） */
  collectRefs(m) {
    const out = [];
    const add = (p, comp) => { if (typeof p === 'string' && p) out.push({ ref: p.split('#')[0], comp }); };
    if (isObj(m.entry)) add(m.entry.js, 'entry');
    for (const t of m.tools || []) {
      if (isObj(t.impl)) for (const k of ['js', 'kotlin', 'native', 'wasm', 'bin']) if (typeof t.impl[k] === 'string') add(t.impl[k], 'tools.' + t.id);
      for (const [layer, g] of Object.entries(t.gradient || {})) {
        if (isObj(g?.impl)) for (const k of ['js', 'kotlin', 'native', 'wasm', 'bin']) if (typeof g.impl[k] === 'string') add(g.impl[k], 'tools.' + t.id);
      }
    }
    for (const s of m.surfaces || []) {
      if (isObj(s.impl)) for (const k of ['js', 'kotlin', 'native', 'wasm', 'bin']) if (typeof s.impl[k] === 'string') add(s.impl[k], 'surfaces.' + s.uri);
    }
    for (const k of m.knowledge || []) add(k.entry, 'knowledge.' + k.id);
    for (const a of m.agents || []) add(a.prompt, 'agents.' + a.id);
    for (const e of m.events || []) {
      if (isObj(e.run)) for (const k of ['js', 'kotlin', 'native', 'wasm', 'bin']) if (typeof e.run[k] === 'string') add(e.run[k], 'events.' + e.on);
    }
    const ui = m.ui || {};
    if (isObj(ui.panel)) add(ui.panel.entry, 'ui.panel');
    if (isObj(ui.widget)) add(ui.widget.entry, 'ui.widget');
    if (isObj(ui.web)) add(ui.web.entry, 'ui.web');
    if (isObj(ui.activity)) add(ui.activity.entry, 'ui.activity');
    for (const i of ui.inject || []) add(i.run, 'ui.inject');
    if (isObj(ui.lifecycle)) {
      for (const [cb, v] of Object.entries(ui.lifecycle)) add(v, 'ui.lifecycle.' + cb);
    }
    if (isObj(m.hotReload?.state)) add(m.hotReload.state.migrate, 'hotReload.state');
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
    const snap = hist[hist.length - 1];   // 先验证后弹出：被拒的回滚不丢快照
    if (!snap) return { ok: false, reason: 'NO_SNAPSHOT' };
    // 回滚验签（防降级攻击）：快照在成为活动版本前已通过完整前向验证，
    // 此处只校验发布者 / 身份 / 权限不扩大 —— 恢复旧组件集合是回滚的本意，
    // 不复用前向「组件只减不增」子集检查（那会把合法回滚判成 HOT_NEW_COMPONENT）。
    const v = this.host.signature.verifyRestore(plugin.manifest, snap);
    if (!v.ok) {
      this.host.audit.record('hot-rollback-rejected', { plugin: plugin.id, reason: v.reason });
      return { ok: false, reason: 'ROLLBACK_VERIFY_FAILED' };
    }
    hist.pop();
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
