import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { updateBacInfo } from '@/lib/db'
export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const bacInfo = await request.json()
    await updateBacInfo(session.username, bacInfo)
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
