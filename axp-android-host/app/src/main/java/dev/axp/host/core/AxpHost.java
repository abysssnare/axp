package dev.axp.host.core;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipInputStream;

/**
 * AXP 宿主核心（纯 Java，零第三方依赖）。
 * JVM（conformance）与 Android（app）共用同一份实现；对应 spec/10 §3、spec/11 §2-§5。
 * 声明等级：AXP-2（热加载 / 生产验签见 README 未实现项）。
 */
public final class AxpHost {
    public static final class Err extends RuntimeException {
        public final String code;
        public Err(String code, String msg) { super(msg); this.code = code; }
    }
    private static final Set<String> EXEC_EXT = new HashSet<>(Arrays.asList(".js", ".dex", ".so", ".wasm", ".html"));
    private static final Set<String> TOP_KEYS = new HashSet<>(Arrays.asList(
        "axp", "id", "name", "version", "description", "minHost", "minAndroid", "abis", "requires",
        "entry", "tools", "surfaces", "knowledge", "agents", "events", "ui", "hotReload",
        "capabilities", "instances", "runtime", "distribution"));
    private static final Set<String> EXACT_REQ = new HashSet<>(Arrays.asList(
        "accessibility.read", "accessibility.gestures", "accessibility.takeScreenshot", "accessibility.windowChange",
        "shizuku.binder", "root.su", "system.inject", "notification.listen", "notification.post",
        "clipboard.read", "clipboard.write", "sensor.gps", "sensor.motion", "sensor.biometric", "sensor.light",
        "telephony.sms.read", "telephony.state", "intent.send", "intent.receive", "pm.list", "pm.install",
        "logcat.read", "sysprop.read", "media.capture", "net.stat", "foreground.service"));
    private static final List<String> PRIVS = Arrays.asList("L0", "L1", "L2", "L3", "L4", "L5");
    private static final List<String> IMPL_ORDER = Arrays.asList("native", "kotlin", "wasm", "bin", "js", "proc", "url");

    private final File root;
    private final JsRunner js;
    private final File regFile;

    public AxpHost(File root, JsRunner js) {
        this.root = root.getAbsoluteFile();
        this.js = js;
        this.regFile = new File(root, "registry.json");
        for (String d : new String[]{"plugins", "storage", "surfaces", "inbox"}) new File(root, d).mkdirs();
        if (!regFile.exists()) write(regFile, map("axpRegistry", "1.0", "hostLevel", "AXP-2", "plugins", new ArrayList<Object>()));
    }

    public File root() { return root; }

    /* ---------------- 基础工具 ---------------- */
    public static Map<String, Object> map(Object... kv) {
        LinkedHashMap<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) m.put(String.valueOf(kv[i]), kv[i + 1]);
        return m;
    }
    static List<Object> list(Object... v) { return new ArrayList<>(Arrays.asList(v)); }
    static String read(File f) throws IOException {
        byte[] b = new byte[(int) f.length()];
        try (InputStream in = new FileInputStream(f)) { int n = 0, r; while ((r = in.read(b, n, b.length - n)) > 0) n += r; }
        return new String(b, 0, b.length, StandardCharsets.UTF_8);
    }
    static void write(File f, Object o) {
        try { f.getParentFile().mkdirs(); try (FileOutputStream s = new FileOutputStream(f)) { s.write(Json.stringify(o).getBytes(StandardCharsets.UTF_8)); s.write('\n'); } }
        catch (IOException e) { throw new Err("IO_FAILED", e.getMessage()); }
    }
    static Map<String, Object> json(File f) { try { return Json.obj(Json.parse(read(f))); } catch (Exception e) { throw new Err("MANIFEST_PARSE", e.getMessage()); } }
    public static String sha(byte[] b) {
        try { byte[] d = MessageDigest.getInstance("SHA-256").digest(b); StringBuilder s = new StringBuilder(); for (byte x : d) s.append(String.format("%02x", x & 255)); return s.toString(); }
        catch (Exception e) { throw new Err("DIGEST_FAILED", e.getMessage()); }
    }
    static String sha(File f) { return sha(readSafe(f)); }
    public static String readSafeText(File f) { try { return read(f); } catch (IOException e) { return ""; } }
    static byte[] readSafe(File f) { try { return read(f).getBytes(StandardCharsets.UTF_8); } catch (IOException e) { return new byte[0]; } }
    static String hex(byte[] b) { StringBuilder s = new StringBuilder(); for (byte x : b) s.append(String.format("%02x", x & 255)); return s.toString(); }

    static void copyTree(File src, File dst) throws IOException {
        if (src.isDirectory()) {
            dst.mkdirs();
            File[] ch = src.listFiles(); if (ch == null) return;
            for (File c : ch) copyTree(c, new File(dst, c.getName()));
        } else {
            dst.getParentFile().mkdirs();
            try (InputStream in = new FileInputStream(src); FileOutputStream out = new FileOutputStream(dst)) {
                byte[] buf = new byte[8192]; int n; while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
        }
    }
    static void deleteTree(File f) {
        if (!f.exists()) return;
        if (f.isDirectory()) { File[] ch = f.listFiles(); if (ch != null) for (File c : ch) deleteTree(c); }
        f.delete();
    }
    static Map<String, Object> manifest(File dir) { return json(new File(dir, "axp.json")); }

    /** 规范化摘要：排除 META-INF/AXP-* 签名块，按路径排序 */
    public static String digestDir(File dir) {
        List<String> files = new ArrayList<>();
        walk(dir, dir, files);
        java.util.Collections.sort(files);
        StringBuilder h = new StringBuilder();
        for (String f : files) {
            if (f.startsWith("META-INF/AXP-")) continue;
            h.append(f).append('\n').append(sha(new File(dir, f))).append('\n');
        }
        return sha(h.toString().getBytes(StandardCharsets.UTF_8));
    }
    static void walk(File d, File base, List<String> out) {
        File[] ch = d.listFiles(); if (ch == null) return;
        for (File f : ch) {
            String rel = base.toPath().relativize(f.toPath()).toString().replace(File.separatorChar, '/');
            if (f.isDirectory()) walk(f, base, out); else out.add(rel);
        }
    }

    /* ---------------- 校验器（与 Node validator 同一错误码） ---------------- */
    /** 类型不匹配时报 SCHEMA_TYPE（与 Node 校验器同码），而不是抛 IllegalArgumentException */
    static Map<String, Object> objOr(Object o, List<String> err) {
        try { return Json.obj(o); } catch (IllegalArgumentException e) { err.add("SCHEMA_TYPE"); return new LinkedHashMap<>(); }
    }
    /** 数组字段类型不匹配同样报 SCHEMA_TYPE（null / 缺省视为空数组，不算错误） */
    static List<Object> arrOr(Object o, List<String> err) {
        if (o == null) return new ArrayList<>();
        if (o instanceof List) return Json.arr(o);
        err.add("SCHEMA_TYPE"); return new ArrayList<>();
    }

    public static List<String> validate(File dir) {
        List<String> err = new ArrayList<>();
        File mf = new File(dir, "axp.json");
        if (!mf.exists()) { err.add("MANIFEST_MISSING"); return err; }
        Map<String, Object> m;
        try { m = Json.obj(Json.parse(read(mf))); } catch (Exception e) { err.add("MANIFEST_PARSE"); return err; }
        for (String k : m.keySet()) if (!TOP_KEYS.contains(k)) err.add("SCHEMA_ADDITIONAL_PROPERTY");
        for (String k : new String[]{"axp", "id", "name", "version", "minAndroid", "abis", "capabilities", "distribution"})
            if (!m.containsKey(k)) err.add("SCHEMA_REQUIRED");
        String id = Json.str(m.get("id"));
        if (!id.matches("^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$")) err.add("ID_INVALID");
        if (!Json.str(m.get("version")).matches("^\\d+\\.\\d+\\.\\d+(?:[-+][\\w.]+)?$")) err.add("VERSION_INVALID");
        Map<String, Object> dist = m.containsKey("distribution") ? objOr(m.get("distribution"), err) : map();
        String pub = Json.str(dist.get("publisher"));
        if (!pub.matches("^sha256:[0-9a-fA-F]{64}$")) err.add("PUBLISHER_INVALID");

        Set<String> refs = new HashSet<>();
        if (m.get("entry") != null) addRef(refs, Json.str(objOr(m.get("entry"), err).get("js")));
        if (m.get("hotReload") != null && objOr(m.get("hotReload"), err).get("state") != null)
            addRef(refs, Json.str(objOr(objOr(m.get("hotReload"), err).get("state"), err).get("migrate")));
        Map<String, Object> caps = m.containsKey("capabilities") ? objOr(m.get("capabilities"), err) : map();
        int ceiling = PRIVS.indexOf(Json.str(caps.get("privilege")));
        List<String> requests = strings(arrOr(caps.get("requests"), err));
        List<String> dangerous = strings(arrOr(caps.get("dangerous"), err));
        for (String r : requests) {
            boolean ok = EXACT_REQ.contains(r) || r.matches("^network\\.egress:[^*]+$") || r.matches("^fs\\.(read|write):(app|shared|external)$");
            if (!ok) err.add(r.startsWith("network.egress:") ? "CAP_WILDCARD_EGRESS" : "CAP_UNKNOWN_REQUEST");
        }
        for (String d : dangerous) if (!requests.contains(d)) err.add("DANGEROUS_NOT_REQUESTED");

        Set<String> toolIds = new HashSet<>();
        for (Object to : arrOr(m.get("tools"), err)) {
            Map<String, Object> t = objOr(to, err);
            String tid = Json.str(t.get("id")); toolIds.add(tid);
            if ("destructive".equals(Json.str(t.get("sideEffects"))) && !Json.bool(t.get("confirm"), false)) err.add("TOOL_CONFIRM_REQUIRED");
            collectImpl(t.get("impl"), refs);
            for (String k : new String[]{"input", "output"}) {
                Object sch = t.get(k);
                if (sch != null && objOr(sch, err).containsKey("$ref")) addRef(refs, Json.str(objOr(sch, err).get("$ref")));
            }
            Object g = t.get("gradient");
            if (g != null) for (Map.Entry<String, Object> e : objOr(g, err).entrySet()) {
                int lv = PRIVS.indexOf(e.getKey());
                if (lv < 0 || lv > ceiling) err.add("GRADIENT_EXCEEDS_PRIVILEGE");
                collectImpl(objOr(e.getValue(), err).get("impl"), refs);
            }
        }
        for (Object ao : arrOr(m.get("agents"), err)) {
            Map<String, Object> a = objOr(ao, err);
            int lv = PRIVS.indexOf(Json.str(a.get("privilege")));
            if (a.containsKey("privilege") && lv > ceiling) err.add("AGENT_EXCEEDS_PRIVILEGE");
            addRef(refs, Json.str(a.get("prompt")));
        }
        for (Object so : arrOr(m.get("surfaces"), err)) collectImpl(objOr(so, err).get("impl"), refs);
        for (Object ko : arrOr(m.get("knowledge"), err)) addRef(refs, Json.str(objOr(ko, err).get("entry")));
        for (Object eo : arrOr(m.get("events"), err)) collectImpl(objOr(eo, err).get("run"), refs);
        Object ui = m.get("ui");
        Map<String, Object> u = ui == null ? map() : objOr(ui, err);
        if (ui != null) {
            for (String slot : new String[]{"panel", "widget", "web", "activity"})
                if (u.get(slot) != null) addRef(refs, Json.str(objOr(u.get(slot), err).get("entry")));
            if (u.get("lifecycle") != null) for (String cb : new String[]{"onLoad", "onReload", "onUnload"}) addRef(refs, Json.str(objOr(u.get("lifecycle"), err).get(cb)));
            for (Object io : arrOr(u.get("inject"), err)) addRef(refs, Json.str(objOr(io, err).get("run")));
        }

        // 引用完整性
        List<String> all = new ArrayList<>(); walk(dir, dir, all);
        for (String r : refs) {
            if (r.isEmpty()) continue;
            if (r.contains("..") || r.startsWith("/") || new File(r).isAbsolute() || r.startsWith("http")) err.add("UNSAFE_PATH");
            else if (!new File(dir, r).exists()) err.add("IMPL_FILE_MISSING");
        }
        for (String f : all) {
            String ext = f.substring(f.lastIndexOf('.') >= 0 ? f.lastIndexOf('.') : f.length()).toLowerCase();
            if (EXEC_EXT.contains(ext) && !refs.contains(f)) err.add("UNDECLARED_EXECUTABLE");
        }
        boolean hasBin = false;
        for (String f : all) if (f.endsWith(".so") || f.endsWith(".dex")) hasBin = true;
        if (hasBin && arrOr(m.get("abis"), err).isEmpty()) err.add("ABI_MISSING");

        // UI 引用
        Map<String, Object> surfaceMap = new LinkedHashMap<>();
        for (Object so : arrOr(m.get("surfaces"), err)) { Map<String, Object> s = objOr(so, err); surfaceMap.put(Json.str(s.get("uri")), s); }
        Set<String> panelNodes = new HashSet<>();
        if (u.get("panel") != null) {
            File pf = new File(dir, Json.str(objOr(u.get("panel"), err).get("entry")));
            if (!insidePackage(dir, pf)) err.add("UNSAFE_PATH");                 // panel entry 必须在包根内（规范化路径检查）
            if (pf.exists()) collectNodeIds(json(pf).get("nodes"), panelNodes, err);  // 递归索引：内联 children 里的 id 一并收录
        }
        for (Object bo : arrOr(u.get("bind"), err)) {
            Map<String, Object> b = objOr(bo, err);
            @SuppressWarnings("unchecked") Map<String, Object> s = (Map<String, Object>) surfaceMap.get(Json.str(b.get("from")));
            if (s == null) err.add("SURFACE_UNDECLARED");                       // 与 Node 校验器同码：bind 源必须在本包 surfaces[] 声明
            else if (!Json.bool(s.get("watchable"), false)) err.add("SURFACE_NOT_WATCHABLE");
            String[] parts = Json.str(b.get("to")).split("\\.");
            if (!panelNodes.isEmpty() && (parts.length < 3 || !panelNodes.contains(parts[2]))) err.add("UI_BIND_TARGET_MISSING");
        }
        for (Object ao : arrOr(u.get("actions"), err)) if (!toolIds.contains(Json.str(objOr(ao, err).get("tool")))) err.add("UI_ACTION_TOOL_MISSING");
        for (Object eo : arrOr(m.get("events"), err)) {
            Map<String, Object> e = objOr(eo, err);
            @SuppressWarnings("unchecked") Map<String, Object> s = (Map<String, Object>) surfaceMap.get(Json.str(e.get("on")));
            if (s != null && !Json.bool(s.get("watchable"), false)) err.add("SURFACE_NOT_WATCHABLE");
        }
        Object hr = m.get("hotReload");
        if (hr != null && Json.bool(objOr(hr, err).get("enabled"), false)) {
            Map<String, Object> h = objOr(hr, err);
            if (!"on-every-load".equals(Json.str(h.get("signature")))) err.add("HOT_SIGNATURE_POLICY");
            if (!"isolated".equals(Json.str(h.get("classloader")))) err.add("HOT_CLASSLOADER");
            if (arrOr(h.get("targets"), err).isEmpty()) err.add("HOT_NO_TARGETS");
            for (Object s : arrOr(h.get("sources"), err)) if ("network-unsigned".equals(Json.str(s))) err.add("HOT_UNSIGNED_SOURCE");
        }
        return err;
    }
    static List<Object> arr(Object o) { return o instanceof List ? Json.arr(o) : new ArrayList<Object>(); }
    /** panel 节点 id 递归索引：扁平声明 + children 里的内联对象都算（与渲染遍历一致）；字符串子项是已声明节点的 id 引用，跳过 */
    static void collectNodeIds(Object nodes, Set<String> out, List<String> err) {
        for (Object no : arr(nodes)) {
            if (no instanceof String) continue;
            Map<String, Object> n = objOr(no, err);
            String id = Json.str(n.get("id"));
            if (!id.isEmpty()) out.add(id);
            if (n.get("children") != null) collectNodeIds(n.get("children"), out, err);
        }
    }
    /** 规范化包含性检查：目标文件必须位于包目录内（防 .. / 符号链接逃逸） */
    static boolean insidePackage(File dir, File f) {
        try {
            String d = dir.getCanonicalPath() + File.separator;
            String p = f.getCanonicalPath();
            return p.equals(dir.getCanonicalPath()) || p.startsWith(d);
        } catch (IOException e) { return false; }
    }
    static List<String> strings(Object o) { List<String> r = new ArrayList<>(); for (Object x : arr(o)) r.add(Json.str(x)); return r; }
    static void addRef(Set<String> refs, String p) { if (p != null && !p.isEmpty()) refs.add(p); }
    static void collectImpl(Object impl, Set<String> refs) {
        if (impl == null) return;
        Map<String, Object> i = Json.obj(impl);
        for (String k : new String[]{"js", "kotlin", "native", "wasm", "bin"}) {
            String v = Json.str(i.get(k)); if (!v.isEmpty()) addRef(refs, v.split("#")[0]);
        }
    }

    /* ---------------- 注册表（spec/11 §2） ---------------- */
    public Map<String, Object> registry() { return json(regFile); }
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> plugins() { return (List) arr(registry().get("plugins")); }
    public Map<String, Object> entry(String id) { for (Map<String, Object> p : plugins()) if (id.equals(Json.str(p.get("id")))) return p; return null; }
    void save(Map<String, Object> reg) { write(regFile, reg); }

    public Map<String, Object> install(File srcDir, boolean dev) { return install(srcDir, dev, null, null); }

    /** spec/10 §3：十步安装。indexFile / indexItem 可为 null。 */
    public Map<String, Object> install(File srcDir, boolean dev, File indexFile, Map<String, Object> indexItem) {
        List<String> steps = new ArrayList<>();
        if (!srcDir.exists()) throw new Err("INSTALL_SOURCE_MISSING", srcDir.getPath());
        if (srcDir.isFile() && srcDir.getName().endsWith(".axp")) {
            File t = new File(root, "tmp/unpack-" + System.currentTimeMillis());
            unpack(srcDir, t); srcDir = t;
        }
        steps.add("resolve");
        File sig = new File(srcDir, "META-INF/AXP-SIG.json");
        if (sig.exists()) {
            Map<String, Object> s = json(sig);
            if (!Json.str(s.get("digest")).equals(digestDir(srcDir))) throw new Err("INSTALL_DIGEST_MISMATCH", "digest");
            steps.add("verify-digest");
        } else steps.add("digest-absent-dev");
        List<String> errs = validate(srcDir);
        if (!errs.isEmpty()) throw new Err(errs.get(0), errs.toString());
        Map<String, Object> m = manifest(srcDir);
        steps.add("validate");
        String pub = Json.str(Json.obj(m.get("distribution")).get("publisher"));
        if (sig.exists()) {
            Map<String, Object> s = json(sig);
            if (!pub.equals(Json.str(s.get("publisher")))) throw new Err("INSTALL_PUBLISHER_MISMATCH", "publisher");
            if (!"apk-v3".equals(Json.str(s.get("signatureScheme")))) throw new Err("INSTALL_SIGNATURE_FAILED", "scheme");
            if (!dev && Json.str(s.get("signature")).isEmpty()) throw new Err("INSTALL_SIGNATURE_FAILED", "signature");
            steps.add("verify-signature");
        } else if (!dev) throw new Err("INSTALL_SIGNATURE_FAILED", "AXP-SIG.json missing");
        else steps.add("verify-signature-dev");
        if (indexItem != null) {
            if (!Json.str(indexItem.get("publisher")).equals(pub)) throw new Err("INSTALL_PUBLISHER_MISMATCH", "index");
            steps.add("verify-index");
        }
        if (indexFile != null && indexFile.exists()) {
            // 吊销清单（spec/10 §2）：命中即拒，开发模式同样拒绝
            for (Object ro : arr(json(indexFile).get("revoked"))) {
                Map<String, Object> rv = Json.obj(ro);
                if (pub.equals(Json.str(rv.get("publisher")))) throw new Err("INSTALL_REVOKED", pub);
            }
        }
        Map<String, Object> caps = Json.obj(m.get("capabilities"));
        List<String> confirmList = new ArrayList<>();
        for (String r : strings(caps.get("dangerous"))) confirmList.add(r);
        for (String r : strings(caps.get("requests"))) if (r.matches("^(accessibility|shizuku|root|system).*")) confirmList.add(r);
        steps.add("confirm-list");
        for (Object ro : arr(m.get("requires"))) {
            Map<String, Object> req = Json.obj(ro);
            Map<String, Object> e = entry(Json.str(req.get("id")));
            if (e == null || !Json.bool(e.get("enabled"), false) || !satisfies(Json.str(e.get("version")), Json.str(req.get("range"))))
                throw new Err("INSTALL_DEPENDENCY_MISSING", Json.str(req.get("id")));
        }
        steps.add("resolve-deps");
        String id = Json.str(m.get("id"));
        if (entry(id) != null) throw new Err("INSTALL_ALREADY_PRESENT", id);
        File dest = new File(root, "plugins/" + id);
        deleteTree(dest);
        try { copyTree(srcDir, dest); } catch (IOException e) { throw new Err("IO_FAILED", e.getMessage()); }
        Map<String, Object> reg = registry();
        List<Map<String, Object>> ps = plugins();
        ps.remove(entry(id));
        List<String> tools = new ArrayList<>();
        for (Object t : arr(m.get("tools"))) tools.add(Json.str(Json.obj(t).get("id")));
        Map<String, Object> rec = map("id", id, "version", Json.str(m.get("version")),
            "path", "plugins/" + id, "publisher", pub, "sha256", sha(new File(dest, "axp.json")),
            "enabled", Boolean.TRUE, "installedAt", String.valueOf(System.currentTimeMillis()),
            "privilege", Json.str(caps.get("privilege")), "requests", strings(caps.get("requests")),
            "ui", m.get("ui") != null, "tools", tools);
        ps.add(rec); reg.put("plugins", ps); save(reg);
        steps.add("write-registry");
        write(new File(root, "inbox/" + id + ".install-intent.json"), map(
            "intent", "axp.session-install/1.0", "id", id, "version", Json.str(m.get("version")),
            "source", dest.getPath(), "sha256", rec.get("sha256"), "publisher", pub,
            "requestedPrivilege", caps.get("privilege"), "requests", strings(caps.get("requests")),
            "createdAt", java.time.Instant.now().toString()));
        steps.add("session-install-intent");
        return map("ok", Boolean.TRUE, "id", id, "version", Json.str(m.get("version")), "path", dest.getPath(),
            "privilege", caps.get("privilege"), "tools", tools, "ui", rec.get("ui"), "confirmList", confirmList, "steps", steps);
    }

    static void unpack(File zip, File dest) {
        try (ZipInputStream z = new ZipInputStream(new FileInputStream(zip))) {
            ZipEntry e;
            while ((e = z.getNextEntry()) != null) {
                String n = e.getName();
                if (n.startsWith("/") || n.contains("..")) throw new Err("INSTALL_UNSAFE_ENTRY", n);
                File f = new File(dest, n);
                if (!f.getCanonicalPath().startsWith(dest.getCanonicalPath() + File.separator)) throw new Err("INSTALL_UNSAFE_ENTRY", n);
                if (e.isDirectory()) { f.mkdirs(); continue; }
                f.getParentFile().mkdirs();
                try (FileOutputStream o = new FileOutputStream(f)) { byte[] b = new byte[8192]; int r; while ((r = z.read(b)) > 0) o.write(b, 0, r); }
            }
        } catch (Err x) { throw x; } catch (IOException ex) { throw new Err("INSTALL_UNPACK_FAILED", ex.getMessage()); }
    }

    public Map<String, Object> uninstall(String id) {
        Map<String, Object> e = entry(id); if (e == null) throw new Err("INSTALL_NOT_FOUND", id);
        deleteTree(new File(root, "plugins/" + id));
        Map<String, Object> reg = registry(); List<Map<String, Object>> ps = plugins(); ps.remove(e);
        reg.put("plugins", ps); save(reg); return map("ok", Boolean.TRUE, "id", id);
    }
    public boolean setEnabled(String id, boolean v) {
        Map<String, Object> reg = registry();
        List<Map<String, Object>> ps = new ArrayList<>();
        boolean found = false;
        for (Object o : arr(reg.get("plugins"))) {
            Map<String, Object> e = Json.obj(o);
            if (id.equals(Json.str(e.get("id")))) { e.put("enabled", v); found = true; }
            ps.add(e);
        }
        if (!found) throw new Err("INSTALL_NOT_FOUND", id);
        reg.put("plugins", ps); save(reg); return true;
    }

    /** spec/10 §4：版本区间 */
    public static boolean satisfies(String v, String range) {
        if (range == null || range.isEmpty() || range.equals("*")) return true;
        int[] a = semver(v);
        for (String part : range.trim().split("\\s+")) {
            java.util.regex.Matcher mt = java.util.regex.Pattern.compile("^(\\^|~|>=|<=|>|<|=)?(\\d+)\\.(\\d+)\\.(\\d+)").matcher(part);
            if (!mt.find()) continue;
            String op = mt.group(1) == null ? "=" : mt.group(1);
            int[] b = {Integer.parseInt(mt.group(2)), Integer.parseInt(mt.group(3)), Integer.parseInt(mt.group(4))};
            int c = cmp(a, b);
            if (op.equals("^") && !(c >= 0 && cmp(a, new int[]{b[0] + 1, 0, 0}) < 0)) return false;
            else if (op.equals("~") && !(c >= 0 && cmp(a, new int[]{b[0], b[1] + 1, 0}) < 0)) return false;
            else if (op.equals(">=") && !(c >= 0)) return false;
            else if (op.equals("<=") && !(c <= 0)) return false;
            else if (op.equals(">") && !(c > 0)) return false;
            else if (op.equals("<") && !(c < 0)) return false;
            else if (op.equals("=") && c != 0) return false;
        }
        return true;
    }
    static int[] semver(String v) { java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d+)\\.(\\d+)\\.(\\d+)").matcher(v); return m.find() ? new int[]{Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3))} : new int[]{0, 0, 0}; }
    static int cmp(int[] a, int[] b) { for (int i = 0; i < 3; i++) if (a[i] != b[i]) return a[i] < b[i] ? -1 : 1; return 0; }

    /* ---------------- Agent 可见工具集（spec/11 §3） ---------------- */
    public Map<String, Object> agentTools() {
        List<Object> tools = new ArrayList<>(), knowledge = new ArrayList<>();
        for (Map<String, Object> p : plugins()) {
            if (!Json.bool(p.get("enabled"), false)) continue;
            Map<String, Object> m = manifest(new File(root, Json.str(p.get("path"))));
            for (Object to : arr(m.get("tools"))) {
                Map<String, Object> t = Json.obj(to);
                tools.add(map("name", Json.str(p.get("id")) + "." + Json.str(t.get("id")),
                    "plugin", p.get("id"), "id", t.get("id"), "description", Json.str(t.get("description")),
                    "input", t.get("input") == null ? map("type", "object") : t.get("input"),
                    "cost", Json.str(t.get("cost")).isEmpty() ? "fast" : Json.str(t.get("cost")),
                    "sideEffects", Json.str(t.get("sideEffects")),
                    "confirm", Json.bool(t.get("confirm"), false) || "destructive".equals(Json.str(t.get("sideEffects"))),
                    "privilege", p.get("privilege"), "available", t.get("impl") != null || t.get("gradient") != null));
            }
            for (Object ko : arr(m.get("knowledge"))) {
                Map<String, Object> k = Json.obj(ko);
                knowledge.add(map("plugin", p.get("id"), "id", k.get("id"), "kind", k.get("kind"),
                    "progressive", Json.bool(k.get("progressive"), false), "allowedTools", k.get("allowedTools") == null ? new ArrayList<Object>() : k.get("allowedTools")));
            }
        }
        return map("tools", tools, "knowledge", knowledge);
    }

    /* ---------------- 工具调用（spec/11 §3-§4） ---------------- */
    public Map<String, Object> invoke(String pluginId, String toolId, Map<String, Object> args, boolean confirm) {
        Map<String, Object> p = entry(pluginId);
        if (p == null) throw new Err("TOOL_NOT_FOUND", pluginId);
        if (!Json.bool(p.get("enabled"), false)) throw new Err("PLUGIN_DISABLED", pluginId);
        File dir = new File(root, Json.str(p.get("path")));
        Map<String, Object> m = manifest(dir);
        Map<String, Object> tool = null;
        for (Object to : arr(m.get("tools"))) if (toolId.equals(Json.str(Json.obj(to).get("id")))) tool = Json.obj(to);
        if (tool == null) throw new Err("TOOL_NOT_FOUND", toolId);
        if ((Json.bool(tool.get("confirm"), false) || "destructive".equals(Json.str(tool.get("sideEffects")))) && !confirm)
            return map("ok", Boolean.FALSE, "error", "CONFIRM_REQUIRED", "tool", toolId);
        Map<String, Object> impl = tool.get("impl") == null ? null : Json.obj(tool.get("impl"));
        String layer = null;
        int ceiling = PRIVS.indexOf(Json.str(Json.obj(m.get("capabilities")).get("privilege")));
        if (tool.get("gradient") != null) {
            Map<String, Object> g = Json.obj(tool.get("gradient"));
            for (int i = ceiling; i >= 0; i--) {
                Object br = g.get(PRIVS.get(i));
                if (br != null) { impl = Json.obj(Json.obj(br).get("impl")); layer = PRIVS.get(i); break; }
            }
        }
        String pick = null;
        if (impl != null) for (String k : IMPL_ORDER) if (impl.get(k) != null) { pick = k; break; }
        Ctx ctx = new Ctx(pluginId, m);
        ctx.audit("invoke", map("tool", toolId, "layer", layer, "pick", pick));
        if (!"js".equals(pick)) return map("ok", Boolean.FALSE, "error", "IMPL_UNAVAILABLE", "layer", layer, "pick", pick);
        // js 引用支持 #fragment 命名入口（与 Node 运行时同语义）
        String jsRef = Json.str(impl.get("js"));
        String entryName = jsRef.contains("#") ? jsRef.substring(jsRef.indexOf('#') + 1) : "run";
        String src;
        try { src = read(new File(dir, jsRef.split("#")[0])); } catch (IOException e) { throw new Err("IMPL_FILE_MISSING", e.getMessage()); }
        String res;
        try { res = js.run(src, Json.stringify(args == null ? map() : args), ctx, entryName); }
        catch (Exception e) {
            String msg = String.valueOf(e.getMessage());
            String code = (msg.contains("STORAGE_DENIED") || msg.contains("not declared")) ? "STORAGE_DENIED"
                        : msg.contains("SURFACE_UNDECLARED") ? "SURFACE_UNDECLARED" : "IMPL_ERROR";
            return map("ok", Boolean.FALSE, "error", code, "detail", msg);
        }
        Object parsed;
        try { parsed = Json.parse(res == null ? "null" : res); } catch (Exception e) { parsed = res; }
        ctx.audit("invoke-done", map("tool", toolId, "layer", layer));
        return map("ok", Boolean.TRUE, "plugin", pluginId, "tool", toolId, "layer", layer, "impl", pick, "result", parsed);
    }

    /** 宿主上下文：storage / surface / audit / ui（按 plugin id 隔离） */
    public final class Ctx implements JsRunner.HostContext {
        final String id; final Map<String, Object> m; final File sf; final Set<String> declared = new HashSet<>();
        final boolean canRead, canWrite;
        Ctx(String id, Map<String, Object> m) {
            this.id = id; this.m = m;
            this.sf = new File(root, "storage/" + id + ".json");
            List<String> req = strings(Json.obj(m.get("capabilities")).get("requests"));
            boolean r = false, w = false;
            for (String x : req) { if (x.startsWith("fs.read:")) r = true; if (x.startsWith("fs.write:")) w = true; }
            canRead = r; canWrite = w;
            for (Object s : arr(m.get("surfaces"))) declared.add(Json.str(Json.obj(s).get("uri")));
        }
        Map<String, Object> store() { return sf.exists() ? json(sf) : new LinkedHashMap<String, Object>(); }
        void save(Map<String, Object> s) { write(sf, s); }
        public String storageGet(String k) { if (!canRead) throw new Err("STORAGE_DENIED", "STORAGE_DENIED: fs.read not declared"); Object v = store().get(k); return v == null ? null : Json.stringify(v); }
        public boolean storagePut(String k, String v) { if (!canWrite) throw new Err("STORAGE_DENIED", "STORAGE_DENIED: fs.write not declared"); Map<String, Object> s = store(); try { s.put(k, Json.parse(v)); } catch (Exception e) { s.put(k, v); } save(s); return true; }
        public boolean storageRemove(String k) { if (!canWrite) throw new Err("STORAGE_DENIED", "STORAGE_DENIED: fs.write not declared"); Map<String, Object> s = store(); s.remove(k); save(s); return true; }
        public String storageList() {
            if (!canRead) throw new Err("STORAGE_DENIED", "STORAGE_DENIED: fs.read not declared");
            List<Object> pairs = new ArrayList<>();
            for (Map.Entry<String, Object> e : store().entrySet()) pairs.add(Arrays.asList(e.getKey(), e.getValue()));
            return Json.stringify(pairs);
        }
        File surfaceFile(String uri) { return new File(root, "surfaces/" + id + "/" + Integer.toHexString(uri.hashCode()) + ".json"); }
        public boolean surfacePublish(String uri, String v) {
            if (!declared.contains(uri)) throw new Err("SURFACE_UNDECLARED", "SURFACE_UNDECLARED: " + uri);
            try { write(surfaceFile(uri), map("uri", uri, "value", Json.parse(v), "at", System.currentTimeMillis())); }
            catch (Exception e) { write(surfaceFile(uri), map("uri", uri, "value", v)); }
            fireSurface(uri);
            return true;
        }
        public String surfaceRead(String uri) { File f = surfaceFile(uri); if (!f.exists()) return null; Object v = json(f).get("value"); return v == null ? null : Json.stringify(v); }
        public void audit(String event) { try { File f = new File(root, "audit.jsonl"); try (FileOutputStream o = new FileOutputStream(f, true)) { o.write((System.currentTimeMillis() + " " + id + " " + event + "\n").getBytes(StandardCharsets.UTF_8)); } } catch (IOException ignored) {} }
        public void uiPush(String node, String v) { audit("{kind:ui.push,node:" + node + "}"); }
        void audit(String kind, Map<String, Object> extra) { Map<String, Object> e = map("kind", kind); e.putAll(extra); audit(Json.stringify(e)); }
    }

    /** Surface 变更监听（Android UI 层注册，实现 ui.bind 自动刷新） */
    public interface SurfaceListener { void onDelta(String plugin, String uri); }
    private SurfaceListener listener;
    public void setSurfaceListener(SurfaceListener l) { listener = l; }
    void fireSurface(String uri) { if (listener != null) listener.onDelta(null, uri); }

    /* ---------------- 点开插件 UI（spec/11 §5） ---------------- */
    public Map<String, Object> ui(String pluginId) {
        Map<String, Object> p = entry(pluginId);
        if (p == null) throw new Err("INSTALL_NOT_FOUND", pluginId);
        File dir = new File(root, Json.str(p.get("path")));
        Map<String, Object> m = manifest(dir);
        if (m.get("ui") == null) return map("ok", Boolean.FALSE, "error", "NO_UI", "id", pluginId);
        Map<String, Object> u = Json.obj(m.get("ui"));
        if (u.get("panel") == null) return map("ok", Boolean.FALSE, "error", "NO_UI", "id", pluginId);
        File pf = new File(dir, Json.str(Json.obj(u.get("panel")).get("entry")));
        if (!insidePackage(dir, pf)) throw new Err("UNSAFE_PATH", pf.getPath());
        Map<String, Object> panel = json(pf);
        Map<String, Object> bindings = new LinkedHashMap<>();
        for (Object bo : arr(u.get("bind"))) {
            Map<String, Object> b = Json.obj(bo);
            String[] parts = Json.str(b.get("to")).split("\\.");
            String node = parts.length >= 3 ? parts[2] : "";
            File f = new File(root, "surfaces/" + pluginId + "/" + Integer.toHexString(Json.str(b.get("from")).hashCode()) + ".json");
            bindings.put(node, f.exists() ? json(f).get("value") : null);
        }
        return map("ok", Boolean.TRUE, "id", pluginId, "panel", panel,
            "bindings", bindings, "actions", u.get("actions") == null ? new ArrayList<Object>() : u.get("actions"),
            "lifecycle", u.get("lifecycle") == null ? map() : u.get("lifecycle"));
    }
}
