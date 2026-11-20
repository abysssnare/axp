package dev.axp.host.platform;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;
import java.util.Map;
import dev.axp.host.core.Json;

/**
 * Android 平台能力适配。AXP 是 Android 专属格式，这里是「结构化指令 → 真实系统动作」的落点。
 * 打开网页是真实可用的；L2 读屏/手势、L3 Shizuku 留可插拔接口（见 README 未实现项）。
 */
public final class AndroidPlatform {
    public interface AccessibilityBridge {
        String screenText();
        boolean tap(float x, float y);
    }
    private final Context ctx;
    private AccessibilityBridge a11y;   // 由宿主接入 AccessibilityService 后注入
    public AndroidPlatform(Context c) { this.ctx = c.getApplicationContext(); }
    public void setAccessibility(AccessibilityBridge b) { this.a11y = b; }

    /** 把工具返回的结构化 Intent 指令变成真的系统动作。 */
    public boolean dispatch(Object resultObj) {
        if (!(resultObj instanceof Map)) return false;
        Map<String, Object> r = Json.obj(resultObj);
        String action = Json.str(r.get("action"));
        if ("android.intent.action.VIEW".equals(action) || "browser.open".equals(action)) {
            String uri = Json.str(r.get("uri"));
            if (uri.isEmpty()) uri = Json.str(r.get("url"));
            if (uri.isEmpty()) return false;
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { ctx.startActivity(i); return true; }
            catch (Exception e) { Toast.makeText(ctx, "无法打开: " + uri, Toast.LENGTH_SHORT).show(); return false; }
        }
        if (("tap".equals(action) || "screen.tap".equals(action)) && a11y != null) {
            return a11y.tap((float) num(r.get("x")), (float) num(r.get("y")));
        }
        if (("screen.text".equals(action) || "read_screen".equals(action)) && a11y != null) {
            return true;
        }
        return false;
    }
    public String screenText() { return a11y == null ? "" : a11y.screenText(); }
    private double num(Object o) { return o instanceof Number ? ((Number) o).doubleValue() : 0; }
}
