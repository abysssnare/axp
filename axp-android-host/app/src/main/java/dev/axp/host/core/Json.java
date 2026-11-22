package dev.axp.host.core;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 最小 JSON 解析/序列化：只用 java.*，Android 与 JVM 双端共用。 */
public final class Json {
    private Json() {}

    public static Object parse(String s) {
        P p = new P(s);
        Object v = p.value();
        p.ws();
        if (p.i != s.length()) throw new IllegalArgumentException("JSON trailing data at " + p.i);
        return v;
    }

    public static String stringify(Object o) {
        StringBuilder b = new StringBuilder();
        write(o, b);
        return b.toString();
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> obj(Object o) {
        if (o instanceof Map) return (Map<String, Object>) o;
        throw new IllegalArgumentException("expected object, got " + (o == null ? "null" : o.getClass()));
    }

    @SuppressWarnings("unchecked")
    public static List<Object> arr(Object o) {
        if (o instanceof List) return (List<Object>) o;
        throw new IllegalArgumentException("expected array, got " + (o == null ? "null" : o.getClass()));
    }

    public static String str(Object o) { return o == null ? "" : String.valueOf(o); }
    public static boolean bool(Object o, boolean d) { return o instanceof Boolean ? (Boolean) o : d; }
    public static int num(Object o, int d) { return o instanceof Number ? ((Number) o).intValue() : d; }

    private static void write(Object o, StringBuilder b) {
        if (o == null) { b.append("null"); return; }
        if (o instanceof String) { q((String) o, b); return; }
        if (o instanceof Boolean || o instanceof Number) { b.append(o.toString()); return; }
        if (o instanceof Map) {
            b.append('{'); boolean first = true;
            for (Map.Entry<?, ?> e : ((Map<?, ?>) o).entrySet()) {
                if (!first) b.append(','); first = false;
                q(String.valueOf(e.getKey()), b); b.append(':'); write(e.getValue(), b);
            }
            b.append('}'); return;
        }
        if (o instanceof Iterable) {
            b.append('['); boolean first = true;
            for (Object x : (Iterable<?>) o) { if (!first) b.append(','); first = false; write(x, b); }
            b.append(']'); return;
        }
        q(String.valueOf(o), b);
    }

    private static void q(String s, StringBuilder b) {
        b.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default:
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c);
            }
        }
        b.append('"');
    }

    private static final class P {
        final String s; int i = 0;
        P(String s) { this.s = s; }
        void ws() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }
        Object value() {
            ws();
            if (i >= s.length()) throw new IllegalArgumentException("JSON unexpected end");
            char c = s.charAt(i);
            if (c == '{') return object();
            if (c == '[') return array();
            if (c == '"') return string();
            if (c == 't') { expect("true"); return Boolean.TRUE; }
            if (c == 'f') { expect("false"); return Boolean.FALSE; }
            if (c == 'n') { expect("null"); return null; }
            return number();
        }
        void expect(String w) {
            if (!s.regionMatches(i, w, 0, w.length())) throw new IllegalArgumentException("JSON expected " + w + " at " + i);
            i += w.length();
        }
        Map<String, Object> object() {
            LinkedHashMap<String, Object> m = new LinkedHashMap<>();
            i++; ws();
            if (i < s.length() && s.charAt(i) == '}') { i++; return m; }
            while (true) {
                ws(); String k = string(); ws();
                if (i >= s.length() || s.charAt(i) != ':') throw new IllegalArgumentException("JSON expected : at " + i);
                i++; m.put(k, value()); ws();
                if (i >= s.length()) throw new IllegalArgumentException("JSON unterminated object");
                char c = s.charAt(i++);
                if (c == '}') return m;
                if (c != ',') throw new IllegalArgumentException("JSON expected , at " + (i - 1));
            }
        }
        List<Object> array() {
            ArrayList<Object> a = new ArrayList<>();
            i++; ws();
            if (i < s.length() && s.charAt(i) == ']') { i++; return a; }
            while (true) {
                a.add(value()); ws();
                if (i >= s.length()) throw new IllegalArgumentException("JSON unterminated array");
                char c = s.charAt(i++);
                if (c == ']') return a;
                if (c != ',') throw new IllegalArgumentException("JSON expected , at " + (i - 1));
            }
        }
        String string() {
            if (s.charAt(i) != '"') throw new IllegalArgumentException("JSON expected string at " + i);
            i++; StringBuilder b = new StringBuilder();
            while (i < s.length()) {
                char c = s.charAt(i++);
                if (c == '"') return b.toString();
                if (c == '\\') {
                    if (i >= s.length()) break;
                    char e = s.charAt(i++);
                    switch (e) {
                        case 'n': b.append('\n'); break; case 'r': b.append('\r'); break;
                        case 't': b.append('\t'); break; case 'b': b.append('\b'); break;
                        case 'f': b.append('\f'); break; case '/': b.append('/'); break;
                        case '"': b.append('"'); break; case '\\': b.append('\\'); break;
                        case 'u': b.append((char) Integer.parseInt(s.substring(i, i + 4), 16)); i += 4; break;
                        default: b.append(e);
                    }
                } else b.append(c);
            }
            throw new IllegalArgumentException("JSON unterminated string");
        }
        Object number() {
            int st = i;
            while (i < s.length() && "-+0123456789.eE".indexOf(s.charAt(i)) >= 0) i++;
            String t = s.substring(st, i);
            if (t.isEmpty()) throw new IllegalArgumentException("JSON bad value at " + st);
            if (t.indexOf('.') >= 0 || t.indexOf('e') >= 0 || t.indexOf('E') >= 0) return Double.valueOf(t);
            return Long.valueOf(t);
        }
    }
}
