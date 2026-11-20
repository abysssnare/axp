export function run(args, ctx) {
  // PDF literal-string 转义：反斜杠先转义，再转义括号（Minor 修复）
  var text = String(args.text || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  var body = 'BT /F1 14 Tf 72 720 Td (' + text + ') Tj ET';

  // 按实际字节计算每个对象的偏移，生成完整 xref 表 / trailer / startxref（Major 修复）
  var parts = [];
  var offsets = [];
  function push(s) { parts.push(s); }

  push('%PDF-1.4\n');
  offsets[1] = byteLen(parts);
  push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n');
  offsets[2] = byteLen(parts);
  push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n');
  offsets[3] = byteLen(parts);
  push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n');
  offsets[4] = byteLen(parts);
  push('4 0 obj << /Length ' + body.length + ' >> stream\n' + body + '\nendstream endobj\n');
  offsets[5] = byteLen(parts);
  push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n');

  var xrefAt = byteLen(parts);
  var xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (var i = 1; i <= 5; i++) {
    xref += pad10(offsets[i]) + ' 00000 n \n';
  }
  push(xref);
  push('trailer << /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefAt + '\n%%EOF');

  var pdf = parts.join('');
  ctx.storage.put('last-pdf', pdf);
  return { format: 'pdf', header: '%PDF-1.4', bytes: pdf.length };
}

function byteLen(parts) {
  var n = 0;
  for (var i = 0; i < parts.length; i++) n += parts[i].length;
  return n;
}
function pad10(n) {
  var s = String(n);
  while (s.length < 10) s = '0' + s;
  return s;
}
