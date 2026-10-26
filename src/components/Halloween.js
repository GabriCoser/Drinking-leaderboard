'use client'

import { useState, useEffect } from 'react'
import { s, api, Avatar } from '@/components/ui'

function fmtLeft(ms) { const m = Math.floor(ms / 60000), sec = Math.floor((ms % 60000) / 1000); return `${m}:${String(sec).padStart(2, '0')}` }

// Esito della bussata (dolcetto / scherzetto / morso del vampiro)
function KnockResult({ result, onClose }) {
  const view = {
    treat: { emoji: '🍬', title: 'DOLCETTO!', text: result.text, pts: `+${result.points} punti` },
    trick: { emoji: '👻', title: 'SCHERZETTO!', text: result.dare?.text, pts: 'Fallo e guadagni +3 punti' },
    bite: { emoji: '🧛', title: 'MORSO DEL VAMPIRO!', text: `Hai succhiato ${result.points} punti a ${result.victim}, che era in testa!`, pts: `+${result.points} a te, -${result.points} a ${result.victim}` },
    spared: { emoji: '🦇', title: 'IL VAMPIRO HA FAME...', text: 'Voleva mordere chi è in testa, ma in testa ci sei tu. Per stavolta ti risparmia.', pts: `+${result.points} punto di consolazione` },
  }[result.outcome]
  if (!view) return null
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal(), animation: 'podiumDrop 0.5s ease-out both' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '4rem', animation: 'pumpkinBob 1.4s ease-in-out infinite' }}>{view.emoji}</div>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2.2rem', color: 'var(--accent)', margin: '0.25rem 0 0.5rem' }}>{view.title}</h2>
        <p style={{ color: 'var(--text)', fontSize: '1rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>{view.text}</p>
        <p style={{ color: 'var(--ok)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{view.pts}</p>
        <button onClick={onClose} style={s.btn('var(--accent)', 'var(--accent-ink)', { width: '100%', padding: '0.7rem' })}>{result.outcome === 'trick' ? 'Accetto la sfida 😈' : 'Muahahah!'}</button>
      </div>
    </div>
  )
}

export function HalloweenTab({ hw, setHw, me, participants, players, onChange, pushToast }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i) }, [])
  const left = Math.max(0, (hw.cooldownUntil || 0) - now)
  async function post(body) {
    setBusy(true)
    const { ok, data } = await api('/api/halloween', 'POST', body)
    setBusy(false)
    if (data.state) setHw(data.state)
    if (!ok) { pushToast('⏳ ' + (data.error || 'Errore')); return null }
    onChange()
    return data
  }
  async function knock() { const d = await post({ action: 'knock' }); if (d) setResult(d) }
  async function dare(done) { const d = await post({ action: 'dare', done }); if (d) pushToast(done ? '👻 Scherzetto superato! +3' : '🐔 Fifone... niente punti stavolta') }
  async function vote(candidate) { const d = await post({ action: 'vote', candidate }); if (d) pushToast(`🧟 Hai votato ${candidate}`) }
  const others = participants.filter(u => u !== me)
  const votes = hw.votes || {}
  const topCostume = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {result && <KnockResult result={result} onClose={() => setResult(null)} />}
      <div style={s.card(true)}>
        <h3 style={s.h3()}>🚪 DOLCETTO O SCHERZETTO?</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '0.9rem', lineHeight: 1.4 }}>
          Bussa alla porta della strega ogni 30 minuti: 🍬 dolcetto (+2), 👻 scherzetto (una prova, +3 se la fai) o, raramente, 🧛 il morso del vampiro: rubi 2 punti a chi è in testa!
        </p>
        {hw.dare ? (
          <div style={{ background: 'var(--bg)', border: '1px dashed var(--accent)', borderRadius: '10px', padding: '0.9rem' }}>
            <div style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue', fontSize: '1rem', marginBottom: '0.3rem' }}>👻 IL TUO SCHERZETTO</div>
            <p style={{ color: 'var(--text)', fontSize: '1rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>{hw.dare.text}</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button disabled={busy} onClick={() => dare(true)} style={s.btn('var(--ok)', 'var(--accent-ink)', { flex: 1, padding: '0.6rem' })}>✅ Fatto! (+3)</button>
              <button disabled={busy} onClick={() => dare(false)} style={s.btn('var(--border)', 'var(--muted)', { flex: 1, padding: '0.6rem' })}>🐔 Passo</button>
            </div>
          </div>
        ) : left > 0 ? (
          <button disabled style={s.btn('var(--border)', 'var(--muted)', { width: '100%', padding: '1rem', fontSize: '1.3rem', cursor: 'not-allowed' })}>🕯️ La strega torna tra {fmtLeft(left)}</button>
        ) : (
          <button disabled={busy} onClick={knock} style={s.btn('var(--accent)', 'var(--accent-ink)', { width: '100%', padding: '1rem', fontSize: '1.5rem', borderRadius: '12px', boxShadow: '0 0 24px color-mix(in srgb, var(--accent) 40%, transparent)', opacity: busy ? 0.6 : 1 })}>{busy ? '...' : '🚪 Bussa alla porta!'}</button>
        )}
      </div>

      <div style={s.card()}>
        <h3 style={s.h3()}>🧟 MIGLIOR COSTUME</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          Vota il costume più bello (puoi cambiare idea fino alla fine). Il vincitore viene annunciato sul podio finale.
          {topCostume && <> In testa: <b style={{ color: 'var(--accent)' }}>{topCostume[0]}</b> ({topCostume[1]} vot{topCostume[1] === 1 ? 'o' : 'i'})</>}
        </p>
        {others.length === 0 && <p style={{ color: 'var(--faint)', fontSize: '0.85rem', textAlign: 'center' }}>Nessun altro partecipante... per ora 👀</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {others.map(u => {
            const mine = hw.myVote === u
            return (
              <div key={u} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.35rem 0', borderBottom: '1px solid var(--surface2)' }}>
                <Avatar url={players.find(p => p.username === u)?.avatar} name={u} size={32} />
                <span style={{ flex: 1, fontFamily: 'Bebas Neue', fontSize: '1.15rem' }}>{u}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{votes[u] || 0} 🗳️</span>
                <button disabled={busy || mine} onClick={() => vote(u)} style={s.btn(mine ? 'var(--accent)' : 'var(--border)', mine ? 'var(--accent-ink)' : 'var(--accent)', { fontSize: '0.85rem', padding: '0.3rem 0.7rem' })}>{mine ? '✓ Votato' : 'Vota'}</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Easter egg: tocca 5 volte il logo
export function BooOverlay({ theme }) {
  const hw = theme === 'halloween'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', textAlign: 'center', animation: 'booFly 1.6s ease-out forwards' }}>
        <div style={{ fontSize: '7rem', lineHeight: 1 }}>{hw ? '👻' : '🍻'}</div>
        <div style={{ fontFamily: 'var(--font-title)', fontSize: '3.5rem', color: 'var(--accent)', textShadow: '0 0 20px var(--accent)' }}>{hw ? 'BOO!' : 'CIN CIN!'}</div>
      </div>
    </div>
  )
}

export function WitchingBanner() {
  return (
    <div style={{ margin: '0 1rem 1rem', background: 'color-mix(in srgb, var(--danger) 16%, var(--bg))', border: '1px solid var(--danger)', borderRadius: '8px', padding: '0.5rem 1rem', color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', animation: 'flicker 3s infinite' }}>
      🕛 È l'ora delle streghe... la luna è diventata rossa 🩸
    </div>
  )
}
