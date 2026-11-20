export function run(args, ctx) {
  // L1 路径：经本包声明的 axp://fs/{path} surface 读取（宿主按 fs.read 请求授权）
  var uri = 'axp://fs/' + String(args.path || '');
  var snap = (ctx && ctx.surface && ctx.surface.read) ? ctx.surface.read(uri) : null;
  var text = snap && typeof snap.text === 'string' ? snap.text : '';
  return { path: args.path, text: text };
}
