#!/usr/bin/env python3
"""
独立引擎交叉复核 — 用 Python jsonschema (draft 2020-12) 复核同一份 schema 与同一批 manifest。

本仓库的 `validator/src/validate.mjs` 内置了一个手写、零依赖的精简 JSON Schema
引擎。本脚本证明三件事：

  [1] `spec/02-manifest.schema.json` 本身是合法的 draft 2020-12 schema（元语法校验）
  [2] 三个随仓库发布的示例：标准实现与 Node 校验器都判为有效
  [3] 16 个被破坏的 manifest：两边在 **schema 层**都判为无效
      （不是碰巧被业务规则拒绝，也不是碰巧因为引用层噪音）
  [4] 语义边界：`if/then` 不误触发；权限词汇表 / 热加载策略 / 引用完整性等
      业务规则刻意不在 JSON Schema 内 —— 标准实现应放行，Node 校验器应精确拒绝

用法：python3 validator/test/schema-crosscheck.py
依赖：pip install jsonschema>=4.18（仅 CI/测试步骤需要，运行时工具链零依赖）
"""
import copy
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SCHEMA = REPO / "spec" / "02-manifest.schema.json"
NODE_VALIDATOR = REPO / "validator" / "src" / "validate.mjs"
EXAMPLES_DIR = REPO / "examples"
EXAMPLES = sorted(p for p in EXAMPLES_DIR.iterdir() if (p / "axp.json").exists())
FULL_EXAMPLE = EXAMPLES_DIR / "03-hot-reload"

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("FAIL: python 'jsonschema' is required (pip install jsonschema>=4.18)", file=sys.stderr)
    sys.exit(2)

passed, failed = 0, 0


def ok(name, cond, extra=""):
    global passed, failed
    if cond:
        print(f"  ✔ {name}")
        passed += 1
    else:
        print(f"  ✖ {name}  {extra}", file=sys.stderr)
        failed += 1


def node_layers(dirpath):
    """Return (schema_ok, overall_ok, error_codes).

    SCHEMA_* codes come from the hand-written JSON Schema engine; every other
    code is a business rule deliberately kept OUT of the schema. Separating
    the two is what makes this a real equivalence check rather than a lucky
    "both happened to reject".
    """
    r = subprocess.run(
        ["node", str(NODE_VALIDATOR), str(dirpath), "--json"],
        capture_output=True, text=True, timeout=30,
    )
    try:
        out = json.loads(r.stdout)
    except Exception:
        sys.exit(f"FAIL: validator emitted no JSON for {dirpath}\nstdout={r.stdout[:400]}\nstderr={r.stderr[:400]}")
    codes = {e["code"] for e in out["errors"]}
    schema_ok = not any(c.startswith("SCHEMA_") for c in codes)
    return schema_ok, out.get("ok", False), codes


def layers_of_manifest(m, extra_file=None):
    """Validate mutated manifest with BOTH engines; keep FS-level business rules honest."""
    py_ok = validator.is_valid(m)
    with tempfile.TemporaryDirectory(prefix="axp-xcheck-") as td:
        t = Path(td) / "plugin"
        shutil.copytree(FULL_EXAMPLE, t)
        (t / "axp.json").write_text(json.dumps(m, ensure_ascii=False), encoding="utf-8")
        if extra_file:
            (t / extra_file[0]).write_text(extra_file[1], encoding="utf-8")
        schema_ok, node_ok, codes = node_layers(t)
    return py_ok, schema_ok, node_ok, codes


def mut(fn):
    m = copy.deepcopy(base)
    fn(m)
    return m


print("[1] schema itself is a valid draft 2020-12 schema")
schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
ok("$schema declares draft 2020-12",
   schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema",
   schema.get("$schema"))
try:
    Draft202012Validator.check_schema(schema)
    ok("check_schema passed", True)
except Exception as e:
    ok("check_schema passed", False, str(e).splitlines()[0])

validator = Draft202012Validator(schema)

print("[2] shipped examples: both engines agree (all valid)")
for d in EXAMPLES:
    m = json.loads((d / "axp.json").read_text(encoding="utf-8"))
    errs = sorted(validator.iter_errors(m), key=lambda e: list(e.path))
    py_ok = len(errs) == 0
    schema_ok, js_ok, codes = node_layers(d)
    ok(f"{d.name}: python={py_ok} node={js_ok}", py_ok and js_ok,
       "; ".join(f"{list(e.path)}: {e.message}" for e in errs[:3]))
    ok(f"{d.name}: schema-layer verdict agrees (py={py_ok}, node={schema_ok})",
       py_ok == schema_ok, f"codes={sorted(codes)}")

print("[3] mutated manifests: both engines reject at the SCHEMA layer")
base = json.loads((FULL_EXAMPLE / "axp.json").read_text(encoding="utf-8"))

cases = {
    "unknown top-level field": lambda m: m.update(surprise=1),
    "bad axp version": lambda m: m.update(axp="9.9"),
    "minAndroid too low": lambda m: m.update(minAndroid=21),
    "unknown abi": lambda m: m.update(abis=["mips"]),
    "tool without impl/gradient": lambda m: m["tools"][0].pop("impl"),
    "bad sideEffects": lambda m: m["tools"][0].update(sideEffects="chaos"),
    "gradient key L9 (patternProperties+additionalProperties)":
        lambda m: m["tools"][1]["gradient"].update(L9={"impl": {"js": "tools/ocr.js"}}),
    "bad surface anchor": lambda m: m["surfaces"][0].update(anchor="pixel"),
    "bad knowledge kind": lambda m: m["knowledge"][0].update(kind="blog"),
    "bad ui kind": lambda m: m["ui"]["panel"].update(kind="flutter"),
    "hotReload on-install signature (if/then const)": lambda m: m["hotReload"].update(signature="on-install"),
    "hotReload shared classloader (if/then const)": lambda m: m["hotReload"].update(classloader="shared"),
    "hotReload unsigned source (enum)":
        lambda m: m["hotReload"].update(sources=["package", "network-unsigned"]),
    "bad runtimeService": lambda m: m["capabilities"].update(runtimeServices=["brain.read"]),
    "bad distribution channel": lambda m: m["distribution"].update(channel="npm"),
    "bad signature scheme": lambda m: m["distribution"].update(signatureScheme="v1"),
    "capabilities missing requests": lambda m: m["capabilities"].pop("requests"),
}

for name, fn in cases.items():
    m = mut(fn)
    py_bad = not validator.is_valid(m)
    py_ok, schema_ok, node_ok, codes = layers_of_manifest(m)
    # Strict: standard implementation rejects AND the Node engine rejects it
    # at the schema layer specifically (not via an unrelated business rule).
    ok(name, py_bad and (not schema_ok),
       f"python_invalid={py_bad} node_schema_invalid={not schema_ok} node_ok={node_ok} codes={sorted(codes)}")

print("[4] semantic boundaries: business rules live outside JSON Schema")

# 4a. if/then must NOT fire when enabled=false, even though all `then.required`
#     fields are absent. This is the classic place a hand-written engine drifts.
m = mut(lambda x: x.update(hotReload={"enabled": False}))
py_ok, schema_ok, node_ok, codes = layers_of_manifest(m)
ok("hotReload.enabled=false does not trigger if/then", py_ok and schema_ok,
   f"py={py_ok} schema={schema_ok} codes={sorted(codes)}")
ok("hotReload.enabled=false passes the whole validator", node_ok, f"codes={sorted(codes)}")

# 4b. For each case: standard schema ALLOWS it (schema allows arbitrary strings
#     / arrays), but the Node validator rejects it with exactly the business code.
business_cases = [
    ("capability vocabulary", lambda x: x["capabilities"]["requests"].append("magic.do"),
     "CAP_UNKNOWN_REQUEST", None),
    ("empty hotReload.targets", lambda x: x["hotReload"].update(targets=[]),
     "HOT_NO_TARGETS", None),
    ("gradient above declared privilege",
     lambda x: x["tools"][1]["gradient"].update(L4={"impl": {"js": "tools/ocr.js"}}),
     "GRADIENT_EXCEEDS_PRIVILEGE", None),
    ("destructive tool without confirm",
     lambda x: x["tools"][0].update(sideEffects="destructive"),
     "TOOL_CONFIRM_REQUIRED", None),
    ("UI action to unknown tool", lambda x: x["ui"]["actions"][0].update(tool="ghost.tool"),
     "UI_ACTION_TOOL_MISSING", None),
    ("undeclared executable file",
     lambda x: None, "UNDECLARED_EXECUTABLE", ("ghost.js", "export const x = 1;\n")),
    ("unknown capability via dangerous list",
     lambda x: x["capabilities"].update(dangerous=["root.su"]),
     "DANGEROUS_NOT_REQUESTED", None),
]

for name, fn, expected, extra in business_cases:
    m = mut(fn)
    py_ok, schema_ok, node_ok, codes = layers_of_manifest(m, extra)
    ok(f"{name}: standard schema allows it", py_ok and schema_ok,
       f"py={py_ok} node_schema={schema_ok}")
    ok(f"{name}: Node rejects with {expected}",
       (not node_ok) and expected in codes, f"codes={sorted(codes)}")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
