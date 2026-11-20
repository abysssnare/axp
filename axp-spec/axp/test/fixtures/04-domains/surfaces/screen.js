export function subscribe(emit) { emit({ type: 'full', view: 'tree', text: 'Root' }); return () => {}; }
