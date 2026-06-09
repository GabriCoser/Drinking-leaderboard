import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getFavorites, toggleFavorite } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    return NextResponse.json({ favorites: await getFavorites(session.username) })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { drinkId } = await request.json()
    if (!drinkId) return NextResponse.json({ error: 'drinkId mancante' }, { status: 400 })
    return NextResponse.json({ favorites: await toggleFavorite(session.username, drinkId) })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
