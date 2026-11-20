export function run(args, ctx) {
  // 兼容两种派发：CLI 宿主 run(args, ctx)；参考运行时单 payload run({..., ctx})
  if (!ctx && args && args.ctx) ctx = args.ctx;
  var reader = ctx && ctx.surface && ctx.surface.read ? ctx.surface.read : null;
  if (!reader) {
    // 宿主未提供 surface.read：明确「不可用」而不是假装读到了空文本
    return { path: args && args.path, text: '', unavailable: true, reason: 'host did not provide surface.read for axp://fs/{path}' };
  }
  var uri = 'axp://fs/' + String((args && args.path) || '');
  var snap = reader(uri);
  if (snap === null || snap === undefined) {
    // 该 URI 尚无快照：同样按「不可用」处理；快照存在但为空文本则是合法的 {text:''}
    return { path: args && args.path, text: '', unavailable: true, reason: 'no snapshot published for ' + uri };
  }
  var text = typeof snap.text === 'string' ? snap.text : '';
  return { path: args && args.path, text: text };
}
