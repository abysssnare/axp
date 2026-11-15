import { NextResponse } from 'next/server'
import { recallMemory, sweepMemory, writeMemory } from '@/lib/axp/memory-plugin'
import { getPlugin } from '@/lib/axp/registry'
import { publish } from '@/lib/axp/event-bus'
import { EVENT_TOPICS } from '@/lib/axp/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/memory?q=&tag=&scope=&limit= — 召回记忆
 * 通过记忆插件（axp.core.memory）的 agent.memory 扩展点提供服务。
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const memories = await recallMemory({
    q: sp.get('q') ?? undefined,
    tag: sp.get('tag') ?? undefined,
    scope: sp.get('scope') ?? undefined,
    limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
  })
  return NextResponse.json({ memories })
}

/** POST /api/memory — 写入记忆（body: key, content, tags?, importance?, pinned?） */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      key?: string
      content?: string
      tags?: string[]
      importance?: number
      pinned?: boolean
      scope?: string
    }
    if (!body.key?.trim() || !body.content?.trim()) {
      return NextResponse.json(
        { error: { code: 'EBADREQ', message: 'key 与 content 为必填项' } },
        { status: 400 },
      )
    }

    // 运行期权限复核：记忆插件必须处于 active 且持有 memory:write
    const plugin = await getPlugin('axp.core.memory')
    if (!plugin || plugin.status !== 'active') {
      await publish({
        topic: EVENT_TOPICS.policyDenied,
        source: 'host',
        payload: {
          pluginId: 'axp.core.memory',
          required: 'memory:write',
          reason: `插件状态为 ${plugin?.status ?? '未注册'}，非 active`,
        },
        level: 'warn',
      })
      return NextResponse.json(
        {
          error: {
            code: 'EPERM',
            message: '记忆插件未激活：请先在演练场激活 axp.core.memory（规范 §7 运行期复核）',
          },
        },
        { status: 403 },
      )
    }
    if (!plugin.permissions.includes('memory:write')) {
      return NextResponse.json(
        { error: { code: 'EPERM', message: '插件未声明 memory:write' } },
        { status: 403 },
      )
    }

    const memory = await writeMemory({
      key: body.key.trim(),
      content: body.content.trim(),
      tags: body.tags,
      importance: body.importance,
      pinned: body.pinned,
      scope: body.scope,
    })
    return NextResponse.json({ memory }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: { code: 'EWRITE', message } }, { status: 500 })
  }
}

/** PUT /api/memory — 触发 sweep 淘汰 */
export async function PUT() {
  const victims = await sweepMemory()
  return NextResponse.json({ swept: victims.length, victims })
}
