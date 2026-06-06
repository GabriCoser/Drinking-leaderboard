import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { del } from '@vercel/blob'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const photos = await redis.get('session_photos')
    const parsed = photos ? JSON.parse(photos) : {}
    return NextResponse.json({ photos: sessionId ? (parsed[sessionId] || []) : parsed })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}

export async function DELETE(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { url, sessionId } = await request.json()
    const photos = await redis.get('session_photos')
    const parsed = photos ? JSON.parse(photos) : {}
    if (parsed[sessionId]) {
      const photo = parsed[sessionId].find(p => p.url === url)
      if (photo && (photo.username === session.username || session.role === 'admin')) {
        parsed[sessionId] = parsed[sessionId].filter(p => p.url !== url)
        await redis.set('session_photos', JSON.stringify(parsed))
        await del(url)
      }
    }
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
