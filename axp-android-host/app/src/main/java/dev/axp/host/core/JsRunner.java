package dev.axp.host.core;

/** 实现体执行接口：JVM 用 Nashorn，Android 用 WebView（同一契约）。 */
public interface JsRunner {
    /** 宿主回调，供插件 JS 的 ctx 使用；所有值以 JSON 字符串交换。 */
    interface HostContext {
        String storageGet(String key);
        boolean storagePut(String key, String valueJson);
        boolean storageRemove(String key);
        String storageList();
        boolean surfacePublish(String uri, String valueJson);
        String surfaceRead(String uri);
        void audit(String eventJson);
        void uiPush(String node, String valueJson);
    }

    /** 执行 impl.js 源码（已去掉 export），返回 JSON 字符串。entry 为命名入口（#fragment），默认 run。 */
    String run(String source, String argsJson, HostContext ctx, String entry) throws Exception;

    /** 兼容旧签名：默认入口 run。 */
    default String run(String source, String argsJson, HostContext ctx) throws Exception {
        return run(source, argsJson, ctx, "run");
    }

    /** 两端共用的 JS 包装：把 Java HostContext 映射成 spec/11 的 ctx；entry 支持 #fragment 命名入口。 */
    static String wrapper(String source, String argsJson, String entry) {
        String src = source.replaceAll("(?m)^\\s*export\\s+", "");
        String fn = (entry == null || entry.isEmpty()) ? "run" : entry;
        return "var __c = ctx;"
             + "var __axp = {"
             + " storage: {"
             + "  get: function(k){ var s=__c.storageGet(k); return (s===null||s===undefined)?null:JSON.parse(s); },"
             + "  put: function(k,v){ return __c.storagePut(k, JSON.stringify(v)); },"
             + "  list: function(){ return JSON.parse(__c.storageList()); },"
             + "  remove: function(k){ return __c.storageRemove(k); } },"
             + " surface: {"
             + "  publish: function(u,v){ return __c.surfacePublish(u, JSON.stringify(v)); },"
             + "  read: function(u){ var s=__c.surfaceRead(u); return (s===null||s===undefined)?null:JSON.parse(s); } },"
             + " audit: { log: function(e){ __c.audit(JSON.stringify(e)); } },"
             + " ui: { push: function(n,v){ __c.uiPush(n, JSON.stringify(v)); } },"
             + " confirm: true };"
             + "var __args = JSON.parse(" + Json.stringify(argsJson) + ");"
             + "JSON.stringify((function(){ " + src + "\n;"
             + " return (typeof " + fn + " === 'function') ? " + fn + "(__args, __axp) : null; })());";
    }

    /** 兼容旧签名：默认入口 run。 */
    static String wrapper(String source, String argsJson) {
        return wrapper(source, argsJson, "run");
    }
}
