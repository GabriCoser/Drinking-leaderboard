import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSessions, getActiveSession, createSession, closeSession, deleteSession, setSessionParticipation, wipeHistory } from '@/lib/db'
import { THEMES } from '@/lib/theme'
export async function GET() {
  try { const active = await getActiveSession(); const sessions = await getSessions(); return NextResponse.json({ sessions, active }) }
  catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
// Nuovo evento (admin): chiude quello in corso e riparte da zero.
// wipe: true cancella anche lo storico degli eventi precedenti (classifica di sempre).
export async function POST(request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { name, autoCloseAt, theme, wipe } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Nome richiesto' }, { status: 400 })
    if (wipe) await wipeHistory()
    return NextResponse.json({ session: await createSession(name.trim().slice(0, 60), autoCloseAt || null, THEMES[theme] ? theme : 'classic') })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function PATCH(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    if (session.role === 'admin') return NextResponse.json({ error: "L'admin non partecipa agli eventi" }, { status: 400 })
    const { action } = await request.json()
    if (!['join', 'leave'].includes(action)) return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
    const active = await getActiveSession()
    if (!active) return NextResponse.json({ error: 'Nessun evento attivo' }, { status: 400 })
    const updated = await setSessionParticipation(active.id, session.username, action === 'join')
    return NextResponse.json({ session: updated })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function DELETE(request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { sessionId, action } = await request.json()
    if (action === 'delete') {
      await deleteSession(sessionId)
    } else {
      await closeSession(sessionId)
    }
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
