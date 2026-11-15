/**
 * T1 脚本实现体加载 — spec/03-impl-reference.md
 * 参考实现只跑 impl.js；T2–T7 登记为 unsupported，由选择算法降级。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const FN_BY_KIND = { tool: 'run', init: 'init', surface: 'subscribe', event: 'run', inject: 'run', lifecycle: null };

const IMPL_ORDER = ['native', 'kotlin', 'wasm', 'bin', 'js', 'proc', 'url'];

/**
 * 宿主实现选择算法 — spec/03-impl-reference.md §2
 * 先过滤宿主支持的形态，再按优先级取第一个；全部不支持才登记 unsupported。
 * 这样「同一能力多实现路径」才真正生效：有 bin 也有 js 时，本运行时跳过 bin 用 js。
 */
export function selectImpl(impl, opts = {}) {
  if (!impl || typeof impl !== 'object') return null;
  const supported = opts.supported || ['js'];
  for (const k of IMPL_ORDER) {
    if (impl[k] && supported.includes(k)) return { kind: 'js', via: k, path: impl[k] };
  }
  const present = IMPL_ORDER.find(k => impl[k]);
  if (present) return { kind: 'unsupported', via: present, impl };
  return null;
}

export function runScript(bundleDir, relPath, kind, args, ctxExtra = {}) {
  const abs = path.resolve(bundleDir, relPath.split('#')[0]);
  if (!fs.existsSync(abs)) throw Object.assign(new Error('IMPL_FILE_MISSING: ' + relPath), { code: 'IMPL_FILE_MISSING' });
  let src = fs.readFileSync(abs, 'utf8');
  if (src.trimStart().startsWith('#!')) src = src.replace(/^#![^\n]*\n/, '');
  src = src.replace(/^export\s+/gm, '');           // 参考实现：去掉 ESM export，vm 内直接取函数
  // 一个入参同时满足两种约定：run(args) 直接取字段；onXxx(ctx) 取 ctx.state / ctx.log
  const payload = {
    ...(args || {}), ...(ctxExtra.args || {}), ...ctxExtra,
    ctx: ctxExtra, args: args || {},
  };
  const sandbox = {
    console: { log: (...a) => (ctxExtra.log ? ctxExtra.log(...a) : undefined) },
    Date, JSON, Math, Object, Array, String, Number, Boolean, Promise,
    ctx: payload, emit: ctxExtra.emit, log: ctxExtra.log,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(src, context, { filename: abs, timeout: 1000 });
  const name = FN_BY_KIND[kind] ?? null;
  const candidates = name ? [name] : ['onLoad', 'onReload', 'onUnload'];
  const fnName = candidates.find(n => typeof context[n] === 'function');
  if (!fnName) throw Object.assign(new Error(`no callable in ${relPath}`), { code: 'IMPL_NO_ENTRY' });
  // surface 提供者约定 subscribe(emit)；其余约定 run(ctx) / onXxx(ctx)
  const callArg = kind === 'surface' && typeof ctxExtra.emit === 'function' ? ctxExtra.emit : payload;
  return context[fnName](callArg);
}

export function callImpl(bundleDir, chosen, kind, args, ctxExtra = {}) {
  if (!chosen) return { unavailable: true, reason: 'NO_IMPL' };
  if (chosen.kind === 'unsupported') return { unavailable: true, reason: 'IMPL_UNSUPPORTED', via: chosen.via };
  return runScript(bundleDir, chosen.path, kind, args, ctxExtra);
}
