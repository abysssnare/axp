export function run(args, ctx) {
  var entries = (args.files || []).map(function(f) { return { name: String(f.name || 'file'), content: String(f.content || '') }; });
  var blob = 'AXPACK1:' + JSON.stringify(entries);
  ctx.storage.put('last-archive', blob);
  return { format: 'axpack/1', entries: entries.length, bytes: blob.length, blob };
}
