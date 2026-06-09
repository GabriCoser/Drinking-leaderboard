import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getChallenges, createChallenge, respondChallenge, getActiveSession, getUser } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const challenges = await getChallenges()
    return NextResponse.json({ challenges })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const active = await getActiveSession()
    if (!active) return NextResponse.json({ error: 'Nessuna serata attiva' }, { status: 400 })
    const { challenged, deadline } = await request.json()
    if (!challenged || !deadline) return NextResponse.json({ error: 'Campi mancanti' }, { status: 400 })
    if (challenged === session.username) return NextResponse.json({ error: 'Non puoi sfidare te stesso' }, { status: 400 })
    if (!await getUser(challenged)) return NextResponse.json({ error: 'Giocatore non trovato' }, { status: 404 })
    if (deadline <= Date.now()) return NextResponse.json({ error: 'Scadenza nel passato' }, { status: 400 })
    const challenge = await createChallenge(session.username, challenged, active.id, deadline)
    return NextResponse.json({ challenge })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}

export async function PATCH(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { id, accept } = await request.json()
    const challenge = await respondChallenge(id, session.username, !!accept)
    if (!challenge) return NextResponse.json({ error: 'Sfida non trovata' }, { status: 404 })
    return NextResponse.json({ challenge })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
