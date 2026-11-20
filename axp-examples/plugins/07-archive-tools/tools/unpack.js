export function run(args, ctx) {
  var blob = String(args.blob || ctx.storage.get('last-archive') || '');
  if (!blob.startsWith('AXPACK1:')) return { error: 'BAD_BLOB', detail: 'expected AXPACK1 prefix' };
  var entries = JSON.parse(blob.slice(8));
  return { format: 'axpack/1', entries, count: entries.length };
}
