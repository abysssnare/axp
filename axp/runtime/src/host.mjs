/** AXP Reference Runtime — 主入口。声明等级 AXP-3。 */
import { AuditLog } from './audit.mjs';
import { SignaturePolicy } from './signature.mjs';
import { SurfaceBus } from './surfaces.mjs';
import { ComponentRegistry } from './registry.mjs';
import { UiRuntime } from './ui.mjs';
import { HotReloadAgent } from './hotreload.mjs';
import { loadBundle } from './loader.mjs';
import * as implMod from './impl.mjs';

export class AxpHost {
  constructor(opts = {}) {
    this.privileges = opts.privileges || ['L0', 'L1'];
    this.signature = opts.signature || new SignaturePolicy(opts.signatureMode || 'dev');
    this.bundleHint = opts.bundleHint || {};
    this.audit = new AuditLog();
    this.log = opts.log || (() => {});
    this.plugins = new Map();
    this.surfaces = new SurfaceBus(this);
    this.hot = new HotReloadAgent(this);
    this.impl = implMod;
    this.RegistryCtor = ComponentRegistry;
    this.UiCtor = UiRuntime;
  }

  /** 装载：9 步，任一步失败整包拒绝，不部分注册 */
  load(dir) {
    const p = loadBundle(this, dir);
    this.plugins.set(p.id, p);
    return p;
  }

  get(id) {
    const p = this.plugins.get(id);
    if (!p) throw Object.assign(new Error('PLUGIN_NOT_FOUND: ' + id), { code: 'PLUGIN_NOT_FOUND' });
    return p;
  }

  invoke(pluginId, toolId, args = {}, opts = {}) {
    return this.get(pluginId).registry.invoke(toolId, args, opts);
  }

  action(pluginId, actionId, args = {}, opts = {}) {
    return this.get(pluginId).ui.action(actionId, args, opts);
  }

  publish(uri, delta) { return this.surfaces.publish(uri, delta); }

  /** 热替换：newDir 是新版本目录；返回状态机 phases */
  applyHotReplace(pluginId, newDir) {
    const p = this.get(pluginId);
    this.hot._oldDir = p.dir;
    return this.hot.apply(p, newDir);
  }

  rollback(pluginId) { return this.hot.rollback(this.get(pluginId)); }

  unload(pluginId) {
    const p = this.get(pluginId);
    p._surfaceUnsubs.forEach(f => f());
    try { p.ui?.unmount(); } catch { /* 已记录 */ }
    this.plugins.delete(pluginId);
    this.audit.record('unload', { plugin: pluginId });
  }

  summary() {
    return [...this.plugins.values()].map(p => ({
      id: p.id, version: p.manifest.version, privilege: p.manifest.capabilities.privilege,
      tools: p.registry.tools.size, ui: !!p.ui?.panel, hotReload: !!p.manifest.hotReload?.enabled,
    }));
  }
}

export { SignaturePolicy, AuditLog, SurfaceBus, ComponentRegistry, UiRuntime, HotReloadAgent };
