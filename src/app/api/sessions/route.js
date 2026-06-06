import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSessions, getActiveSession, createSession, closeSession } from '@/lib/db'
export async function GET() {
  try { const sessions = await getSessions(); const active = await getActiveSession(); return NextResponse.json({ sessions, active }) }
  catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function POST(request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { name } = await request.json()
    if (!name) return NextResponse.json({ error: 'Nome richiesto' }, { status: 400 })
    const newSession = await createSession(name)
    return NextResponse.json({ session: newSession })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function DELETE(request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { sessionId } = await request.json()
    await closeSession(sessionId)
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
