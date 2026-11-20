export function onLoad(state, ctx) { ctx.audit.log({ kind: 'ui.onLoad' }); return state; }
