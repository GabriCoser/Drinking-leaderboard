import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUser } from '@/lib/db'
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ user: null })
    if (session.role === 'admin') return NextResponse.json({ user: { username: 'admin', role: 'admin' } })
    const user = await getUser(session.username)
    if (!user) return NextResponse.json({ user: null })
    return NextResponse.json({ user: { username: user.username, role: user.role } })
  } catch { return NextResponse.json({ user: null }) }
}
