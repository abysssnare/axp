package dev.axp.host.platform;

import java.io.File;
import java.util.List;
import java.util.Map;
import dev.axp.host.core.AxpHost;
import dev.axp.host.core.Json;

/**
 * spec/10 §1 / spec/18 §2 验签策略。
 * dev：开发与 CI；strict：生产 —— 本参考宿主未接入 apksig，strict 路径 fail-closed，
 * 任何非空 signature（含 seal 产出的 dev: 标记、自声明 certChain）都不再被
 * 「signature 非空」误判为已验签。生产宿主接 com.android.tools.build:apksig
 * 校验 signature + certChain 后才可放开（见 README）。
 */
public final class SignaturePolicy {
    public static final String DEV = "dev", STRICT = "strict";
    private SignaturePolicy() {}

    public static void verify(File dir, Map<String, Object> manifest, boolean devMode) {
        File sig = new File(dir, "META-INF/AXP-SIG.json");
        String pub = Json.str(Json.obj(manifest.get("distribution")).get("publisher"));
        if (!sig.exists()) {
            if (!devMode) throw new IllegalStateException("INSTALL_SIGNATURE_FAILED: AXP-SIG.json missing");
            return;   // 开发/示例包：仅校验 publisher 格式（由 validator 完成）
        }
        Map<String, Object> s = Json.obj(Json.parse(AxpHost.readSafeText(sig)));
        if (!pub.equals(Json.str(s.get("publisher")))) throw new IllegalStateException("INSTALL_PUBLISHER_MISMATCH");
        if (!"apk-v3".equals(Json.str(s.get("signatureScheme")))) throw new IllegalStateException("INSTALL_SIGNATURE_FAILED: scheme");
        if (devMode) return;
        // 生产路径 fail-closed（spec/18 §2）
        String signature = Json.str(s.get("signature"));
        List<Object> certChain = s.get("certChain") instanceof List ? Json.arr(s.get("certChain")) : java.util.Collections.emptyList();
        if (signature.startsWith("dev:")) throw new IllegalStateException("INSTALL_SIGNATURE_FAILED: dev signature requires --dev");
        if (signature.isEmpty() || certChain.isEmpty()) throw new IllegalStateException("INSTALL_SIGNATURE_FAILED: missing signature / certChain");
        throw new IllegalStateException("INSTALL_SIGNATURE_FAILED: reference host cannot verify apk-v3 signatures; integrate apksig for production");
    }
}
