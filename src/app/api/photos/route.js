import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { del } from '@vercel/blob'
import { getSessionPhotosMap, setSessionPhotosMap, togglePhotoReaction } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const parsed = await getSessionPhotosMap()
    return NextResponse.json({ photos: sessionId ? (parsed[sessionId] || []) : parsed })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { url, sessionId, emoji } = await request.json()
    if (!url || !sessionId || !emoji) return NextResponse.json({ error: 'Campi mancanti' }, { status: 400 })
    const photo = await togglePhotoReaction(sessionId, url, session.username, emoji)
    if (!photo) return NextResponse.json({ error: 'Foto non trovata' }, { status: 404 })
    return NextResponse.json({ photo })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}

export async function DELETE(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { url, sessionId } = await request.json()
    const parsed = await getSessionPhotosMap()
    if (parsed[sessionId]) {
      const photo = parsed[sessionId].find(p => p.url === url)
      if (photo && (photo.username === session.username || session.role === 'admin')) {
        parsed[sessionId] = parsed[sessionId].filter(p => p.url !== url)
        await setSessionPhotosMap(parsed)
        await del(url)
      }
    }
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
