/** Surface 流：订阅 / 退订 / 增量 / 背压 — spec/01-format.md §5.2 / spec/05-domains.md */
import { callImpl, selectImpl } from './impl.mjs';

export class SurfaceBus {
  constructor(host) {
    this.host = host;
    this.streams = new Map();   // uri -> { def, subs:Set, last }
    this.maxHz = 60;
  }

  register(plugin, def) {
    this.streams.set(def.uri, { plugin, def, subs: new Set(), last: null, lastAt: 0 });
    this.host.audit.record('surface-register', { plugin: plugin.manifest.id, uri: def.uri, watchable: !!def.watchable });
  }

  subscribe(uri, fn) {
    const s = this.streams.get(uri);
    if (!s) return () => {};
    if (!s.def.watchable) throw Object.assign(new Error('SURFACE_NOT_WATCHABLE: ' + uri), { code: 'SURFACE_NOT_WATCHABLE' });
    s.subs.add(fn);
    return () => s.subs.delete(fn);
  }

  /** 首次 full，之后 delta；背压：同 uri 高频推送合并 */
  publish(uri, delta) {
    const s = this.streams.get(uri);
    if (!s) return { delivered: 0 };
    const now = Date.now();
    if (now - s.lastAt < 1000 / this.maxHz && delta.type !== 'full') {
      return { delivered: 0, throttled: true };
    }
    s.lastAt = now;
    s.last = delta;
    for (const fn of [...s.subs]) {
      try { fn(delta, s.def); } catch (e) { this.host.audit.record('surface-sub-error', { uri, msg: e.message }); }
    }
    this.host.audit.record('surface-publish', { uri, type: delta.type || 'delta', delivered: s.subs.size });
    return { delivered: s.subs.size };
  }

  /** 让插件提供的 surface impl 主动 emit 一次初始全量 */
  prime(plugin) {
    for (const def of plugin.manifest.surfaces || []) {
      const chosen = selectImpl(def.impl);
      if (!chosen || chosen.kind === 'unsupported') continue;
      try {
        const unsub = callImpl(plugin.dir, chosen, 'surface', {}, {
          log: (...a) => this.host.log('[surface]', ...a),
          emit: d => this.publish(def.uri, d),
        });
        if (typeof unsub === 'function') plugin._surfaceUnsubs.push(unsub);
      } catch (e) {
        this.host.audit.record('surface-prime-error', { uri: def.uri, code: e.code || 'IMPL_ERROR', msg: e.message });
      }
      // prime 发出的初始 full 是状态快照，不是高频推送：
      // 重置背压计时，避免装载后 1000/maxHz 内的首个真实 delta 被误吞。
      const primed = this.streams.get(def.uri);
      if (primed) primed.lastAt = 0;
    }
  }
}
