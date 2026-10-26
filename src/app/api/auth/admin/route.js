import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { timingSafeEqual } from 'crypto'
import { getUser } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'
// Accesso admin con password. Se è impostata la variabile ADMIN_PASSWORD vale quella,
// altrimenti la password creata al primo setup (/api/setup).
export async function POST(request) {
  try {
    const { password } = await request.json()
    if (!password) return NextResponse.json({ error: 'Password mancante' }, { status: 400 })
    let valid = false
    if (process.env.ADMIN_PASSWORD) {
      const a = Buffer.from(String(password)), b = Buffer.from(process.env.ADMIN_PASSWORD)
      valid = a.length === b.length && timingSafeEqual(a, b)
    } else {
      const admin = await getUser('admin')
      if (!admin) return NextResponse.json({ error: 'Admin non ancora configurato', needsSetup: true }, { status: 404 })
      valid = await bcrypt.compare(String(password), admin.password)
    }
    if (!valid) return NextResponse.json({ error: 'Password errata' }, { status: 401 })
    return setSessionCookie(NextResponse.json({ username: 'admin', role: 'admin' }), { username: 'admin', role: 'admin' })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
