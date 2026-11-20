export function subscribe(emit) { emit({ type: 'full', view: 'text', text: '' }); return () => {}; }
