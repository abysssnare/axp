export function run(args, ctx) {
  var rows = Array.isArray(args.rows) ? args.rows : [];
  var esc = function(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
  var csv = rows.map(function(r) { return (Array.isArray(r) ? r : [r]).map(esc).join(','); }).join('\n');
  ctx.storage.put('last-excel', csv);
  return { format: 'csv', bytes: csv.length, preview: csv.slice(0, 200), rows: rows.length };
}
