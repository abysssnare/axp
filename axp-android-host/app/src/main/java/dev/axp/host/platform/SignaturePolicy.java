package dev.axp.host.platform;

import java.io.File;
import java.util.Map;
import dev.axp.host.core.Json;

/** spec/10 §1 验签策略。dev 已实现；strict 需在生产宿主接 apksig / APK v3 证书链。 */
public final class SignaturePolicy {
    public static final String DEV = "dev", STRICT = "strict";
    private SignaturePolicy() {}

    public static void verify(File dir, Map<String, Object> manifest, boolean dev) {
        File sig = new File(dir, "META-INF/AXP-SIG.json");
        String pub = Json.str(Json.obj(manifest.get("distribution")).get("publisher"));
        if (!sig.exists()) {
            if (!dev) throw new IllegalStateException("INSTALL_SIGNATURE_FAILED: AXP-SIG.json missing");
            return;   // 开发/示例包：仅校验 publisher 格式（由 validator 完成）
        }
        Map<String, Object> s = Json.obj(Json.parse(dev.axp.host.core.AxpHost.readSafeText(sig)));
        if (!pub.equals(Json.str(s.get("publisher")))) throw new IllegalStateException("INSTALL_PUBLISHER_MISMATCH");
        if (!"apk-v3".equals(Json.str(s.get("signatureScheme")))) throw new IllegalStateException("INSTALL_SIGNATURE_FAILED: scheme");
        if (!dev && Json.str(s.get("signature")).isEmpty()) throw new IllegalStateException("INSTALL_SIGNATURE_FAILED: signature");
        // 生产：接入 com.android.tools.build:apksig 校验 signature + certChain（见 README）
    }
}
