import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { getUsers, createUser, deleteUser, resetAllDrinks, updateUserDrinks } from '@/lib/db'
async function requireAdmin() { const s = await getSession(); return s?.role === 'admin' ? s : null }
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const users = await getUsers()
  return NextResponse.json({ users: Object.values(users).map(u => ({ username: u.username, role: u.role, drinks: u.drinks, createdAt: u.createdAt })) })
}
export async function POST(request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { username, password, role } = await request.json()
  if (!username || !password) return NextResponse.json({ error: 'Campi mancanti' }, { status: 400 })
  const user = await createUser(username.toLowerCase(), await bcrypt.hash(password, 10), role || 'player')
  return NextResponse.json({ user: { username: user.username, role: user.role } })
}
export async function DELETE(request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { username } = await request.json()
  if (username === 'admin') return NextResponse.json({ error: 'Non puoi eliminare admin' }, { status: 400 })
  await deleteUser(username)
  return NextResponse.json({ success: true })
}
export async function PUT(request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { action, username, drinks } = await request.json()
  if (action === 'reset') { await resetAllDrinks(); return NextResponse.json({ success: true }) }
  if (action === 'update') return NextResponse.json({ user: await updateUserDrinks(username, Math.max(0, drinks)) })
  return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
}
