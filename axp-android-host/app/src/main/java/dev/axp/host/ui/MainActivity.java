package dev.axp.host.ui;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import dev.axp.host.AxpApplication;
import dev.axp.host.core.Json;

/** 插件管理页（spec/11 §2）：列出已装插件、启用状态、权限层、点开 UI 入口。 */
public final class MainActivity extends Activity {
    private ListView list;
    private TextView stat;
    private final List<String> rows = new ArrayList<>();
    private final List<Map<String, Object>> items = new ArrayList<>();

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);
        stat = new TextView(this); stat.setTextSize(15f); root.addView(stat);
        Button install = new Button(this); install.setText("安装 .axp 插件");
        install.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { startActivity(new Intent(MainActivity.this, InstallActivity.class)); }
        });
        root.addView(install);
        list = new ListView(this); root.addView(list, new LinearLayout.LayoutParams(-1, 0, 1f));
        setContentView(root);
        list.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, rows));
        list.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override public void onItemClick(AdapterView<?> p, View v, int pos, long id) {
                Map<String, Object> e = items.get(pos);
                if (Json.bool(e.get("ui"), false)) {
                    Intent i = new Intent(MainActivity.this, PluginActivity.class);
                    i.putExtra("plugin", Json.str(e.get("id")));
                    startActivity(i);
                } else {
                    Toast.makeText(MainActivity.this, "纯功能插件：可在 Agent 工具集中被调用", Toast.LENGTH_LONG).show();
                }
            }
        });
    }

    @Override protected void onResume() {
        super.onResume();
        rows.clear(); items.clear();
        for (Object o : Json.arr(AxpApplication.HOST.registry().get("plugins"))) {
            Map<String, Object> e = Json.obj(o);
            items.add(e);
            rows.add((Json.bool(e.get("enabled"), false) ? "[启用] " : "[停用] ")
                + Json.str(e.get("id")) + "  v" + Json.str(e.get("version"))
                + "  " + Json.str(e.get("privilege")) + (Json.bool(e.get("ui"), false) ? "  · 有界面" : "  · 纯功能"));
        }
        if (rows.isEmpty()) rows.add("还没有插件 —— 点上方按钮安装示例仓里的 .axp");
        ((ArrayAdapter<?>) list.getAdapter()).notifyDataSetChanged();
        int tools = Json.arr(AxpApplication.HOST.agentTools().get("tools")).size();
        stat.setText("已装 " + items.size() + " 个插件 · Agent 可见工具 " + tools + " 个 · 宿主等级 AXP-2");
    }
}
