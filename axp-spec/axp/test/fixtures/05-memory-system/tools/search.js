export function run(args, ctx) {
  // 兼容两种派发：CLI 宿主 run(args, ctx)；参考运行时单 payload run({..., ctx})
  if (!ctx && args && args.ctx) ctx = args.ctx;
  var q = String((args && args.q) || '').toLowerCase();
  var st = ctx && ctx.storage ? ctx.storage : null;
  if (!st) return { query: q, entries: [], count: 0, note: 'host did not provide storage service' };
  var list = (st.get('entries') || []).filter(function (x) { return x.text.toLowerCase().indexOf(q) >= 0; });
  return { query: q, entries: list, count: list.length };
}
