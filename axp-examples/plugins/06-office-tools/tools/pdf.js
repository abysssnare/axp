export function run(args, ctx) {
  // 文本 → PDF 字节串（标准 14 字体 Helvetica，WinAnsi 与 Latin-1 共通区间：
  // 可打印 ASCII 32-126 与 Latin-1 160-255）。先把 UTF-16 代理对合并成码点，
  // 再判断可表示性；不可表示（如 CJK / 增补平面）明确报 TEXT_NOT_ENCODABLE
  // —— 完整 Unicode 需要嵌入 CID 字体，本示例不做。
  var s = String(args.text || '');
  var bytes = encodeLatin(s);
  if (bytes === null) {
    return { error: 'TEXT_NOT_ENCODABLE', detail: 'standard-14 Helvetica covers ASCII + Latin-1; embed a CID font for full Unicode text' };
  }
  // PDF literal-string 转义（按字节）：反斜杠 / 括号用命名转义，其余非 ASCII 字节用 \ooo
  var esc = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b === 92) esc += '\\\\';
    else if (b === 40) esc += '\\(';
    else if (b === 41) esc += '\\)';
    else if (b < 32 || b > 126) {
      var oct = b.toString(8);
      while (oct.length < 3) oct = '0' + oct;
      esc += '\\' + oct;
    } else esc += String.fromCharCode(b);
  }
  var body = 'BT /F1 14 Tf 72 720 Td (' + esc + ') Tj ET';

  // 转义后 body 为纯 ASCII：parts[i].length 即字节数
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
  push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj\n');

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

/** UTF-16 → Latin-1 字节（含代理对合并）；超出可表示范围返回 null */
function encodeLatin(s) {
  var out = [];
  var i = 0;
  while (i < s.length) {
    var c = s.charCodeAt(i);
    var cp = c;
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
      var lo = s.charCodeAt(i + 1);
      if (lo >= 0xDC00 && lo <= 0xDFFF) {
        cp = 0x10000 + ((c - 0xD800) << 10) + (lo - 0xDC00);
        i += 2;
      } else i += 1;
    } else i += 1;
    if (cp >= 32 && cp <= 126) out.push(cp);
    else if (cp >= 160 && cp <= 255) out.push(cp);       // Latin-1 上半区（WinAnsi 共通）
    else if (cp === 9 || cp === 10 || cp === 13) out.push(cp);  // 制表/换行
    else return null;                                     // 不在所选编码内
  }
  return out;
}
