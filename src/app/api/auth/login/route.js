import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUser } from '@/lib/db'
import { signToken } from '@/lib/auth'
export async function POST(request) {
  try {
    const { username: rawUsername, password } = await request.json()
    const username = rawUsername?.trim().toLowerCase()
    if (!username || !password) return NextResponse.json({ error: 'Campi mancanti' }, { status: 400 })
    const user = await getUser(username)
    if (!user) return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
    const token = await signToken({ username: user.username, role: user.role })
    const res = NextResponse.json({ username: user.username, role: user.role })
    res.cookies.set('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/' })
    return res
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
