export function onUnload(state, ctx) { ctx.audit.log({ kind: 'ui.onUnload' }); }
