export function run(args, ctx) {
  var url = String(args.url || '');
  ctx.audit.log({ kind: 'intent', url });
  return { action: 'android.intent.action.VIEW', uri: url, component: 'browser', ok: true };
}
