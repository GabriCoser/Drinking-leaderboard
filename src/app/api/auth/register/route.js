import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUser, createUser } from '@/lib/db'
export async function POST(request) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) return NextResponse.json({ error: 'Campi mancanti' }, { status: 400 })
    if (username.toLowerCase() === 'admin') return NextResponse.json({ error: 'Username non disponibile' }, { status: 400 })
    const existing = await getUser(username.toLowerCase())
    if (existing) return NextResponse.json({ error: 'Username già in uso' }, { status: 400 })
    const hashed = await bcrypt.hash(password, 10)
    const user = await createUser(username.toLowerCase(), hashed, 'player')
    return NextResponse.json({ username: user.username, role: user.role })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
