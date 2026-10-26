import { NextResponse } from 'next/server'
import { ensurePlayer, getActiveSession, setSessionParticipation } from '@/lib/db'
import { normalizeName, setSessionCookie } from '@/lib/auth'
// Accesso giocatori: basta il nome. Se il nome è nuovo crea il giocatore,
// altrimenti ritrova i suoi drink. Se c'è un evento attivo si viene iscritti subito.
export async function POST(request) {
  try {
    const { name: raw } = await request.json()
    const { name, error } = normalizeName(raw)
    if (error) return NextResponse.json({ error }, { status: 400 })
    const user = await ensurePlayer(name)
    const active = await getActiveSession()
    if (active) await setSessionParticipation(active.id, user.username, true)
    return setSessionCookie(NextResponse.json({ username: user.username, role: user.role }), { username: user.username, role: user.role })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
