import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDrinkLog, addDrinkEntry, removeDrinkEntry, getActiveSession } from '@/lib/db'
export async function GET(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId') ? parseInt(searchParams.get('sessionId')) : null
    const log = await getDrinkLog()
    const userLog = log.filter(e => e.username === session.username && (sessionId ? e.sessionId === sessionId : true)).sort((a, b) => b.timestamp - a.timestamp)
    return NextResponse.json({ log: userLog })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const active = await getActiveSession()
    if (!active) return NextResponse.json({ error: 'Nessuna serata attiva' }, { status: 400 })
    const { drink, foodContext } = await request.json()
    return NextResponse.json({ entry: await addDrinkEntry(session.username, drink, active.id, foodContext) })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function DELETE(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { entryId } = await request.json()
    await removeDrinkEntry(entryId, session.username)
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
