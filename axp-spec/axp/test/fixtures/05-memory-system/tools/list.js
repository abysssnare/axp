export function run(args, ctx) {
  // 兼容两种派发：CLI 宿主 run(args, ctx)；参考运行时单 payload run({..., ctx})
  if (!ctx && args && args.ctx) ctx = args.ctx;
  var st = ctx && ctx.storage ? ctx.storage : null;
  if (!st) return { entries: [], count: 0, note: 'host did not provide storage service' };
  var list = st.get('entries') || [];
  ctx.surface.publish('axp://x/com.example.memory/entries', list);
  return { entries: list, count: list.length };
}
