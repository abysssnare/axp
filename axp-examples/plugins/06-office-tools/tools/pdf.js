export function run(args, ctx) {
  var text = String(args.text || '').replace(/[()\\]/g, '');
  var body = 'BT /F1 14 Tf 72 720 Td (' + text + ') Tj ET';
  var pdf = '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n'
    + '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n'
    + '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n'
    + '4 0 obj << /Length ' + body.length + ' >> stream\n' + body + '\nendstream endobj\n'
    + '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF';
  ctx.storage.put('last-pdf', pdf);
  return { format: 'pdf', header: '%PDF-1.4', bytes: pdf.length };
}
