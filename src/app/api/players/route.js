import { NextResponse } from 'next/server'
import { getLeaderboard, getActiveSession, getHalloweenMap } from '@/lib/db'
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId') ? parseInt(searchParams.get('sessionId')) : null
    const active = await getActiveSession()
    const [leaderboard, hw] = await Promise.all([getLeaderboard(sessionId), getHalloweenMap()])
    // voti "miglior costume" per evento: { sessionId: { username: voti } }
    const costumes = {}
    for (const [sid, st] of Object.entries(hw)) {
      const tally = {}
      for (const c of Object.values(st.votes || {})) tally[c] = (tally[c] || 0) + 1
      if (Object.keys(tally).length) costumes[sid] = tally
    }
    return NextResponse.json({ players: leaderboard, activeSession: active, costumes })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
