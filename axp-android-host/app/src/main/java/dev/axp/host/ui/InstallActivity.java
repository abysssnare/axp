package dev.axp.host.ui;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Map;
import dev.axp.host.AxpApplication;
import dev.axp.host.core.Json;

/** session-install：SAF 选 .axp → 宿主重新执行解包/摘要/校验/验签/依赖/注册表（不信任 CLI 结论）。 */
public final class InstallActivity extends Activity {
    private static final int REQ = 1001;
    private TextView log;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (16 * getResources().getDisplayMetrics().density); root.setPadding(pad, pad, pad, pad);
        log = new TextView(this); log.setTextSize(15f); log.setText("正在打开文件选择器…");
        root.addView(log); setContentView(root);
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
        startActivityForResult(i, REQ);
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ || res != RESULT_OK || data == null) { finish(); return; }
        Uri uri = data.getData();
        try {
            File tmp = new File(getCacheDir(), "install-" + System.currentTimeMillis() + ".axp");
            try (InputStream in = getContentResolver().openInputStream(uri); FileOutputStream out = new FileOutputStream(tmp)) {
                byte[] buf = new byte[8192]; int n;
                if (in == null) throw new IllegalStateException("无法读取所选文件");
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            Map<String, Object> r = AxpApplication.HOST.install(tmp, true);   // dev：示例包
            StringBuilder s = new StringBuilder("安装成功\n\n");
            s.append("id: ").append(Json.str(r.get("id"))).append('\n')
             .append("version: ").append(Json.str(r.get("version"))).append('\n')
             .append("privilege: ").append(Json.str(r.get("privilege"))).append('\n')
             .append("tools: ").append(Json.stringify(r.get("tools"))).append('\n')
             .append("ui: ").append(r.get("ui")).append('\n');
            Object cl = r.get("confirmList");
            if (cl != null && !Json.arr(cl).isEmpty()) s.append("\n需确认的权限:\n").append(Json.stringify(cl));
            log.setText(s.toString());
            Toast.makeText(this, "已安装，返回列表查看", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            log.setText("安装失败: " + e.getMessage() + "\n\n" + "请确认选择的是 AXP 分发包（.axp）");
        }
    }
}
