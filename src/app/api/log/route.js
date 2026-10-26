import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDrinkLog, addDrinkEntry, removeDrinkEntry, getActiveSession, updateDrinkNote, getDrinksCatalog, setSessionParticipation, getUser } from '@/lib/db'
const FOOD = ['non_specificato', 'stomaco_vuoto', 'cibo_leggero', 'pasto_completo']
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
    if (!session || session.role === 'admin' || !await getUser(session.username)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const active = await getActiveSession()
    if (!active) return NextResponse.json({ error: 'Nessun evento attivo' }, { status: 400 })
    const { drinkId, foodContext, note } = await request.json()
    // punti, ml e gradazione arrivano sempre dal catalogo, mai dal client
    const drink = (await getDrinksCatalog()).find(d => d.id === drinkId)
    if (!drink) return NextResponse.json({ error: 'Drink non trovato' }, { status: 404 })
    // chi aggiunge un drink partecipa all'evento
    if (Array.isArray(active.participants) && !active.participants.includes(session.username)) await setSessionParticipation(active.id, session.username, true)
    const entry = await addDrinkEntry(session.username, drink, active.id, FOOD.includes(foodContext) ? foodContext : 'non_specificato', note ? String(note).slice(0, 140) : null)
    return NextResponse.json({ entry })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function PATCH(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { entryId, note } = await request.json()
    const entry = await updateDrinkNote(entryId, session.username, note ? String(note).slice(0, 140) : null)
    if (!entry) return NextResponse.json({ error: 'Drink non trovato' }, { status: 404 })
    return NextResponse.json({ entry })
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
