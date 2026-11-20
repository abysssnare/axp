export function run(args, ctx) {
  var list = ctx.storage.get('entries') || [];
  var item = { id: String(Date.now()), text: String(args.text || ''), at: Date.now() };
  list.push(item);
  ctx.storage.put('entries', list);
  ctx.surface.publish('axp://x/com.example.memory/entries', list);
  ctx.ui.push('ui.panel.count', list.length);
  return item;
}
