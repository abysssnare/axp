package dev.axp.host.ui;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import dev.axp.host.AxpApplication;
import dev.axp.host.core.AxpHost;
import dev.axp.host.core.Json;

/**
 * 「点开插件」界面页（spec/11 §5）：把 panel.json 渲染成原生 View，
 * ui.bind 随 Surface delta 自动刷新，ui.actions 回填到本包工具。
 */
public final class PluginActivity extends Activity {
    private String plugin;
    private LinearLayout root;
    private final Map<String, EditText> inputs = new LinkedHashMap<>();
    private final Map<String, TextView> boundViews = new LinkedHashMap<>();
    private Map<String, Object> snapshot;

    private final AxpHost.SurfaceListener onSurface = new AxpHost.SurfaceListener() {
        @Override public void onDelta(String p, String uri) {
            AxpApplication.UI.post(new Runnable() { @Override public void run() { render(); } });
        }
    };

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        plugin = getIntent().getStringExtra("plugin");
        if (plugin == null) { finish(); return; }
        ScrollView sv = new ScrollView(this);
        root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);
        sv.addView(root); setContentView(sv);
        setTitle(plugin);
        AxpApplication.HOST.setSurfaceListener(onSurface);
        render();
    }
    @Override protected void onDestroy() { super.onDestroy(); AxpApplication.HOST.setSurfaceListener(null); }

    private void render() {
        root.removeAllViews(); inputs.clear(); boundViews.clear();
        snapshot = AxpApplication.HOST.ui(plugin);
        if (!Json.bool(snapshot.get("ok"), false)) {
            root.addView(text("该插件没有界面：" + Json.str(snapshot.get("error")))); return;
        }
        Map<String, Object> panel = Json.obj(snapshot.get("panel"));
        String title = Json.str(panel.get("title"));
        if (!title.isEmpty()) { TextView t = text(title); t.setTextSize(20f); root.addView(t); }
        Map<String, Object> bindings = Json.obj(snapshot.get("bindings"));
        for (Object n : Json.arr(panel.get("nodes"))) build(Json.obj(n), bindings);
        TextView hint = text("来自 AXP 插件界面 · ui.bind 自动刷新 · ui.actions 直接调工具");
        hint.setTextSize(12f); root.addView(hint);
    }

    private void build(final Map<String, Object> n, Map<String, Object> bindings) {
        String id = Json.str(n.get("id")), type = Json.str(n.get("type"));
        Map<String, Object> props = n.get("props") == null ? AxpHost.map() : Json.obj(n.get("props"));
        if ("Text".equals(type)) {
            TextView t = text(Json.str(props.get("text")));
            if ("title".equals(Json.str(props.get("style")))) t.setTextSize(18f);
            if (bindings.containsKey(id)) { boundViews.put(id, t); t.setText(format(bindings.get(id))); }
            root.addView(t);
        } else if ("Input".equals(type)) {
            EditText e = new EditText(this); e.setHint(Json.str(props.get("label")));
            inputs.put(id, e); root.addView(e);
        } else if ("Button".equals(type)) {
            Button btn = new Button(this); btn.setText(Json.str(props.get("label")));
            final String action = Json.str(props.get("action"));
            btn.setOnClickListener(new View.OnClickListener() {
                @Override public void onClick(View v) { fire(action); }
            });
            root.addView(btn);
        } else if ("List".equals(type)) {
            TextView t = text(bindings.containsKey(id) ? format(bindings.get(id)) : "（暂无数据）");
            boundViews.put(id, t); root.addView(t);
        } else if ("Column".equals(type) || "Scaffold".equals(type) || "Card".equals(type)) {
            LinearLayout col = new LinearLayout(this); col.setOrientation(LinearLayout.VERTICAL);
            root.addView(col);
            LinearLayout prev = root; root = col;
            for (Object c : Json.arr(n.get("nodes"))) build(Json.obj(c), bindings);
            root = prev;
        } else {
            root.addView(text(type + " · " + Json.str(props.get("text"))));
        }
    }

    private String format(Object v) {
        if (v == null) return "（暂无数据）";
        if (v instanceof List) {
            List<Object> a = Json.arr(v); StringBuilder s = new StringBuilder();
            for (int i = 0; i < a.size(); i++) {
                Object x = a.get(i);
                s.append(i + 1).append(". ");
                if (x instanceof Map) s.append(Json.str(Json.obj(x).get("text"))); else s.append(Json.str(x));
                s.append('\n');
            }
            return s.length() == 0 ? "（空）" : s.toString();
        }
        return Json.stringify(v);
    }

    private void fire(String action) {
        String tool = null;
        for (Object a : Json.arr(snapshot.get("actions"))) {
            Map<String, Object> x = Json.obj(a);
            if (action.equals(Json.str(x.get("id")))) tool = Json.str(x.get("tool"));
        }
        if (tool == null) { Toast.makeText(this, "未绑定动作: " + action, Toast.LENGTH_SHORT).show(); return; }
        final String t = tool;
        Map<String, Object> args = AxpHost.map();
        for (Map.Entry<String, EditText> e : inputs.entrySet()) {
            String key = guessArg(e.getKey());
            args.put(key, e.getValue().getText().toString());
        }
        final Map<String, Object> a = args;
        Map<String, Object> probe = AxpApplication.HOST.invoke(plugin, t, a, false);
        if ("CONFIRM_REQUIRED".equals(Json.str(probe.get("error")))) {
            new AlertDialog.Builder(this).setTitle("需要确认")
                .setMessage("工具 " + t + " 会操作设备，是否继续？")
                .setPositiveButton("继续", (d, w) -> doInvoke(t, a, true))
                .setNegativeButton("取消", null).show();
        } else doInvoke(t, a, false);
    }

    private void doInvoke(String tool, Map<String, Object> args, boolean confirm) {
        try {
            Map<String, Object> r = AxpApplication.HOST.invoke(plugin, tool, args, confirm);
            if (!Json.bool(r.get("ok"), false)) {
                Toast.makeText(this, "调用失败: " + Json.str(r.get("error")), Toast.LENGTH_LONG).show();
            } else {
                AxpApplication.PLATFORM.dispatch(r.get("result"));   // 结构化指令 → 真实系统动作
                render();                                            // ui.bind 刷新
            }
        } catch (Exception e) { Toast.makeText(this, "错误: " + e.getMessage(), Toast.LENGTH_LONG).show(); }
    }

    private String guessArg(String inputId) {
        if (inputId.contains("url")) return "url";
        if (inputId.contains("text") || inputId.contains("input")) return "text";
        if (inputId.contains("q")) return "q";
        return "text";
    }

    private TextView text(String s) { TextView t = new TextView(this); t.setText(s); t.setTextSize(15f); return t; }
}
