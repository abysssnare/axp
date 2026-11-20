export function onLoad(ctx) { ctx.log('memory panel mounted, entries=' + (ctx.state && ctx.state['ui.panel.count'] || 0)); return ctx.state; }
