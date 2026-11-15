/**
 * 签名策略 — spec/01-format.md §9 / §7；08-hot-reload.md §3.3
 * dev: 仅供开发/CI，不校验证书；strict: 生产必须，要求 certFingerprint 与 publisher 相同。
 */
import crypto from 'node:crypto';

export function fingerprintOf(text) {
  return 'sha256:' + crypto.createHash('sha256').update(text).digest('hex');
}

export function checkPublisherFormat(publisher) {
  return typeof publisher === 'string' && /^sha256:[0-9a-fA-F]{64}$/.test(publisher);
}

export class SignaturePolicy {
  constructor(mode = 'dev') {
    if (!['dev', 'strict'].includes(mode)) throw new Error(`unknown signature mode: ${mode}`);
    this.mode = mode;
  }

  /** 安装时验签。bundle 可携带 certFingerprint（strict 必需）。 */
  verifyInstall(manifest, bundle = {}) {
    const pub = manifest?.distribution?.publisher;
    if (!checkPublisherFormat(pub)) return { ok: false, reason: 'PUBLISHER_INVALID' };
    if (this.mode === 'strict') {
      if (!bundle.certFingerprint) return { ok: false, reason: 'CERT_MISSING' };
      if (bundle.certFingerprint !== pub) return { ok: false, reason: 'CERT_MISMATCH' };
      return { ok: true, publisher: pub, mode: 'strict' };
    }
    return { ok: true, publisher: pub, mode: 'dev', warning: 'DEV_MODE_NO_CERT' };
  }

  /**
   * 热加载每次验签：4 条硬检查（spec/08 §3.3）
   * 1 publisher 一致  2 id 不变  3 privilege 不扩大  4 组件 id 集合 ⊆ 旧包
   */
  verifyReplace(oldM, newM, bundle = {}) {
    const oldPub = oldM?.distribution?.publisher;
    const newPub = newM?.distribution?.publisher;
    const PRIV = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 };

    if (oldPub !== newPub) return { ok: false, reason: 'HOT_SIGNATURE_FAILED' };
    if (this.mode === 'strict') {
      if (!bundle.certFingerprint || bundle.certFingerprint !== newPub) {
        return { ok: false, reason: 'HOT_SIGNATURE_FAILED' };
      }
    }
    if (oldM.id !== newM.id) return { ok: false, reason: 'HOT_ID_CHANGED' };
    if ((PRIV[newM.capabilities?.privilege] ?? 0) > (PRIV[oldM.capabilities?.privilege] ?? 0)) {
      return { ok: false, reason: 'HOT_PRIVILEGE_ESCALATION' };
    }
    const oldIds = componentIds(oldM), newIds = componentIds(newM);
    const added = [...newIds].filter(x => !oldIds.has(x));
    if (added.length) return { ok: false, reason: 'HOT_NEW_COMPONENT', added };
    const oldReq = new Set(oldM.capabilities?.requests || []);
    const newReq = (newM.capabilities?.requests || []).filter(r => !oldReq.has(r));
    if (newReq.length) return { ok: false, reason: 'HOT_NEW_REQUEST', added: newReq };
    if (oldM.axp !== newM.axp) return { ok: false, reason: 'HOT_FORMAT_VERSION_CHANGED' };
    return { ok: true, publisher: newPub, mode: this.mode };
  }
}

export function componentIds(m) {
  const s = new Set();
  for (const t of m.tools || []) s.add('tool:' + t.id);
  for (const x of m.surfaces || []) s.add('surface:' + x.uri);
  for (const k of m.knowledge || []) s.add('knowledge:' + k.id);
  for (const a of m.agents || []) s.add('agent:' + a.id);
  for (const e of m.events || []) s.add('event:' + e.on + '|' + (e.filter || ''));
  if (m.ui && Object.keys(m.ui).length) s.add('ui:root');
  return s;
}
