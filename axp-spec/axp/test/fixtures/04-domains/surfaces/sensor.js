export function subscribe(emit) { emit({ type: 'delta', value: 0 }); return () => {}; }
