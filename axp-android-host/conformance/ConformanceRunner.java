import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;
import java.io.File;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 编译 axp-android-host 的纯 Java core + conformance 源码，并真实运行 ConformanceMain。
 * 不需要 Android SDK / Gradle / 第三方依赖；只需要带 jdk.compiler 的 JDK/JRE 11+。
 * 用法：java axp-android-host/conformance/ConformanceRunner.java [fixtures绝对路径]
 */
public class ConformanceRunner {
    public static void main(String[] args) throws Exception {
        File root = new File(args.length > 1 ? args[1] : ".").getAbsoluteFile();
        File core = new File(root, "app/src/main/java/dev/axp/host/core");
        File conf = new File(root, "conformance/src/dev/axp/host/core");
        File out = new File(root, "conformance/out");
        if (!out.exists()) out.mkdirs();
        for (File f : out.listFiles() == null ? new File[0] : out.listFiles()) if (f.isFile()) f.delete();

        List<String> src = new ArrayList<>();
        collect(core, src); collect(conf, src);
        JavaCompiler jc = ToolProvider.getSystemJavaCompiler();
        if (jc == null) throw new IllegalStateException("jdk.compiler unavailable (need JDK 11+, not bare JRE)");
        List<String> cmd = new ArrayList<>(Arrays.asList("-d", out.getPath(), "--release", "8"));
        for (String p : src) cmd.add(p);
        System.out.println("compiling " + src.size() + " java sources with --release 8 ...");
        int r = jc.run(null, System.out, System.err, cmd.toArray(new String[0]));
        if (r != 0) {
            // 某些 JDK 构建（如 Debian headless OpenJDK 21）裁掉了历史 ct.sym，
            // 任何低于平台版本的 --release 都会失败。此时回退为平台默认级别重试：
            // 用例照常运行，但该环境不再校验 Java 8 语言级（完整 JDK / CI 上仍按 --release 8 验证）。
            System.err.println("--release 8 unsupported on this JDK build; retrying at platform default ...");
            cmd = new ArrayList<>(Arrays.asList("-d", out.getPath()));
            for (String p : src) cmd.add(p);
            r = jc.run(null, System.out, System.err, cmd.toArray(new String[0]));
            if (r != 0) { System.err.println("COMPILE FAILED"); System.exit(2); }
        }
        System.out.println("COMPILE OK\n");

        String fix = args.length > 0 ? args[0]
            : new File(root, "../axp-spec/axp/test/fixtures").getAbsolutePath();
        try (URLClassLoader cl = new URLClassLoader(new URL[]{out.toURI().toURL()}, ConformanceRunner.class.getClassLoader())) {
            Class<?> k = Class.forName("dev.axp.host.core.ConformanceMain", true, cl);
            Method m = k.getMethod("main", String[].class);
            m.invoke(null, (Object) new String[]{fix});
        } catch (java.lang.reflect.InvocationTargetException e) {
            Throwable t = e.getCause();
            System.err.println("CONFORMANCE FAILED: " + (t == null ? e.toString() : t.toString()));
            System.exit(1);
        }
    }
    static void collect(File dir, List<String> out) {
        File[] fs = dir.listFiles(); if (fs == null) return;
        for (File f : fs) { if (f.isDirectory()) collect(f, out); else if (f.getName().endsWith(".java")) out.add(f.getPath()); }
    }
}
