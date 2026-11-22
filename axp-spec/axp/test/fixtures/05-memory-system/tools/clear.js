export function run(args, ctx) {
  ctx.storage.remove('entries');
  ctx.surface.publish('axp://x/com.example.memory/entries', []);
  return { cleared: true };
}
