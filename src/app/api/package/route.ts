import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ZipArchive } from 'archiver'
import { PassThrough } from 'stream'
import { CHANGELOG, SPEC_META, SPEC_SECTIONS, type SpecBlock } from '@/lib/axp/spec'

export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/* 规范 → Markdown 渲染                                                  */
/* ------------------------------------------------------------------ */

function blockToMd(b: SpecBlock): string {
  switch (b.kind) {
    case 'subtitle':
      return `### ${b.text}\n`
    case 'para':
      return `${b.text}\n`
    case 'list':
      return `${(b.items ?? []).map((i) => `- ${i}`).join('\n')}\n`
    case 'code':
      return `\`\`\`${b.lang ?? 'ts'}\n${b.code}\n\`\`\`\n`
    case 'note':
      return `> **注**：${b.text}\n`
    case 'table': {
      const { headers, rows } = b.table ?? { headers: [], rows: [] }
      const head = `| ${headers.join(' | ')} |`
      const sep = `| ${headers.map(() => '---').join(' | ')} |`
      const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
      return `${head}\n${sep}\n${body}\n`
    }
    default:
      return ''
  }
}

function specToMarkdown(): string {
  const header = [
    `# AXP ${SPEC_META.fullName}`,
    ``,
    `- **协议版本**：v${SPEC_META.version}（${SPEC_META.status}，${SPEC_META.date}）`,
    `- **维护组织**：${SPEC_META.organization}`,
    `- **许可**：${SPEC_META.license}`,
    ``,
    `---`,
    ``,
    `## 目录`,
    ``,
    ...SPEC_SECTIONS.map((s) => `- [§${s.no} ${s.title}](#${s.id})`),
    ``,
    `---`,
    ``,
  ].join('\n')

  const body = SPEC_SECTIONS.map(
    (s) => `## ${s.no}. ${s.title}\n\n*${s.summary}*\n\n${s.blocks.map(blockToMd).join('\n')}`,
  ).join('\n---\n\n')

  const changelog = [
    `## 附录 A. 版本演进`,
    ``,
    ...CHANGELOG.flatMap((c) => [
      `### v${c.version}（${c.date}，${c.tag}）`,
      ``,
      ...c.items.map((i) => `- ${i}`),
      ``,
    ]),
  ].join('\n')

  return `${header}${body}\n\n${changelog}\n`
}

/* ------------------------------------------------------------------ */
/* SDK README                                                          */
/* ------------------------------------------------------------------ */

function sdkReadme(): string {
  return `# AXP SDK v${SPEC_META.version}

本包包含 AXP（${SPEC_META.fullName}）的三部分交付物：

\`\`\`
axp-sdk-${SPEC_META.version}/
├── SPEC.md                 # 完整规范（11 章 + 附录）
├── kernel/                 # 参考内核实现（TypeScript）
│   ├── types.ts            # 规范契约的类型化投影
│   ├── permissions.ts      # 权限目录与三态裁决
│   ├── event-bus.ts        # 事件总线（审计化）
│   ├── registry.ts         # 注册表 + Kahn 拓扑排序
│   └── kernel.ts           # 内核高层 API
├── plugins/
│   └── axp.core.memory/    # 官方记忆系统插件（agent.memory 参考实现）
│       ├── axp.plugin.json # 插件清单（静态校验样例）
│       └── index.ts        # write / recall / forget / sweep 实现
└── template/               # 插件开发模板
    ├── axp.plugin.json
    └── index.ts
\`\`\`

## 快速开始（宿主接入）

\`\`\`ts
import { install, transition } from './kernel/kernel'

const plugin = await install({
  $schema: 'axp-plugin/1.1',
  id: 'axp.core.memory',
  name: 'Core Memory',
  version: '1.1.0',
  description: '官方记忆系统参考实现',
  engine: '>=1.1.0 <2.0.0',
  entry: './index.js',
  permissions: ['memory:read', 'memory:write', 'memory:forget', 'trigger:emit'],
  provides: [{ point: 'agent.memory', contract: '1.1' }],
}, 'memory')

await transition('axp.core.memory', 'resolve')
await transition('axp.core.memory', 'activate')
\`\`\`

## 快速开始（编写插件）

1. 复制 \`template/\` 为你的插件目录；
2. 修改 \`axp.plugin.json\` 的 id / version / permissions / provides；
3. 实现 \`index.ts\` 导出的 \`activate()\` 与 \`deactivate()\`；
4. 宿主 \`install → resolve → activate\`。

> 完整语义请阅读 SPEC.md。规范与实现的对应关系：
> types.ts ↔ §2-§7；registry.ts ↔ §3-§4-§8；kernel.ts ↔ §5-§9。

---
由 AXP Working Group 生成于参考实现站点。
`
}

const TEMPLATE_MANIFEST = `{
  "$schema": "axp-plugin/1.1",
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "0.1.0",
  "description": "在此填写插件的一句话描述",
  "engine": ">=1.1.0 <2.0.0",
  "entry": "./index.ts",
  "permissions": [],
  "provides": [
    { "point": "agent.tool", "contract": "1.1", "features": [] }
  ],
  "heartbeatMs": 15000,
  "author": { "name": "your-name" },
  "license": "Apache-2.0"
}
`

const TEMPLATE_ENTRY = `/**
 * AXP 插件开发模板（v1.1.0）
 * 生命周期入口：宿主按 §4 调用 activate / deactivate
 */

export interface PluginContext {
  /** 向总线发布 plugin: 前缀自定义主题（需 trigger:emit） */
  emit: (type: string, payload: unknown) => Promise<void>
  /** 读取宿主注入的配置 */
  config: () => Record<string, unknown>
}

export async function activate(ctx: PluginContext): Promise<void> {
  // 激活：注册扩展点实现、订阅主题、启动心跳
  void ctx
}

export async function deactivate(): Promise<void> {
  // 停用：释放资源、取消订阅。幂等：重复调用不得抛错
}
`

const MEMORY_PLUGIN_ENTRY = `/**
 * AXP v1.1.0 — agent.memory 扩展点参考实现（插件侧）
 * 简单记忆系统：write / recall / forget / sweep
 *
 * 数据模型与召回权重见 SPEC.md §10。
 */
export async function activate(ctx) {
  void ctx
  // 真实实现：持久化连接、建表、订阅 axp:health:tick
}

export async function recall(query) {
  // score = relevance + importance*6 + freshness + pinned*30
  const rows = await store.search(query)
  return rows.sort((a, b) => b.score - a.score).slice(0, query.limit ?? 20)
}

export async function write(entry) {
  // 同 scope+key 覆盖更新；发布 axp:memory:written
}

export async function forget(id) {
  // 发布 axp:memory:forgotten（level: warn）
}

export async function sweep() {
  // 淘汰：pinned=false && importance<=2 && 7 天未访问
}
`

const MEMORY_MANIFEST = {
  $schema: 'axp-plugin/1.1',
  id: 'axp.core.memory',
  name: 'Core Memory',
  version: '1.1.0',
  description: '官方记忆系统参考实现：键值式记忆条目，支持标签、重要性分级与按权重召回。',
  engine: '>=1.1.0 <2.0.0',
  entry: './index.js',
  permissions: ['memory:read', 'memory:write', 'memory:forget', 'trigger:emit', 'store:local'],
  provides: [
    { point: 'agent.memory', contract: '1.1', features: ['tags', 'importance', 'recall', 'pin'] },
  ],
  subscribes: ['axp:health:tick'],
  heartbeatMs: 15000,
  author: { name: 'AXP Working Group' },
  license: 'Apache-2.0',
  tags: ['memory', 'official', 'reference'],
}

/* ------------------------------------------------------------------ */
/* 打包                                                                 */
/* ------------------------------------------------------------------ */

export async function GET() {
  const root = `axp-sdk-${SPEC_META.version}`
  const dir = join(process.cwd(), 'src/lib/axp')

  const archive = new ZipArchive({ zlib: { level: 6 } })
  const stream = new PassThrough()
  archive.pipe(stream)

  const add = (path: string, content: string) => archive.append(content, { name: `${root}/${path}` })
  const addFile = (file: string, path: string) => {
    try {
      archive.append(readFileSync(join(dir, file)), { name: `${root}/${path}` })
    } catch {
      /* 文件缺失时跳过 */
    }
  }

  add('SPEC.md', specToMarkdown())
  add('README.md', sdkReadme())
  addFile('types.ts', 'kernel/types.ts')
  addFile('permissions.ts', 'kernel/permissions.ts')
  addFile('event-bus.ts', 'kernel/event-bus.ts')
  addFile('registry.ts', 'kernel/registry.ts')
  addFile('kernel.ts', 'kernel/kernel.ts')
  addFile('memory-plugin.ts', 'plugins/axp.core.memory/index.ts')
  add('plugins/axp.core.memory/axp.plugin.json', JSON.stringify(MEMORY_MANIFEST, null, 2))
  add('plugins/axp.core.memory/recall-stub.js', MEMORY_PLUGIN_ENTRY)
  add('template/axp.plugin.json', TEMPLATE_MANIFEST)
  add('template/index.ts', TEMPLATE_ENTRY)

  void archive.finalize()

  const chunks: Buffer[] = []
  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on('data', (c) => chunks.push(c))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
  const buf = await done

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="axp-sdk-${SPEC_META.version}.zip"`,
      'Content-Length': String(buf.length),
    },
  })
}
