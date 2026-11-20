export function run(args, ctx) {
  // 文本编码为 PDF literal-string：反斜杠先转义，再转义括号；
  // 非 ASCII 字符统一转成 \ooo 八进制转义 —— 导出的 PDF 为纯 ASCII，
  // 字符串 length 即字节数，/Length 与 xref 偏移全部按字节精确计算。
  var s = String(args.text || '');
  var esc = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c === 92) esc += '\\\\';                 // backslash
    else if (c === 40) esc += '\\(';             // (
    else if (c === 41) esc += '\\)';             // )
    else if (c < 32 || c > 126) {
      var oct = c.toString(8);
      while (oct.length < 3) oct = '0' + oct;
      esc += '\\' + oct;
    } else esc += s.charAt(i);
  }
  var body = 'BT /F1 14 Tf 72 720 Td (' + esc + ') Tj ET';

  // 纯 ASCII 输出：parts[i].length 就是字节数
  var parts = [];
  var offsets = [];
  function push(x) { parts.push(x); }
  function byteLen() { var n = 0; for (var j = 0; j < parts.length; j++) n += parts[j].length; return n; }

  push('%PDF-1.4\n');
  offsets[1] = byteLen();
  push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n');
  offsets[2] = byteLen();
  push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n');
  offsets[3] = byteLen();
  push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n');
  offsets[4] = byteLen();
  push('4 0 obj << /Length ' + body.length + ' >> stream\n' + body + '\nendstream endobj\n');
  offsets[5] = byteLen();
  push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n');

  var xrefAt = byteLen();
  var xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (var k = 1; k <= 5; k++) {
    var d = String(offsets[k]);
    while (d.length < 10) d = '0' + d;
    xref += d + ' 00000 n \n';
  }
  push(xref);
  push('trailer << /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefAt + '\n%%EOF');

  var pdf = parts.join('');
  ctx.storage.put('last-pdf', pdf);
  return { format: 'pdf', header: '%PDF-1.4', bytes: pdf.length };
}
