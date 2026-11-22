export function run(args, ctx) {
  var list = ctx.storage.get('entries') || [];
  ctx.surface.publish('axp://x/com.example.memory/entries', list);
  return { entries: list, count: list.length };
}
