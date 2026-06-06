import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getLeaderboard, updateUserDrinks, getUser } from '@/lib/db'
export async function GET() {
  try { return NextResponse.json({ players: await getLeaderboard() }) }
  catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function PATCH(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { username, drinks } = await request.json()
    if (session.role !== 'admin' && session.username !== username) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    const user = await getUser(username)
    if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    return NextResponse.json({ user: await updateUserDrinks(username, Math.max(0, drinks)) })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
