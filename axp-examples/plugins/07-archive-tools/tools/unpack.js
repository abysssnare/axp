export function run(args, ctx) {
  var blob = String(args.blob || ctx.storage.get('last-archive') || '');
  if (!blob.startsWith('AXPACK1:')) return { error: 'BAD_BLOB', detail: 'expected AXPACK1 prefix' };
  var entries;
  try { entries = JSON.parse(blob.slice(8)); } catch (e) { return { error: 'BAD_BLOB', detail: 'payload is not valid JSON' }; }
  if (!Array.isArray(entries)) return { error: 'BAD_BLOB', detail: 'payload is not an entry array' };
  return { format: 'axpack/1', entries, count: entries.length };
}
