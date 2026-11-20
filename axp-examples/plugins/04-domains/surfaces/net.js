export function subscribe(emit) { emit({ type: 'delta', value: 'connected' }); return () => {}; }
