export function read(ctx) { return ctx.storage.get('entries') || []; }
