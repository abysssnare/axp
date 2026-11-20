package dev.axp.host.core;

import javax.script.Bindings;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.SimpleBindings;
import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * AXP Android 宿主 core 的一致性测试（spec/12 同一张表，纯 JVM 可跑）。
 * 用 Nashorn 执行插件 impl.js —— Android 端用 WebViewJsRunner 执行同一份源码。
 * 运行：java axp-android-host/conformance/ConformanceRunner.java
 */
public final class ConformanceMain {
    static final class NashornRunner implements JsRunner {
        @Override public String run(String source, String argsJson, HostContext ctx, String entry) throws Exception {
            ScriptEngine e = new ScriptEngineManager().getEngineByName("nashorn");
            if (e == null) throw new IllegalStateException("nashorn unavailable");
            Bindings b = new SimpleBindings();
            b.put("ctx", ctx);
            Object v = e.eval(JsRunner.wrapper(source, argsJson, entry), b);
            return v == null ? "null" : String.valueOf(v);
        }
    }

    static final class Case { String id, level, detail; boolean ok; Case(String i, String l, boolean o, String d) { id=i; level=l; ok=o; detail=d; } }
    interface T { void run() throws Exception; }
    static List<Case> cases = new ArrayList<>();
    static void c(String id, String level, T t) {
        try { t.run(); cases.add(new Case(id, level, true, "ok")); }
        catch (Throwable e) { cases.add(new Case(id, level, false, e.getMessage() == null ? e.toString() : e.getMessage())); }
    }
    static void ok(boolean b, String msg) { if (!b) throw new AssertionError(msg); }
    static Map<String, Object> M(Object... kv) { return AxpHost.map(kv); }

    public static void main(String[] args) throws Exception {
        File fix = new File(args.length > 0 ? args[0] : "../axp-spec/axp/test/fixtures").getAbsoluteFile();
        File home = new File(System.getProperty("java.io.tmpdir"), "axp-java-conf-" + System.currentTimeMillis());
        final AxpHost h = new AxpHost(home, new NashornRunner());
        System.out.println("fixtures = " + fix + "\nhost = " + home + "\n");

        c("C01", "AXP-0", () -> { Map<String,Object> r = h.install(new File(fix,"01-hello"), true); ok(Boolean.TRUE.equals(r.get("ok")), "install: " + r); ok(((List<?>)r.get("steps")).size() >= 8, "steps"); });
        c("C02", "AXP-0", () -> {
            File d = badHello(fix, m -> m.put("unknownTop", 1));
            ok(AxpHost.validate(d).contains("SCHEMA_ADDITIONAL_PROPERTY"), "SCHEMA_ADDITIONAL_PROPERTY");
        });
        c("C03", "AXP-0", () -> {
            File d = badHello(fix, m -> {});
            new File(d, "tools/ghost.js").getParentFile().mkdirs();
            java.nio.file.Files.write(new File(d, "tools/ghost.js").toPath(), "export function run(){}".getBytes());
            ok(AxpHost.validate(d).contains("UNDECLARED_EXECUTABLE"), "UNDECLARED_EXECUTABLE");
        });
        c("C04", "AXP-0", () -> {
            File d = badHello(fix, m -> { Map<String,Object> t = Json.obj(Json.arr(m.get("tools")).get(0)); t.put("sideEffects","destructive"); t.remove("confirm"); });
            ok(AxpHost.validate(d).contains("TOOL_CONFIRM_REQUIRED"), "TOOL_CONFIRM_REQUIRED");
        });
        c("C05", "AXP-0", () -> {
            Map<String,Object> r = h.invoke("com.example.hello", "demo.echo", M("text","hi"), false);
            ok(Boolean.TRUE.equals(r.get("ok")), "invoke: " + r);
            ok("hi".equals(Json.str(Json.obj(r.get("result")).get("text"))), "echo result");
            ok(new File(home, "audit.jsonl").exists(), "audit");
        });
        c("C06", "AXP-0", () -> {
            h.install(new File(fix,"02-ui-panel"), true);
            Map<String,Object> a = h.invoke("com.example.panel", "screen.tap", M("x",1,"y",2), false);
            ok("CONFIRM_REQUIRED".equals(Json.str(a.get("error"))), "confirm gate: " + a);
            Map<String,Object> b = h.invoke("com.example.panel", "screen.tap", M("x",1,"y",2), true);
            ok(Boolean.TRUE.equals(b.get("ok")), "confirmed invoke: " + b);
        });
        c("C07", "AXP-0", () -> {
            try { h.install(new File(fix,"01-hello"), true); throw new AssertionError("duplicate accepted"); }
            catch (AxpHost.Err e) { ok("INSTALL_ALREADY_PRESENT".equals(e.code), e.code); }
        });
        c("C08", "AXP-0", () -> {
            int n = Json.arr(h.agentTools().get("tools")).size();
            h.setEnabled("com.example.hello", false);
            ok(Json.arr(h.agentTools().get("tools")).size() == n - 1, "disable");
            h.setEnabled("com.example.hello", true);
            ok(Json.arr(h.agentTools().get("tools")).size() == n, "enable");
        });
        c("C09", "AXP-1", () -> {
            Map<String,Object> r = h.install(new File(fix,"05-memory-system"), true);
            ok(Boolean.TRUE.equals(r.get("ok")), "install memory: " + r);
            Map<String,Object> a = h.invoke("com.example.memory", "memory.add", M("text","第一条记忆"), false);
            ok(Boolean.TRUE.equals(a.get("ok")), "memory.add: " + a);
            Map<String,Object> u = h.ui("com.example.memory");
            ok(Json.arr(Json.obj(u.get("bindings")).get("list")).size() == 1, "bind snapshot");
        });
        c("C10", "AXP-1", () -> {
            File d = badPanel(fix, m -> { Map<String,Object> s = Json.obj(Json.arr(m.get("surfaces")).get(0)); s.put("watchable", false); });
            ok(AxpHost.validate(d).contains("SURFACE_NOT_WATCHABLE"), "SURFACE_NOT_WATCHABLE: " + AxpHost.validate(d));
        });
        c("C11", "AXP-1", () -> {
            h.install(new File(fix,"03-hot-reload"), true);
            ok(Json.arr(h.agentTools().get("knowledge")).size() > 0, "knowledge projected");
        });
        c("C12", "AXP-1", () -> {
            ok(AxpHost.satisfies("1.2.3", "^1.0.0"), "caret");
            ok(!AxpHost.satisfies("2.0.0", "^1.0.0"), "caret upper");
            ok(AxpHost.satisfies("1.2.9", "~1.2.3"), "tilde");
        });
        c("C13", "AXP-1", () -> {
            File d = badHello(fix, m -> { m.put("id", "com.example.needs"); m.put("requires", Arrays.asList(M("id","com.missing.dep","range",">=1.0.0"))); });
            try { h.install(d, true); throw new AssertionError("missing dep accepted"); }
            catch (AxpHost.Err e) { ok("INSTALL_DEPENDENCY_MISSING".equals(e.code), e.code); }
        });
        c("C14", "AXP-1", () -> ok(new File(home, "inbox/com.example.memory.install-intent.json").exists(), "intent"));
        c("C15", "AXP-2", () -> {
            File d = badPanel(fix, m -> { Map<String,Object> a = Json.obj(Json.arr(Json.obj(m.get("ui")).get("actions")).get(0)); a.put("tool","ghost.tool"); });
            ok(AxpHost.validate(d).contains("UI_ACTION_TOOL_MISSING"), "UI_ACTION_TOOL_MISSING");
        });
        c("C16", "AXP-2", () -> {
            File d = badPanel(fix, m -> { Map<String,Object> b = Json.obj(Json.arr(Json.obj(m.get("ui")).get("bind")).get(0)); b.put("to","ui.panel.nope"); });
            ok(AxpHost.validate(d).contains("UI_BIND_TARGET_MISSING"), "UI_BIND_TARGET_MISSING");
        });
        c("C17", "AXP-2", () -> {
            Map<String,Object> u1 = h.ui("com.example.memory");
            ok(Json.arr(Json.obj(u1.get("panel")).get("nodes")).size() > 0, "panel nodes");
            h.invoke("com.example.memory", "memory.add", M("text","第二条记忆"), false);
            Map<String,Object> u2 = h.ui("com.example.memory");
            ok(Json.arr(Json.obj(u2.get("bindings")).get("list")).size() == 2, "bind auto refresh");
        });
        c("C18", "AXP-2", () -> {
            Map<String,Object> u = h.ui("com.example.memory");
            String tool = null;
            for (Object a : Json.arr(u.get("actions"))) if ("ui.panel.add".equals(Json.str(Json.obj(a).get("id")))) tool = Json.str(Json.obj(a).get("tool"));
            ok("memory.add".equals(tool), "ui action mapped");
            ok(Boolean.TRUE.equals(h.invoke("com.example.memory", tool, M("text","via-ui"), false).get("ok")), "action invoke");
        });
        c("C19", "AXP-2", () -> {
            List<Object> ts = Json.arr(h.agentTools().get("tools"));
            java.util.Set<String> names = new java.util.HashSet<>();
            for (Object t : ts) {
                Map<String,Object> x = Json.obj(t);
                ok(names.add(Json.str(x.get("name"))), "duplicate name");
                ok(x.containsKey("cost") && x.containsKey("sideEffects") && x.containsKey("available"), "fields");
            }
        });
        c("C20", "AXP-2", () -> {
            File d = badHello(fix, m -> { m.put("id","com.example.nostore"); Map<String,Object> c = Json.obj(m.get("capabilities")); c.put("runtimeServices", Arrays.asList("storage")); Map<String,Object> t = Json.obj(Json.arr(m.get("tools")).get(0)); t.put("id","store.put"); });
            java.nio.file.Files.write(new File(d, "tools/hello.js").toPath(), "export function run(a, ctx) { ctx.storage.put('k', a.text); return {saved:true}; }".getBytes());
            h.install(d, true);
            Map<String,Object> r = h.invoke("com.example.nostore", "store.put", M("text","x"), false);
            ok("STORAGE_DENIED".equals(Json.str(r.get("error"))), "STORAGE_DENIED: " + r);
        });
        c("C21", "AXP-3", () -> {
            File d = new File(fix, "03-hot-reload");
            Map<String, Object> m = AxpHost.manifest(d);
            boolean gradient = false;
            for (Object t : Json.arr(m.get("tools"))) if (Json.obj(t).get("gradient") != null) gradient = true;
            ok(gradient, "gradient declared in fixture");
            ok("L3".equals(Json.str(Json.obj(m.get("capabilities")).get("privilege"))), "privilege L3");
        });
        c("C22", "AXP-3", () -> {
            File d = new File(System.getProperty("java.io.tmpdir"), "axp-grad-" + System.currentTimeMillis());
            copy(new File(fix,"03-hot-reload"), d);
            Map<String,Object> m = AxpHost.manifest(d); Map<String,Object> c = Json.obj(m.get("capabilities")); c.put("privilege","L2");
            AxpHost.write(new File(d,"axp.json"), m);
            ok(AxpHost.validate(d).contains("GRADIENT_EXCEEDS_PRIVILEGE"), "GRADIENT_EXCEEDS_PRIVILEGE: " + AxpHost.validate(d));
        });
        c("C23", "AXP-3", () -> {
            List<String> e = AxpHost.validate(new File(fix,"03-hot-reload"));
            ok(e.isEmpty(), "hotReload config valid: " + e);
        });
        c("C24", "AXP-3", () -> ok(AxpHost.digestDir(new File(fix,"01-hello")).length() == 64, "sha256 hex"));
        c("C25", "AXP-3", () -> ok(AxpHost.satisfies("1.0.0", ">=1.0.0 <2.0.0"), "AND range"));
        c("C26", "AXP-3", () -> {
            // spec/12 C26 = INSTALL_REVOKED：吊销清单命中 → 拒绝安装（Node 侧同表）
            String pub = "sha256:" + new String(new char[64]).replace('\0', '0');
            File idx = new File(home, "index.json");
            AxpHost.write(idx, java.util.Collections.singletonMap("revoked",
                Arrays.asList(M("publisher", pub, "reason", "test", "since", "2026-11-20"))));
            Map<String, Object> item = M("id", "com.example.hello", "version", "1.0.0", "publisher", pub,
                "sha256", "0", "source", "plugins/com.example.hello");
            try { h.install(new File(fix, "01-hello"), true, idx, item); throw new AssertionError("revoked publisher accepted"); }
            catch (AxpHost.Err e) { ok("INSTALL_REVOKED".equals(e.code), e.code); }
            // 卸载清理（原 C26 冒烟）：结果必须为 ok:true
            ok(Boolean.TRUE.equals(h.uninstall("com.example.nostore").get("ok")), "uninstall result must be ok:true");
        });

        int passed = 0;
        StringBuilder out = new StringBuilder("{\n  \"suite\": \"axp-conformance/1.0\",\n  \"runtime\": \"jvm-core\",\n  \"hostLevel\": \"AXP-2\",\n  \"cases\": [\n");
        for (int i = 0; i < cases.size(); i++) {
            Case x = cases.get(i);
            if (x.ok) passed++;
            out.append("    {\"id\":\"").append(x.id).append("\",\"level\":\"").append(x.level)
               .append("\",\"ok\":").append(x.ok).append(",\"detail\":\"")
               .append(x.detail.replace("\"", "'").replace("\n", " ")).append("\"}")
               .append(i + 1 < cases.size() ? "," : "").append("\n");
        }
        out.append("  ],\n  \"passed\": ").append(passed).append(",\n  \"failed\": ").append(cases.size() - passed).append("\n}");
        System.out.println(out);
        if (passed != cases.size()) throw new AssertionError(passed + "/" + cases.size() + " conformance cases passed");
    }

    interface Mut { void apply(Map<String,Object> m); }
    static File badHello(File fix, Mut mu) throws Exception {
        File d = new File(System.getProperty("java.io.tmpdir"), "axp-bh-" + System.currentTimeMillis() + "-" + (int)(Math.random()*10000));
        copy(new File(fix, "01-hello"), d);
        Map<String,Object> m = AxpHost.manifest(d); mu.apply(m); AxpHost.write(new File(d,"axp.json"), m);
        return d;
    }
    static File badPanel(File fix, Mut mu) throws Exception {
        File d = new File(System.getProperty("java.io.tmpdir"), "axp-bp-" + System.currentTimeMillis() + "-" + (int)(Math.random()*10000));
        copy(new File(fix, "02-ui-panel"), d);
        Map<String,Object> m = AxpHost.manifest(d); mu.apply(m); AxpHost.write(new File(d,"axp.json"), m);
        return d;
    }
    static void copy(File s, File d) throws Exception { AxpHost.copyTree(s, d); }
}
