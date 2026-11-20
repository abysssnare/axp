export function read(ctx) { return { tree: [], text: ctx.storage.get('screen-text') || '' }; }
