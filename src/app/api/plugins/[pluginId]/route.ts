import { NextResponse } from 'next/server'
import { heartbeat, injectFault, transition, uninstall } from '@/lib/axp/kernel'
import { getPlugin } from '@/lib/axp/registry'
import type { LifecycleAction } from '@/lib/axp/types'

export const dynamic = 'force-dynamic'

const ACTIONS: LifecycleAction[] = [
  'resolve',
  'activate',
  'deactivate',
  'recover',
  'fail',
  'quarantine',
  'reenable',
]

/** PATCH /api/plugins/[pluginId] — 生命周期动作 / 心跳 / 故障注入 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ pluginId: string }> },
) {
  const { pluginId } = await params
  try {
    const body = (await req.json()) as { action?: string }
    const action = body.action

    if (action === 'heartbeat') {
      const plugin = await heartbeat(pluginId)
      return NextResponse.json({ plugin })
    }
    if (action === 'inject-fault') {
      const plugin = await injectFault(pluginId)
      return NextResponse.json({ plugin })
    }

    if (!action || !ACTIONS.includes(action as LifecycleAction)) {
      return NextResponse.json(
        {
          error: {
            code: 'EBADACTION',
            message: `未知动作 "${action}"，合法值：${[...ACTIONS, 'heartbeat', 'inject-fault'].join(', ')}`,
          },
        },
        { status: 400 },
      )
    }

    const plugin = await transition(pluginId, action as LifecycleAction)
    return NextResponse.json({ plugin })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const status = message.includes('ENOTFOUND')
      ? 404
      : message.startsWith('E')
        ? 409
        : 500
    return NextResponse.json({ error: { code: 'ELIFECYCLE', message } }, { status })
  }
}

/** GET /api/plugins/[pluginId] — 单个插件详情 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pluginId: string }> },
) {
  const { pluginId } = await params
  const plugin = await getPlugin(pluginId)
  if (!plugin) {
    return NextResponse.json(
      { error: { code: 'ENOTFOUND', message: `插件 "${pluginId}" 未注册` } },
      { status: 404 },
    )
  }
  return NextResponse.json({ plugin })
}

/** DELETE /api/plugins/[pluginId] — 注销（unregister） */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ pluginId: string }> },
) {
  const { pluginId } = await params
  try {
    await uninstall(pluginId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const status = message.includes('ENOTFOUND')
      ? 404
      : message.includes('EBUSY')
        ? 409
        : 500
    return NextResponse.json({ error: { code: 'EUNINSTALL', message } }, { status })
  }
}
