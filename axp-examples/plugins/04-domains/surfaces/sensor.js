export function subscribe(emit) { emit({ type: 'full', view: 'value', value: 0 }); return () => {}; }
