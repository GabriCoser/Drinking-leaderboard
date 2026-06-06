import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getSession } from '@/lib/auth'
import { getUsers, updateBacInfo } from '@/lib/db'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const formData = await request.formData()
    const file = formData.get('file')
    const type = formData.get('type')
    const sessionId = formData.get('sessionId')
    if (!file) return NextResponse.json({ error: 'File mancante' }, { status: 400 })
    const filename = `${type}/${session.username}_${Date.now()}.jpg`
    const blob = await put(filename, file, { access: 'public' })
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
    console.error(e)
    return NextResponse.json({ error: 'Errore upload' }, { status: 500 })
  }
}
