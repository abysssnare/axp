// L3 分支的多实现路径之一：宿主不支持 bin 时按 spec/03 §2 降级到此脚本。
export function run(args) {
  return { via: 'L3/shell-fallback', x: args.x, y: args.y };
}
