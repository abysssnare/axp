/** 结构化审计日志 — spec/01-format.md §5.7, §6.2, §8 */
export class AuditLog {
  constructor() { this.entries = []; }
  record(kind, detail = {}) {
    const e = { seq: this.entries.length + 1, at: Date.now(), kind, ...detail };
    this.entries.push(e);
    return e;
  }
  all() { return this.entries.slice(); }
  of(kind) { return this.entries.filter(e => e.kind === kind); }
  clear() { this.entries.length = 0; }
}
