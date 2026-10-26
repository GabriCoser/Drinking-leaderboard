import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUsers, deleteUser } from '@/lib/db'
async function requireAdmin() { const s = await getSession(); return s?.role === 'admin' ? s : null }
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const users = await getUsers()
  return NextResponse.json({ users: Object.values(users).filter(u => u.role !== 'admin').map(u => ({ username: u.username, role: u.role, createdAt: u.createdAt })) })
}
export async function DELETE(request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { username } = await request.json()
  if (!username || username === 'admin') return NextResponse.json({ error: 'Non puoi eliminare admin' }, { status: 400 })
  await deleteUser(username)
  return NextResponse.json({ success: true })
}
