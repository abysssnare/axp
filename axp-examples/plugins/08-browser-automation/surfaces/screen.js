// watchable surface 的订阅入口：先发初始全量快照，再返回清理函数。
// screen-text 的后续增量由宿主 Accessibility 事件驱动（本示例未接入，见 README）。
export function subscribe(emit) {
  emit({ type: 'full', tree: [], text: '' });
  return function () { /* 宿主退订时清理 */ };
}
export function read(ctx) { return { tree: [], text: ctx.storage.get('screen-text') || '' }; }
