/**
 * T1 脚本实现体加载 — spec/03-impl-reference.md
 * 参考实现只跑 impl.js；T2–T7 登记为 unsupported，由选择算法降级。
 *
 * 沙箱边界（spec/18 §3）：上下文只含 VM 原生全局，宿主回调（log/emit/release）
 * 经序列化消息桥进出 —— 宿主函数仅存于 VM 闭包，跨 realm 数据一律 JSON 往返。
 * 注意：node:vm 不是权限边界（Node 官方立场），生产宿主应使用独立进程 / isolate。
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

/** 引用必须在 bundle 内（含符号链接解析）：初始装载 / 热重载 / 工具实现统一收口 */
function assertInside(bundleDir, relPath) {
  const abs = path.resolve(bundleDir, relPath.split('#')[0]);
  const realBundle = fs.realpathSync(path.resolve(bundleDir));
  let realAbs = null;
  try { realAbs = fs.realpathSync(abs); } catch { /* 文件缺失由下一条 IMPL_FILE_MISSING 报告 */ }
  if (realAbs) {
    const rel = path.relative(realBundle, realAbs);
    if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
      throw Object.assign(new Error('IMPL_PATH_OUTSIDE_BUNDLE: ' + relPath), { code: 'IMPL_PATH_OUTSIDE_BUNDLE' });
    }
  } else {
    // 文件不存在时也要防 .. 逃逸：按词法路径判断
    const rel = path.relative(path.resolve(bundleDir), abs);
    if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
      throw Object.assign(new Error('IMPL_PATH_OUTSIDE_BUNDLE: ' + relPath), { code: 'IMPL_PATH_OUTSIDE_BUNDLE' });
    }
  }
  return abs;
}

/**
 * 序列化能力桥：把宿主回调（log/emit/release/…）包装成 VM realm 函数。
 * 返回 { bridgeSrc, install } —— bridgeSrc 在 VM 内定义 __axpFns 安装器。
 */
function makeBridge(fnNames) {
  const cases = fnNames.map(n => `    ${JSON.stringify(n)}: function () { return call(${JSON.stringify(n)}, Array.prototype.slice.call(arguments)); },`).join('\n');
  const bridgeSrc = `
globalThis.__axpFns = (function () {
  var cache = {};
  function install(hd) {
    function call(name, arr) {
      var resp = hd(name, JSON.stringify(arr));
      if (!resp || resp.ok !== true) {
        var msg = (resp && resp.err) ? String(resp.err) : 'IMPL_ERROR';
        var e = new Error(msg); e.code = msg; throw e;
      }
      return resp.json === undefined ? undefined : JSON.parse(resp.json);
    }
    var fns = {
${cases}
    };
    for (var k in fns) cache[k] = fns[k];
    return fns;
  }
  return { install: install, get: function (n) { return cache[n]; } };
})();
`;
  return bridgeSrc;
}

export function runScript(bundleDir, relPath, kind, args, ctxExtra = {}) {
  const abs = assertInside(bundleDir, relPath);
  if (!fs.existsSync(abs)) throw Object.assign(new Error('IMPL_FILE_MISSING: ' + relPath), { code: 'IMPL_FILE_MISSING' });
  let src = fs.readFileSync(abs, 'utf8');
  if (src.trimStart().startsWith('#!')) src = src.replace(/^#![^\n]*\n/, '');
  src = src.replace(/^export\s+/gm, '');           // 参考实现：去掉 ESM export，vm 内直接取函数

  // 沙箱：只含 VM 原生全局 + 序列化桥，不注入宿主 realm 对象 / 构造器
  const sandbox = Object.create(null);
  const context = vm.createContext(sandbox);
  vm.runInContext(src, context, { filename: abs, timeout: 1000 });

  // 入口选择：js 引用可用 #fragment 指定命名入口；否则按 kind 约定
  const frag = relPath.includes('#') ? relPath.slice(relPath.indexOf('#') + 1) : null;
  const name = FN_BY_KIND[kind] ?? null;
  const candidates = frag ? [frag] : (name ? [name] : ['onLoad', 'onReload', 'onUnload']);
  const types = candidates.map(n => typeof context[n]);
  const idx = types.indexOf('function');
  if (idx < 0) throw Object.assign(new Error(`no callable in ${relPath}`), { code: 'IMPL_NO_ENTRY' });
  const fnName = candidates[idx];

  // 宿主回调桥接：ctxExtra 中的函数（log/emit/release…）不出现在 payload 数据里
  const fns = {};
  const data = {};
  for (const [k, v] of Object.entries(ctxExtra || {})) {
    if (typeof v === 'function') fns[k] = v; else data[k] = v;
  }
  const fnNames = Object.keys(fns);
  if (fnNames.length) {
    vm.runInContext(makeBridge(fnNames), context, { timeout: 200 });
    sandbox.__axpFns.install((nm, argsJson) => {
      const fn = fns[nm];
      if (!fn) return { ok: false, err: 'CTX_OP_UNKNOWN: ' + nm };
      try {
        const v = fn(...JSON.parse(argsJson));
        return { ok: true, json: JSON.stringify(v === undefined ? null : v) };
      } catch (e) { return { ok: false, err: String(e && e.message || e) }; }
    });
  }

  // payload 在 VM realm 内构造：单上下文对象同时满足 run(args)/onXxx(ctx) 两种约定
  const payloadData = { ...(args || {}), ...(ctxExtra.args || {}), ...data };
  sandbox.__axpPayloadJson = JSON.stringify({ d: payloadData, f: fnNames, a: args || {} });
  vm.runInContext(`
    (function () {
      var spec = JSON.parse(globalThis.__axpPayloadJson);
      var getFn = globalThis.__axpFns ? function (n) { return globalThis.__axpFns.get(n); } : function () { return undefined; };
      var fnv = {};
      for (var i = 0; i < spec.f.length; i++) fnv[spec.f[i]] = getFn(spec.f[i]);
      var ctxObj = {};
      for (var k in spec.d) ctxObj[k] = spec.d[k];
      for (var k2 in fnv) ctxObj[k2] = fnv[k2];
      var p = {};
      for (var k3 in ctxObj) p[k3] = ctxObj[k3];
      p.ctx = ctxObj;
      p.args = spec.a;
      globalThis.__axpPayload = p;
      globalThis.log = fnv.log;          // 兼容旧约定：log/emit 同时暴露为全局
      globalThis.emit = fnv.emit;
      globalThis.console = { log: function () { if (fnv.log) fnv.log.apply(null, arguments); } };
    })();
  `, context, { timeout: 200 });

  // 调用：surface 提供者约定 subscribe(emit)，其余 run(ctx)/onXxx(ctx)；在 timeout 内执行
  const callArg = kind === 'surface' && fnNames.includes('emit') ? '__axpFns.get("emit")' : '__axpPayload';
  const resultJson = vm.runInContext(
    `(function () { var r = ${fnName}(${callArg}); return JSON.stringify(r === undefined ? null : r); })()`,
    context, { timeout: 1000, filename: abs },
  );
  return JSON.parse(resultJson);
}

export function callImpl(bundleDir, chosen, kind, args, ctxExtra = {}) {
  if (!chosen) return { unavailable: true, reason: 'NO_IMPL' };
  if (chosen.kind === 'unsupported') return { unavailable: true, reason: 'IMPL_UNSUPPORTED', via: chosen.via };
  return runScript(bundleDir, chosen.path, kind, args, ctxExtra);
}
