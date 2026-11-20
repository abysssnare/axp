export function subscribe(emit) { emit({ type: 'full', view: 'value', value: 'connected' }); return () => {}; }
