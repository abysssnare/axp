package dev.axp.host;

import android.app.Application;
import android.os.Handler;
import android.os.Looper;
import java.io.File;
import dev.axp.host.core.AxpHost;
import dev.axp.host.platform.AndroidPlatform;
import dev.axp.host.platform.WebViewJsRunner;

/** 全局宿主：一个 AxpHost + 一个 Android 平台适配 + 一个 WebView JS 引擎。 */
public final class AxpApplication extends Application {
    public static AxpHost HOST;
    public static AndroidPlatform PLATFORM;
    public static WebViewJsRunner JS;
    public static final Handler UI = new Handler(Looper.getMainLooper());

    @Override public void onCreate() {
        super.onCreate();
        File root = new File(getFilesDir(), "axp");
        root.mkdirs();
        JS = new WebViewJsRunner(this);          // WebView 固定在 runner 自有的 js 线程上创建与使用
        PLATFORM = new AndroidPlatform(this);
        HOST = new AxpHost(root, JS);
    }
}
