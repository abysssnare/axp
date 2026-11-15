import { NextResponse } from 'next/server'
import { forgetMemory, pinMemory, touchMemory } from '@/lib/axp/memory-plugin'

export const dynamic = 'force-dynamic'

/** PATCH /api/memory/[id] — 置顶切换 / 触达 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const body = (await req.json()) as { op?: 'pin' | 'unpin' | 'touch' }
    if (body.op === 'pin' || body.op === 'unpin') {
      const memory = await pinMemory(id, body.op === 'pin')
      return NextResponse.json({ memory })
    }
    if (body.op === 'touch') {
      const memory = await touchMemory(id)
      return NextResponse.json({ memory })
    }
    return NextResponse.json(
      { error: { code: 'EBADREQ', message: 'op 必须为 pin | unpin | touch' } },
      { status: 400 },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: { code: 'EPATCH', message } }, { status: 500 })
  }
}

/** DELETE /api/memory/[id] — 遗忘 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const memory = await forgetMemory(id)
    return NextResponse.json({ memory })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: { code: 'EFORGET', message } }, { status: 500 })
  }
}
