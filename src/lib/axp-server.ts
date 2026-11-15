/**
 * AXP 服务端数据层 —— 从工程根的 axp/ 目录读取真实规范项目内容。
 * 仅在服务端使用（Server Component / API Route）。
 */
import fs from "node:fs";
import path from "node:path";
import { buildTree } from "@/lib/tree";

export { buildTree };

export const AXP_ROOT = path.join(process.cwd(), "axp");

/* ------------------------------ 类型 ------------------------------ */

export interface ExampleCounts {
  tools: number;
  surfaces: number;
  knowledge: number;
  agents: number;
  events: number;
  ui: boolean;
  hotReload: boolean;
}

export interface ExampleData {
  id: string;
  dirName: string;
  name: string;
  nameEn: string;
  version: string;
  description: string;
  privilege: string;
  hostLevel: string;
  tags: string[];
  counts: ExampleCounts;
  manifest: string;
  tree: string[];
}

export interface DocMeta {
  /** 相对于 axp/ 的路径，如 docs/faq.md */
  path: string;
  title: string;
  desc: string;
  group: string;
  lang: "md" | "json";
}

export interface SiteData {
  examples: ExampleData[];
  docs: DocMeta[];
  stats: {
    specFiles: number;
    domains: number;
    privilegeLevels: number;
    componentTypes: number;
    implForms: number;
    examples: number;
    validatorTests: number;
    crossCheck: number;
    runtimeAssertions: number;
    loadingSteps: number;
    hostLevels: number;
  };
}

/* ------------------------------ 工具 ------------------------------ */

function readJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

interface ManifestLike {
  axp?: string;
  id?: string;
  name?: { zh?: string; en?: string };
  version?: string;
  description?: string;
  capabilities?: { privilege?: string };
  tools?: unknown[];
  surfaces?: unknown[];
  knowledge?: unknown[];
  agents?: unknown[];
  events?: unknown[];
  ui?: Record<string, unknown>;
  hotReload?: { enabled?: boolean };
}

/** 递归收集相对文件路径（相对 dir） */
function walkFiles(dir: string, base = dir, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

/* --------------------------- 示例元数据 --------------------------- */

const EXAMPLE_META: Record<string, { tags: string[]; hostLevel: string }> = {
  "01-hello": {
    tags: ["最小插件", "tools[]", "L0 沙箱", "纯声明+脚本"],
    hostLevel: "AXP-0",
  },
  "02-ui-panel": {
    tags: ["ui{}", "数据绑定 bind", "actions 回填", "Surface 订阅", "lifecycle"],
    hostLevel: "AXP-2",
  },
  "03-hot-reload": {
    tags: ["六类组件", "hotReload{}", "gradient 梯度", "UI 重建", "状态迁移"],
    hostLevel: "AXP-3",
  },
  "04-domains": {
    tags: ["13 个标准域", "URI 模板 {}", "anchor / watchable", "多域 ui.bind", "事件双触发源"],
    hostLevel: "AXP-2",
  },
};

function loadExamples(): ExampleData[] {
  const base = path.join(AXP_ROOT, "examples");
  const dirs = fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  return dirs.map((dirName) => {
    const dir = path.join(base, dirName);
    const m = readJson(path.join(dir, "axp.json")) as ManifestLike;
    const files = walkFiles(dir);
    const meta = EXAMPLE_META[dirName] ?? { tags: [], hostLevel: "AXP-0" };
    return {
      id: dirName,
      dirName,
      name: m.name?.zh ?? m.id ?? dirName,
      nameEn: m.name?.en ?? "",
      version: m.version ?? "",
      description: m.description ?? "",
      privilege: m.capabilities?.privilege ?? "L0",
      hostLevel: meta.hostLevel,
      tags: meta.tags,
      counts: {
        tools: (m.tools ?? []).length,
        surfaces: (m.surfaces ?? []).length,
        knowledge: (m.knowledge ?? []).length,
        agents: (m.agents ?? []).length,
        events: (m.events ?? []).length,
        ui: !!m.ui && Object.keys(m.ui).length > 0,
        hotReload: !!m.hotReload?.enabled,
      },
      manifest: JSON.stringify(m, null, 2),
      tree: files,
    };
  });
}

/* --------------------------- 文档库元数据 --------------------------- */

const DOC_META: { path: string; title: string; desc: string; group: string }[] = [
  // 规范正文
  { path: "spec/01-format.md", title: "01 · 格式主规范", desc: "格式定位、包结构、清单 schema、全部组件、装载与校验规则（唯一规范性正文）", group: "规范正文 spec/" },
  { path: "spec/02-manifest.schema.json", title: "02 · 清单 JSON Schema", desc: "axp.json 的完整 JSON Schema（draft 2020-12，机器可读）", group: "规范正文 spec/" },
  { path: "spec/03-impl-reference.md", title: "03 · 统一实现引用 impl", desc: "7 种实现形态与宿主选择算法", group: "规范正文 spec/" },
  { path: "spec/04-capabilities.md", title: "04 · 权限阶梯与能力词汇表", desc: "L0–L5 权限阶梯、requests 完整词汇表、gradient", group: "规范正文 spec/" },
  { path: "spec/05-domains.md", title: "05 · axp:// 标准域", desc: "13 个标准域定义与自定义域注册", group: "规范正文 spec/" },
  { path: "spec/06-ui-vocab.md", title: "06 · UI DSL 节点词汇表", desc: "UI DSL 节点词汇表、数据绑定、动作绑定、生命周期契约", group: "规范正文 spec/" },
  { path: "spec/07-expression-map.md", title: "07 · 表达能力覆盖映射", desc: "逐字段映射与验收方法（外部材料，不属于规范正文）", group: "规范正文 spec/" },
  { path: "spec/08-hot-reload.md", title: "08 · 热加载专章", desc: "状态机、Android 类加载器隔离、验签、回滚", group: "规范正文 spec/" },
  { path: "spec/09-versioning.md", title: "09 · 版本与兼容", desc: "版本语义、兼容策略、schema 演进与弃用", group: "规范正文 spec/" },
  { path: "spec/10-infrastructure.md", title: "10 · 基础设施规范", desc: "工具链 / 零依赖 / 校验一致性 / CI 门禁 / 产物 / 部署 / 发布", group: "规范正文 spec/" },
  { path: "spec/11-conformance.md", title: "11 · 一致性等级与认证", desc: "AXP-0…3 可验证断言、结果文件格式与第三方认证流程", group: "规范正文 spec/" },
  { path: "spec/12-security.md", title: "12 · 安全规范与威胁模型", desc: "信任边界、S1–S12 威胁与缓解、签名密钥、审计最小事件集", group: "规范正文 spec/" },
  { path: "spec/13-registry.md", title: "13 · 索引与分发规范", desc: "axp-index/1.0、三种通道、版本单调、session-install 状态机", group: "规范正文 spec/" },
  { path: "spec/index.json", title: "规范机器可读索引", desc: "文档清单、版本、统计、错误码、断言 ID 的单一事实源", group: "规范正文 spec/" },
  // 教程与指南
  { path: "docs/integration-guide.md", title: "宿主集成教程", desc: "Gradle、Manifest、HostBridge、装载流水线、热加载接入、CI", group: "教程与指南 docs/" },
  { path: "docs/plugin-tutorial.md", title: "插件入门教程", desc: "5 分钟写第一个插件", group: "教程与指南 docs/" },
  { path: "docs/ui-tutorial.md", title: "UI 插件教程", desc: "带界面与数据绑定的插件", group: "教程与指南 docs/" },
  { path: "docs/hot-reload-tutorial.md", title: "热加载教程", desc: "不重启宿主替换 UI / 工具 / 知识", group: "教程与指南 docs/" },
  { path: "docs/domains-tutorial.md", title: "感知域教程（M3）", desc: "13 个 axp:// 标准域、URI 模板、anchor、watchable、事件与多域绑定", group: "教程与指南 docs/" },
  { path: "docs/cli-reference.md", title: "CLI 参考", desc: "axp new / validate / pack / inspect / install", group: "教程与指南 docs/" },
  { path: "docs/host-checklist.md", title: "宿主合规自检表", desc: "宿主 MUST / SHOULD 逐项自检", group: "教程与指南 docs/" },
  { path: "docs/runtime-guide.md", title: "参考运行时指南", desc: "用可运行参考宿主理解规范语义，再搬到 Android", group: "教程与指南 docs/" },
  { path: "docs/doc-templates.md", title: "文档格式模板", desc: "集成教程、插件 README、spec 变更提案模板", group: "教程与指南 docs/" },
  { path: "docs/github-setup.md", title: "开仓库指南", desc: "初始化、OWNER 替换、CI、tag 与 Release", group: "教程与指南 docs/" },
  { path: "docs/faq.md", title: "FAQ", desc: "定位、边界、常见误解", group: "教程与指南 docs/" },
  { path: "docs/deployment.md", title: "部署指南", desc: "standalone / 容器 / 环境变量 / 部署后检查清单", group: "教程与指南 docs/" },
  { path: "docs/release.md", title: "发布流程", desc: "版本号对齐、打包、SHA256SUMS、tag 与 Release", group: "教程与指南 docs/" },
  // 参考实现
  { path: "reference-host/README.md", title: "参考宿主总览", desc: "runtime/（可运行）与 android/（骨架）实现索引", group: "参考实现" },
  { path: "runtime/README.md", title: "Node 参考运行时", desc: "声明 AXP-3 的可运行参考宿主", group: "参考实现" },
  { path: "validator/README.md", title: "离线校验器", desc: "schema + 安全规则 + 引用完整性，含错误码表", group: "参考实现" },
  { path: "conformance/README.md", title: "一致性套件", desc: "第三方宿主提交 AXP-0…3 认证结果的模板与用例骨架", group: "参考实现" },
  // 仓库根
  { path: "README.md", title: "AXP 项目 README", desc: "一句话定位、快速开始、文档索引、仓库自检", group: "仓库根文件" },
  { path: "CHANGELOG.md", title: "Changelog", desc: "规范与工具链变更记录", group: "仓库根文件" },
  { path: "CONTRIBUTING.md", title: "贡献指南", desc: "提交规范、PR 流程、spec 变更提案", group: "仓库根文件" },
];

function loadDocs(): DocMeta[] {
  return DOC_META.filter((d) => fs.existsSync(path.join(AXP_ROOT, d.path))).map((d) => ({
    ...d,
    lang: d.path.endsWith(".json") ? "json" : "md",
  }));
}

/* ------------------------------ 汇总 ------------------------------ */

/**
 * 统计数字的唯一来源：axp/spec/index.json。
 * 规范依据 spec/10-infrastructure.md §2 —— 禁止在站点里再维护第二份数字。
 */
function loadCounts(): SiteData["stats"] {
  const idx = JSON.parse(
    fs.readFileSync(path.join(AXP_ROOT, "spec", "index.json"), "utf8")
  ) as { counts: SiteData["stats"] };
  return idx.counts;
}

export function loadSiteData(): SiteData {
  return {
    examples: loadExamples(),
    docs: loadDocs(),
    stats: loadCounts(),
  };
}

/** 供 API 使用的安全读取：只允许 axp/ 内的文档白名单路径 */
export function readDocContent(relPath: string): string | null {
  const meta = DOC_META.find((d) => d.path === relPath);
  if (!meta) return null;
  const abs = path.join(AXP_ROOT, relPath);
  if (abs !== AXP_ROOT && !abs.startsWith(AXP_ROOT + path.sep)) return null;
  try {
    return fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}
