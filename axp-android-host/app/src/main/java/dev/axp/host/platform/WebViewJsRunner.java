package dev.axp.host.platform;

import android.content.Context;
import android.os.Handler;
import android.os.HandlerThread;
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
 *
 * 线程模型（修复 UI 线程阻塞死锁）：WebView 固定在自有的 HandlerThread 上
 * 创建与使用 —— 宿主调用（工作线程）阻塞等待结果，UI 线程既不被占用也不被阻塞；
 * 界面刷新由调用方在拿到结果后派发回 UI 线程。run() 不得在 js 线程自身上调用。
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

    private final HandlerThread jsThread;
    private final Handler jsHandler;
    private final WebView web;
    private volatile boolean closed = false;   // destroy 后拒绝新调用，不再等 JS_TIMEOUT

    public WebViewJsRunner(Context ctx) {
        jsThread = new HandlerThread("axp-js-runner");
        jsThread.start();
        jsHandler = new Handler(jsThread.getLooper());
        final Context app = ctx.getApplicationContext();
        final CountDownLatch created = new CountDownLatch(1);
        final WebView[] box = new WebView[1];
        jsHandler.post(new Runnable() {
            @Override public void run() {
                box[0] = new WebView(app);
                box[0].getSettings().setJavaScriptEnabled(true);
                created.countDown();
            }
        });
        try { created.await(5, TimeUnit.SECONDS); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        web = box[0];
        if (web == null) throw new IllegalStateException("WebView creation timed out on js thread");
    }

    /** 宿主不再使用时释放 js 线程；进行中的 run 会因 post 失败/线程退出而尽快失败 */
    public void destroy() {
        closed = true;
        jsHandler.post(new Runnable() { @Override public void run() { web.destroy(); } });
        jsThread.quitSafely();
    }

    @Override public String run(final String source, final String argsJson, final HostContext ctx, final String entry) throws Exception {
        if (closed) throw new IllegalStateException("WebViewJsRunner is destroyed");
        if (web == null) throw new IllegalStateException("runner destroyed");
        if (Thread.currentThread() == jsThread) {
            throw new IllegalStateException("WebViewJsRunner.run must be called from a host worker thread, not the js thread itself");
        }
        final CountDownLatch latch = new CountDownLatch(1);
        final String[] result = new String[1];
        final Throwable[] failure = new Throwable[1];
        final String script = JsRunner.wrapper(source, argsJson, entry);
        Runnable task = new Runnable() {
            @Override public void run() {
                try {
                    web.addJavascriptInterface(new Bridge(ctx), "ctx");
                    web.evaluateJavascript(script, new ValueCallback<String>() {
                        @Override public void onReceiveValue(String value) { result[0] = value; latch.countDown(); }
                    });
                } catch (Throwable t) {
                    // 求值提交失败也要释放等待方，不能让它等到超时
                    failure[0] = t;
                    latch.countDown();
                }
            }
        };
        if (!jsHandler.post(task)) {
            // 线程已退出（destroy 与 run 竞态）：立即失败
            throw new IllegalStateException("js thread is not running (runner destroyed?)");
        }
        if (!latch.await(10, TimeUnit.SECONDS)) throw new Exception("JS_TIMEOUT");
        if (failure[0] != null) throw new Exception("JS_SUBMIT_FAILED: " + failure[0].getMessage());
        String v = result[0];
        if (v == null || v.equals("null") || v.equals("undefined")) return "null";
        // evaluateJavascript 会把字符串结果再 JSON-quote 一层
        if (v.startsWith("\"")) { try { v = Json.str(Json.parse(v)); } catch (Exception ignored) {} }
        return v;
    }
}
