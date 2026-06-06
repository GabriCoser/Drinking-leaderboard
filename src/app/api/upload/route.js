import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getSession } from '@/lib/auth'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { image, type, sessionId } = await request.json()
    if (!image) return NextResponse.json({ error: 'Immagine mancante' }, { status: 400 })
    // image è un dataURL: data:image/jpeg;base64,xxxx
    const base64 = image.split(',')[1]
    const buffer = Buffer.from(base64, 'base64')
    const filename = `${type}/${session.username}_${Date.now()}.jpg`
    const blob = await put(filename, buffer, { access: 'public', contentType: 'image/jpeg' })
    if (type === 'avatar') {
      const users = await redis.get('users')
      const parsed = users ? JSON.parse(users) : {}
      if (parsed[session.username]) {
        parsed[session.username].avatar = blob.url
        await redis.set('users', JSON.stringify(parsed))
      }
    }
    if (type === 'session' && sessionId) {
      const photos = await redis.get('session_photos')
      const parsed = photos ? JSON.parse(photos) : {}
      if (!parsed[sessionId]) parsed[sessionId] = []
      parsed[sessionId].push({ url: blob.url, username: session.username, timestamp: Date.now() })
      await redis.set('session_photos', JSON.stringify(parsed))
    }
    return NextResponse.json({ url: blob.url })
  } catch (e) {
    console.error('Upload error:', e)
    return NextResponse.json({ error: 'Errore upload: ' + e.message }, { status: 500 })
  }
}
