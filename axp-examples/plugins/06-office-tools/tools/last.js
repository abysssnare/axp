export function run(args, ctx) {
  var which = args.which === 'pdf' ? 'last-pdf' : 'last-excel';
  return { which, content: ctx.storage.get(which) };
}
