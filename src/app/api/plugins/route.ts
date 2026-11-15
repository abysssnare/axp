import { NextResponse } from 'next/server'
import { ensureSeeded, MARKET_CATALOG } from '@/lib/axp/seed'
import { install } from '@/lib/axp/kernel'
import { listPlugins } from '@/lib/axp/registry'
import { validateManifest } from '@/lib/axp/registry'
import { tailEvents } from '@/lib/axp/event-bus'
import type { PluginManifest } from '@/lib/axp/types'

export const dynamic = 'force-dynamic'

/** GET /api/plugins — 注册表快照 + 市场目录 + 事件轨迹 */
export async function GET() {
  await ensureSeeded()
  const [plugins, events] = await Promise.all([listPlugins(), tailEvents(40)])
  return NextResponse.json({
    plugins,
    events,
    market: MARKET_CATALOG.map((m) => m.manifest),
  })
}

/** POST /api/plugins — 从市场目录或自定义清单安装插件 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { marketId?: string; manifest?: PluginManifest }
    let manifest: PluginManifest | undefined
    let category = 'tool'

    if (body.marketId) {
      const hit = MARKET_CATALOG.find((m) => m.manifest.id === body.marketId)
      if (!hit) {
        return NextResponse.json(
          { error: { code: 'ENOTFOUND', message: `市场目录中不存在 ${body.marketId}` } },
          { status: 404 },
        )
      }
      manifest = hit.manifest
      category = hit.category
    } else if (body.manifest) {
      manifest = body.manifest
      category =
        manifest.provides?.[0]?.point === 'agent.memory'
          ? 'memory'
          : manifest.provides?.[0]?.point === 'agent.trigger'
            ? 'trigger'
            : manifest.provides?.[0]?.point === 'agent.policy'
              ? 'policy'
              : manifest.provides?.[0]?.point === 'ui.panel'
                ? 'ui'
                : 'tool'
    }

    if (!manifest) {
      return NextResponse.json(
        { error: { code: 'EBADREQ', message: '需要 marketId 或 manifest' } },
        { status: 400 },
      )
    }

    const check = validateManifest(manifest)
    if (!check.ok) {
      return NextResponse.json(
        { error: { code: 'EINVALID', message: check.errors.join('; ') } },
        { status: 422 },
      )
    }

    const record = await install(manifest, category)
    return NextResponse.json({ plugin: record }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const status = message.includes('EALREADY') ? 409 : 500
    return NextResponse.json({ error: { code: 'EINSTALL', message } }, { status })
  }
}
