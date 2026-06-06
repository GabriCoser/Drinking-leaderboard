import { NextResponse } from 'next/server'
import { getLeaderboard, getActiveSession } from '@/lib/db'
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId') ? parseInt(searchParams.get('sessionId')) : null
    const active = await getActiveSession()
    const leaderboard = await getLeaderboard(sessionId)
    return NextResponse.json({ players: leaderboard, activeSession: active })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
