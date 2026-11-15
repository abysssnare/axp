import { NextResponse } from 'next/server'
import { tailEvents } from '@/lib/axp/event-bus'

export const dynamic = 'force-dynamic'

/** GET /api/events?limit=40 — 审计轨迹 */
export async function GET(req: Request) {
  const limit = Number(new URL(req.url).searchParams.get('limit') ?? 40)
  const events = await tailEvents(Math.min(Math.max(limit, 1), 200))
  return NextResponse.json({ events })
}
