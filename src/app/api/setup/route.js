import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUser, createUser } from '@/lib/db'
export async function POST(request) {
  try {
    const existing = await getUser('admin')
    if (existing) return NextResponse.json({ error: 'Setup già completato' }, { status: 400 })
    const { adminPassword } = await request.json()
    if (!adminPassword || adminPassword === '__check__') return NextResponse.json({ error: 'Password non valida' }, { status: 400 })
    await createUser('admin', await bcrypt.hash(adminPassword, 10), 'admin')
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
