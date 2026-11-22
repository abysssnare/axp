export function subscribe(emit) {
  // 宿主负责提供真实屏幕流；这里给出示例实现体的形状
  emit({ type: 'full', tree: 'Root' });
  return () => {};
}
