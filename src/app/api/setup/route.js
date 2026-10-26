import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUser, createAdmin } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'
async function needsSetup() { return !process.env.ADMIN_PASSWORD && !(await getUser('admin')) }
export async function GET() {
  try { return NextResponse.json({ needsSetup: await needsSetup() }) }
  catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
// Primo avvio senza ADMIN_PASSWORD: chi crea la password diventa admin (ed entra subito)
export async function POST(request) {
  try {
    if (!await needsSetup()) return NextResponse.json({ error: 'Setup già completato' }, { status: 400 })
    const { adminPassword } = await request.json()
    if (!adminPassword || String(adminPassword).length < 4) return NextResponse.json({ error: 'Password troppo corta (minimo 4 caratteri)' }, { status: 400 })
    if (!await createAdmin(await bcrypt.hash(String(adminPassword), 10))) return NextResponse.json({ error: 'Setup già completato' }, { status: 400 })
    return setSessionCookie(NextResponse.json({ username: 'admin', role: 'admin' }), { username: 'admin', role: 'admin' })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
