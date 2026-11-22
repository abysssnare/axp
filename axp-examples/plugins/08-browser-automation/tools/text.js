export function run(args, ctx) {
  return { action: 'screen.text', text: ctx.storage.get('screen-text') || '', via: 'L2/accessibility' };
}
