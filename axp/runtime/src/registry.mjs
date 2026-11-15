/** 组件注册 + 权限梯度选择 — spec/01-format.md §5.1 / §6.2 */
import { selectImpl, callImpl } from './impl.mjs';

const PRIV = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 };

export class ComponentRegistry {
  constructor(host, plugin) {
    this.host = host;
    this.plugin = plugin;
    this.m = plugin.manifest;
    this.tools = new Map();
    for (const t of this.m.tools || []) this.tools.set(t.id, t);
    this.audit = host.audit;
  }

  hasTool(id) { return this.tools.has(id); }
  componentIds() { return [...this.tools.keys()].map(x => 'tool:' + x); }

  /** 当前可用最高层 → 逐级回退；无路径则 unavailable，不抛异常 */
  chooseImpl(tool) {
    const hostCeiling = Math.max(...this.host.privileges.map(p => PRIV[p] ?? 0), 0);
    const ceiling = Math.min(PRIV[this.m.capabilities.privilege] ?? 0, hostCeiling);
    const grad = tool.gradient || {};
    for (let l = ceiling; l >= 0; l--) {
      const key = 'L' + l;
      if (grad[key]) {
        const c = selectImpl(grad[key].impl);
        if (c && c.kind !== 'unsupported') {
          const r = { chosen: c, layer: key, reason: 'gradient' };
          this.audit.record('gradient', { plugin: this.m.id, tool: tool.id, ...r });
          return r;
        }
      }
    }
    const c = selectImpl(tool.impl);
    if (c) {
      const r = { chosen: c, layer: 'L' + ceiling, reason: 'impl' };
      this.audit.record('gradient', { plugin: this.m.id, tool: tool.id, ...r });
      return r;
    }
    return { chosen: null, layer: null, reason: 'NO_PATH' };
  }

  invoke(toolId, args = {}, opts = {}) {
    const t = this.tools.get(toolId);
    if (!t) return { error: 'TOOL_NOT_FOUND', toolId };
    if ((t.confirm || t.sideEffects === 'destructive') && opts.confirmed !== true) {
      this.audit.record('confirm-required', { plugin: this.m.id, tool: toolId });
      return { error: 'CONFIRM_REQUIRED', toolId };
    }
    const pick = this.chooseImpl(t);
    if (!pick.chosen) {
      this.audit.record('unavailable', { plugin: this.m.id, tool: toolId, reason: pick.reason });
      return { unavailable: true, toolId, reason: pick.reason };
    }
    const started = Date.now();
    let result;
    try {
      result = callImpl(this.plugin.dir, pick.chosen, 'tool', args, {
        log: (...a) => this.host.log('[impl]', ...a),
        plugin: this.m.id,
        tool: toolId,
      });
    } catch (e) {
      this.audit.record('tool-error', { plugin: this.m.id, tool: toolId, code: e.code || 'IMPL_ERROR', msg: e.message });
      return { error: e.code || 'IMPL_ERROR', msg: e.message };
    }
    this.audit.record('tool-call', {
      plugin: this.m.id, tool: toolId, layer: pick.layer, reason: pick.reason,
      sideEffects: t.sideEffects, ms: Date.now() - started,
    });
    return { ok: true, toolId, layer: pick.layer, result };
  }

  /** 热替换时换掉整个 manifest，旧 registry 保留为回滚快照 */
  swap(newManifest) { this.m = newManifest; this.tools.clear(); for (const t of newManifest.tools || []) this.tools.set(t.id, t); }
}
