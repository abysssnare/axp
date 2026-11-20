package dev.axp.host.platform;

import android.content.Context;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import dev.axp.host.core.JsRunner;
import dev.axp.host.core.Json;

/**
 * Android 侧实现体执行器：用系统自带 WebView 的 JS 引擎跑 impl.js。
 * 与 JVM conformance 的 NashornRunner 共用 JsRunner.wrapper()，执行同一份插件源码。
 * 无需 QuickJS / Rhino / 任何第三方依赖。
 */
public final class WebViewJsRunner implements JsRunner {
    /** addJavascriptInterface 只暴露带 @JavascriptInterface 的方法，故做一层转发。 */
    public static final class Bridge {
        private final HostContext c;
        public Bridge(HostContext c) { this.c = c; }
        @JavascriptInterface public String storageGet(String k) { return c.storageGet(k); }
        @JavascriptInterface public boolean storagePut(String k, String v) { return c.storagePut(k, v); }
        @JavascriptInterface public boolean storageRemove(String k) { return c.storageRemove(k); }
        @JavascriptInterface public String storageList() { return c.storageList(); }
        @JavascriptInterface public boolean surfacePublish(String u, String v) { return c.surfacePublish(u, v); }
        @JavascriptInterface public String surfaceRead(String u) { return c.surfaceRead(u); }
        @JavascriptInterface public void audit(String e) { c.audit(e); }
        @JavascriptInterface public void uiPush(String n, String v) { c.uiPush(n, v); }
    }

    private final WebView web;
    public WebViewJsRunner(Context ctx) {
        web = new WebView(ctx.getApplicationContext());
        web.getSettings().setJavaScriptEnabled(true);
    }

    @Override public String run(final String source, final String argsJson, final HostContext ctx) throws Exception {
        final CountDownLatch latch = new CountDownLatch(1);
        final String[] result = new String[1];
        final Exception[] failure = new Exception[1];
        final String script = JsRunner.wrapper(source, argsJson);
        web.post(new Runnable() {
            @Override public void run() {
                web.addJavascriptInterface(new Bridge(ctx), "ctx");
                web.evaluateJavascript(script, new ValueCallback<String>() {
                    @Override public void onReceiveValue(String value) { result[0] = value; latch.countDown(); }
                });
            }
        });
        if (!latch.await(10, TimeUnit.SECONDS)) throw new Exception("JS_TIMEOUT");
        if (failure[0] != null) throw failure[0];
        String v = result[0];
        if (v == null || v.equals("null") || v.equals("undefined")) return "null";
        // evaluateJavascript 会把字符串结果再 JSON-quote 一层
        if (v.startsWith("\"")) { try { v = Json.str(Json.parse(v)); } catch (Exception ignored) {} }
        return v;
    }
}
