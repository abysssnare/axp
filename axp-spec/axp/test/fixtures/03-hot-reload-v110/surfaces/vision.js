export function subscribe(emit) {
  emit({ type: 'full', tree: 'Root', text: '' });
  return () => {};
}
