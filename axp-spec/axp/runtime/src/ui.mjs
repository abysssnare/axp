/** UI 解析 / bind / actions / lifecycle — spec/01-format.md §5.6 / spec/06-ui-vocab.md */
import fs from 'node:fs';
import path from 'node:path';
import { runScript, callImpl } from './impl.mjs';

export class UiRuntime {
  constructor(host, plugin) {
    this.host = host;
    this.plugin = plugin;
    this.m = plugin.manifest;
    this.ui = this.m.ui || null;
    this.panel = null;
    this.state = {};
    this.unsubs = [];
  }

  mount() {
    if (!this.ui || !this.ui.panel) return { mounted: false };
    if (this.ui.panel.kind !== 'dsl') {
      this.host.audit.record('ui-mount', { plugin: this.m.id, kind: this.ui.panel.kind, note: 'non-dsl, skipped parse' });
      return { mounted: true, kind: this.ui.panel.kind };
    }
    const pf = path.resolve(this.plugin.dir, this.ui.panel.entry);
    this.panel = JSON.parse(fs.readFileSync(pf, 'utf8'));
    this.state = { ...(this.panel.state || {}) };
    this.nodeIds = new Set((this.panel.nodes || []).map(n => n.id));

    for (const b of this.ui.bind || []) {
      const node = String(b.to).split('.')[2];
      if (!this.nodeIds.has(node)) throw Object.assign(new Error('UI_BIND_TARGET_MISSING: ' + b.to), { code: 'UI_BIND_TARGET_MISSING' });
      const un = this.host.surfaces.subscribe(b.from, delta => this.applyBind(b.to, delta));
      this.unsubs.push(un);
    }
    for (const a of this.ui.actions || []) {
      if (!this.plugin.registry.hasTool(a.tool)) throw Object.assign(new Error('UI_ACTION_TOOL_MISSING: ' + a.tool), { code: 'UI_ACTION_TOOL_MISSING' });
    }
    this.lifecycle('onLoad');
    this.host.audit.record('ui-mount', { plugin: this.m.id, nodes: this.nodeIds.size, binds: (this.ui.bind || []).length });
    return { mounted: true, nodes: this.nodeIds.size };
  }

  applyBind(to, delta) {
    const parts = String(to).split('.');
    const node = parts[2], prop = parts[3] || 'text';
    this.state[`${node}.${prop}`] = delta.text ?? delta.tree ?? delta.value ?? delta;
    this.host.audit.record('ui-bind-update', { plugin: this.m.id, node, prop });
  }

  /** UI 动作 → 本包工具 */
  action(id, args = {}, opts = {}) {
    const a = (this.ui.actions || []).find(x => x.id === id);
    if (!a) return { error: 'UI_ACTION_NOT_FOUND', id };
    return this.plugin.registry.invoke(a.tool, args, opts);
  }

  lifecycle(name, extra = {}) {
    const rel = this.ui?.lifecycle?.[name];
    if (!rel) return { skipped: true, name };
    try {
      const r = runScript(this.plugin.dir, rel, 'lifecycle', {}, {
        log: (...a) => this.host.log('[ui]', ...a),
        plugin: this.m.id, state: { ...this.state }, name,
        release: () => this.unsubs.forEach(f => f()),
        ...extra,
      });
      this.host.audit.record('ui-lifecycle', { plugin: this.m.id, name, ok: true });
      return { ok: true, name, result: r };
    } catch (e) {
      this.host.audit.record('ui-lifecycle', { plugin: this.m.id, name, ok: false, code: e.code || 'IMPL_ERROR' });
      throw e;
    }
  }

  unmount() {
    const r = this.lifecycle('onUnload');
    this.unsubs.forEach(f => f());
    this.unsubs.length = 0;
    return r;
  }
}
