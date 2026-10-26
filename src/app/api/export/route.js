import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDrinkLog, getSessions } from '@/lib/db'

export async function GET(request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId') ? parseInt(searchParams.get('sessionId')) : null
    const format = searchParams.get('format') === 'json' ? 'json' : 'csv'
    if (!sessionId) return NextResponse.json({ error: 'sessionId mancante' }, { status: 400 })
    const sessions = await getSessions()
    const sess = sessions.find(s => s.id === sessionId)
    if (!sess) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })
    const log = (await getDrinkLog()).filter(e => e.sessionId === sessionId).sort((a, b) => a.timestamp - b.timestamp)
    const safeName = sess.name.replace(/[^a-zA-Z0-9]+/g, '_')
    if (format === 'json') {
      return new NextResponse(JSON.stringify({ session: sess, log }, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${safeName}.json"` }
      })
    }
    const esc = v => v == null ? '' : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v)
    const rows = [['orario', 'giocatore', 'drink', 'ml', 'abv', 'punti', 'cibo', 'nota']]
    log.forEach(e => rows.push([new Date(e.timestamp).toISOString(), e.username, e.name, e.ml, e.abv, e.points, e.foodContext || '', e.note || '']))
    const csv = rows.map(r => r.map(esc).join(',')).join('\n')
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${safeName}.csv"` }
    })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
