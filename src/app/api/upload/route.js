import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getSession } from '@/lib/auth'
import { updateUserAvatar, addSessionPhoto } from '@/lib/db'

export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { image, type, sessionId } = await request.json()
    if (!image) return NextResponse.json({ error: 'Immagine mancante' }, { status: 400 })
    if (!image.startsWith('data:image/')) return NextResponse.json({ error: 'Formato non valido' }, { status: 400 })
    // image è un dataURL: data:image/jpeg;base64,xxxx
    const base64 = image.split(',')[1]
    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length > 4 * 1024 * 1024) return NextResponse.json({ error: 'Immagine troppo grande' }, { status: 413 })
    const filename = `${type}/${session.username}_${Date.now()}.jpg`
    const blob = await put(filename, buffer, { access: 'public', contentType: 'image/jpeg' })
    if (type === 'avatar') {
      await updateUserAvatar(session.username, blob.url)
    }
    if (type === 'session' && sessionId) {
      await addSessionPhoto(sessionId, { url: blob.url, username: session.username, timestamp: Date.now() })
    }
    return NextResponse.json({ url: blob.url })
  } catch (e) {
    console.error('Upload error:', e)
    return NextResponse.json({ error: 'Errore upload: ' + e.message }, { status: 500 })
  }
}
