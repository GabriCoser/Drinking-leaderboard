import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getActiveSession, getHalloweenState, updateHalloween, addBonusEntries, getDrinkLog, setSessionParticipation } from '@/lib/db'
import { themeOf } from '@/lib/theme'
import { sumPoints, inSession } from '@/lib/score'
import { KNOCK_COOLDOWN_MS, POINTS, TREATS, DARES, pick } from '@/lib/halloween'

async function context() {
  const session = await getSession()
  if (!session || session.role === 'admin') return { error: NextResponse.json({ error: 'Non autorizzato' }, { status: 401 }) }
  const active = await getActiveSession()
  if (!active || themeOf(active) !== 'halloween') return { error: NextResponse.json({ error: 'Nessun evento di Halloween attivo' }, { status: 400 }) }
  return { me: session.username, active }
}
function publicState(st, me, sid) {
  const votes = {}
  for (const c of Object.values(st.votes)) votes[c] = (votes[c] || 0) + 1
  const last = st.knocks[me] || 0
  return { enabled: true, sessionId: sid, cooldownUntil: last ? last + KNOCK_COOLDOWN_MS : 0, dare: st.dares[me] || null, myVote: st.votes[me] || null, votes }
}

export async function GET() {
  try {
    const { me, active, error } = await context()
    if (error) return NextResponse.json({ enabled: false })
    return NextResponse.json(publicState(await getHalloweenState(active.id), me, active.id))
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { me, active, error } = await context()
    if (error) return error
    const { action, done, candidate } = await request.json()
    const sid = active.id
    const bonus = (username, bonusType, name, emoji, points) => ({ username, sessionId: sid, bonusType, name, emoji, points })
    if (Array.isArray(active.participants) && !active.participants.includes(me)) await setSessionParticipation(sid, me, true)

    // 🚪 Dolcetto o scherzetto: una bussata ogni 30 minuti
    if (action === 'knock') {
      const result = await updateHalloween(sid, async st => {
        if (st.dares[me]) return { status: 409, body: { error: 'Prima completa lo scherzetto!', dare: st.dares[me] } }
        const last = st.knocks[me] || 0
        if (Date.now() < last + KNOCK_COOLDOWN_MS) return { status: 429, body: { error: 'Le streghe stanno ricaricando i dolcetti...', cooldownUntil: last + KNOCK_COOLDOWN_MS } }
        st.knocks[me] = Date.now()
        const roll = Math.random()
        if (roll < 0.45) {
          const text = pick(TREATS)
          await addBonusEntries([bonus(me, 'treat', 'Dolcetto', '🍬', POINTS.treat)])
          return { body: { outcome: 'treat', text, points: POINTS.treat } }
        }
        if (roll < 0.9) {
          st.dares[me] = { text: pick(DARES), at: Date.now() }
          return { body: { outcome: 'trick', dare: st.dares[me] } }
        }
        // 🧛 Morso del vampiro: ruba punti a chi è in testa all'evento
        const log = inSession(await getDrinkLog(), sid)
        const pts = u => sumPoints(log.filter(e => e.username === u))
        const others = (active.participants || [...new Set(log.map(e => e.username))]).filter(u => u !== me)
        const leader = others.sort((a, b) => pts(b) - pts(a))[0]
        if (!leader || pts(leader) <= pts(me) || pts(leader) < POINTS.bite) {
          await addBonusEntries([bonus(me, 'spared', 'Il vampiro ti ha risparmiato', '🦇', POINTS.spared)])
          return { body: { outcome: 'spared', points: POINTS.spared } }
        }
        await addBonusEntries([
          bonus(me, 'bite', `Morso a ${leader}`, '🧛', POINTS.bite),
          bonus(leader, 'bitten', `Morso da ${me}`, '🩸', -POINTS.bite),
        ])
        return { body: { outcome: 'bite', victim: leader, points: POINTS.bite } }
      })
      const st = await getHalloweenState(sid)
      return NextResponse.json({ ...result.body, state: publicState(st, me, sid) }, { status: result.status || 200 })
    }

    // 👻 Scherzetto: fatto (+3) o passo
    if (action === 'dare') {
      const result = await updateHalloween(sid, async st => {
        const dare = st.dares[me]
        if (!dare) return { status: 404, body: { error: 'Nessuno scherzetto in corso' } }
        delete st.dares[me]
        if (done) await addBonusEntries([bonus(me, 'dare', 'Scherzetto superato', '👻', POINTS.dare)])
        return { body: { done: !!done, points: done ? POINTS.dare : 0 } }
      })
      return NextResponse.json({ ...result.body, state: publicState(await getHalloweenState(sid), me, sid) }, { status: result.status || 200 })
    }

    // 🧟 Vota il miglior costume (si può cambiare voto, non votare se stessi)
    if (action === 'vote') {
      if (!candidate || candidate === me) return NextResponse.json({ error: 'Non puoi votarti da solo 😏' }, { status: 400 })
      if (Array.isArray(active.participants) && !active.participants.includes(candidate)) return NextResponse.json({ error: 'Giocatore non presente' }, { status: 400 })
      await updateHalloween(sid, async st => { st.votes[me] = candidate })
      return NextResponse.json({ state: publicState(await getHalloweenState(sid), me, sid) })
    }
    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  } catch (e) { console.error(e); return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
