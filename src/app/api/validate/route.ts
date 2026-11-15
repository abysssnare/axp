import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promises as fsp } from "node:fs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { AXP_ROOT } from "@/lib/axp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);
const VALIDATOR = path.join(AXP_ROOT, "validator", "src", "validate.mjs");

interface ValidateIssue {
  code: string;
  msg: string;
  path?: string;
}

interface ValidateResult {
  ok: boolean;
  errors: ValidateIssue[];
  warnings: ValidateIssue[];
  info: string[];
  summary: {
    id: string;
    version: string;
    axp: string;
    tools: number;
    surfaces: number;
    knowledge: number;
    agents: number;
    events: number;
    ui: boolean;
    hotReload: boolean;
    privilege: string;
    refs: number;
    files: number;
  } | null;
}

/** 运行真实校验器 CLI（node validator/src/validate.mjs <dir> --json） */
async function runValidator(dir: string): Promise<ValidateResult> {
  try {
    const { stdout } = await execFileP(process.execPath, [VALIDATOR, dir, "--json"], {
      cwd: AXP_ROOT,
      timeout: 20_000,
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, NODE_OPTIONS: "" },
    });
    return JSON.parse(stdout) as ValidateResult;
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout) as ValidateResult;
      } catch {
        /* fallthrough */
      }
    }
    return {
      ok: false,
      errors: [{ code: "VALIDATOR_RUN_FAILED", msg: err.stderr?.trim() || err.message || "unknown error" }],
      warnings: [],
      info: [],
      summary: null,
    };
  }
}

/* --------------- 引用收集（与 validator/src/validate.mjs 保持一致） --------------- */

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function implPaths(impl: unknown, add: (p: string) => void) {
  if (!isObj(impl)) return;
  for (const k of ["js", "kotlin", "native", "wasm", "bin"] as const) {
    if (typeof impl[k] === "string") add((impl[k] as string).split("#")[0]);
  }
  if (isObj(impl.proc) && typeof impl.proc.cmd === "string" && (impl.proc.cmd as string).includes("/")) {
    add(impl.proc.cmd as string);
  }
}

/** 收集清单里所有包内相对路径引用，用于「占位文件」模式 */
function collectRefs(m: Record<string, unknown>): string[] {
  const refs: string[] = [];
  const add = (p: unknown) => {
    if (typeof p === "string" && p) refs.push(p);
  };
  if (isObj(m.entry)) add(m.entry.js);
  for (const t of (m.tools as Record<string, unknown>[]) || []) {
    implPaths(t.impl, add);
    for (const g of Object.values((t.gradient as Record<string, unknown>) || {})) {
      implPaths(isObj(g) ? g.impl : null, add);
    }
    if (isObj(t.input) && typeof t.input.$ref === "string") add(t.input.$ref);
    if (isObj(t.output) && typeof t.output.$ref === "string") add(t.output.$ref);
  }
  for (const s of (m.surfaces as Record<string, unknown>[]) || []) implPaths(s.impl, add);
  for (const k of (m.knowledge as Record<string, unknown>[]) || []) add(k.entry);
  for (const a of (m.agents as Record<string, unknown>[]) || []) add(a.prompt);
  for (const e of (m.events as Record<string, unknown>[]) || []) implPaths(e.run, add);
  const ui = (m.ui as Record<string, unknown>) || {};
  for (const slot of ["panel", "widget", "web", "activity"]) {
    if (isObj(ui[slot])) add((ui[slot] as Record<string, unknown>).entry);
  }
  for (const i of (ui.inject as Record<string, unknown>[]) || []) add(i.run);
  if (isObj(ui.lifecycle)) {
    for (const cb of ["onLoad", "onReload", "onUnload"]) add((ui.lifecycle as Record<string, unknown>)[cb]);
  }
  if (isObj(m.hotReload) && isObj((m.hotReload as Record<string, unknown>).state)) {
    add(((m.hotReload as Record<string, unknown>).state as Record<string, unknown>).migrate);
  }
  return [...new Set(refs)];
}

/* --------------------------------- 主入口 --------------------------------- */

export async function POST(req: NextRequest) {
  let body: { mode?: string; example?: string; manifest?: string; stub?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  /* 模式一：校验仓库内真实示例插件 */
  if (body.mode === "example") {
    const example = body.example ?? "";
    if (!/^\d{2}-[a-z0-9-]+$/.test(example)) {
      return NextResponse.json({ error: "invalid example id" }, { status: 400 });
    }
    const dir = path.join(AXP_ROOT, "examples", example);
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ error: "example not found" }, { status: 404 });
    }
    const result = await runValidator(dir);
    return NextResponse.json({ ...result, mode: "example", example });
  }

  /* 模式二：校验用户粘贴的自定义清单 */
  const manifestRaw = body.manifest ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(manifestRaw);
  } catch (e) {
    return NextResponse.json({
      ok: false,
      mode: "custom",
      errors: [{ code: "MANIFEST_PARSE", msg: (e as Error).message }],
      warnings: [],
      info: [],
      summary: null,
    });
  }

  const stub = body.stub !== false;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "axp-playground-"));
  try {
    fs.writeFileSync(path.join(tmp, "axp.json"), JSON.stringify(parsed, null, 2));
    if (stub) {
      for (const ref of collectRefs(parsed)) {
        if (ref.includes("..") || path.isAbsolute(ref) || ref.startsWith("http")) continue;
        const target = path.join(tmp, ref);
        if (!target.startsWith(tmp)) continue;
        await fsp.mkdir(path.dirname(target), { recursive: true });
        const content = ref.endsWith(".json") ? "{}\n" : ref.endsWith(".md") ? "# stub\n" : "";
        await fsp.writeFile(target, content);
      }
      // 为 dsl panel 生成包含 ui.bind 目标节点的最小 panel.json，
      // 使「占位模式」下引用完整性检查完整通过（与真实包行为一致）。
      const ui = (parsed.ui as Record<string, unknown>) || {};
      const panel = ui.panel as Record<string, unknown> | undefined;
      if (isObj(panel) && panel.kind === "dsl" && typeof panel.entry === "string") {
        const bind = (ui.bind as { to?: string }[]) || [];
        const nodeIds = [...new Set(bind.map((b) => String(b.to ?? "").split(".")[2]).filter(Boolean))];
        const panelJson = {
          axpUi: "1.0",
          root: "main",
          nodes: [
            { id: "main", type: "Column", children: nodeIds },
            ...nodeIds.map((id) => ({ id, type: "Text", props: { text: `${id} (stub)` } })),
          ],
        };
        const target = path.join(tmp, panel.entry);
        if (target.startsWith(tmp)) {
          await fsp.mkdir(path.dirname(target), { recursive: true });
          await fsp.writeFile(target, JSON.stringify(panelJson, null, 2));
        }
      }
    }
    const result = await runValidator(tmp);
    return NextResponse.json({ ...result, mode: "custom", stub });
  } finally {
    await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
