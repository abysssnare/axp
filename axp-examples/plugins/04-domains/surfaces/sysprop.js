export function subscribe(emit) { emit({ type: 'full', view: 'value', value: 'demo' }); return () => {}; }
export function read(args) { return { value: 'demo' }; }
