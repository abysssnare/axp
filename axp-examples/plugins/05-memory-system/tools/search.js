export function run(args, ctx) {
  var q = String(args.q || '').toLowerCase();
  var list = (ctx.storage.get('entries') || []).filter(function(x){ return x.text.toLowerCase().indexOf(q) >= 0; });
  return { query: q, entries: list, count: list.length };
}
