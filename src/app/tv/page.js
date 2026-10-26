'use client'

import { useState, useEffect, useRef } from 'react'
import Podium from '@/components/Podium'
import { THEMES, themeOf, isWitchingHour } from '@/lib/theme'
import { inSession, countDrinks, isBonus, isAlcoholic, standingsFor, costumeWinner } from '@/lib/score'
import { useApplyTheme, HalloweenFX } from '@/components/Theme'
import { fmtBonus } from '@/components/ui'

export default function TvPage() {
  const [players, setPlayers] = useState([])
  const [sessions, setSessions] = useState([])
  const [costumes, setCostumes] = useState({})
  const [activeSession, setActiveSession] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [finale, setFinale] = useState(null)
  const prevActive = useRef(null)
  const finaleAt = useRef(0)
  useEffect(() => {
    async function load() {
      try {
        const [d, sr] = await Promise.all([fetch('/api/players').then(r => r.json()), fetch('/api/sessions').then(r => r.json())])
        setPlayers(d.players || []); setCostumes(d.costumes || {}); setSessions(sr.sessions || [])
        setActiveSession(d.activeSession)
        const prev = prevActive.current
        if (prev && d.activeSession?.id !== prev.id) {
          // evento appena chiuso: podio finale finché non riparte un evento
          const standings = standingsFor(d.players || [], prev, prev.id).map(p => ({ username: p.username, avatar: p.avatar, points: p.pts, drinks: p.dks }))
          if (standings.some(p => p.points !== 0 || p.drinks > 0)) { setFinale({ name: prev.name, theme: themeOf(prev), standings, costume: costumeWinner(d.costumes, prev.id) }); finaleAt.current = Date.now() }
        }
        // con un nuovo evento in corso il podio resta visibile almeno 2 minuti
        if (d.activeSession && prev?.id === d.activeSession.id && Date.now() - finaleAt.current > 120000) setFinale(null)
        prevActive.current = d.activeSession ? { id: d.activeSession.id, name: d.activeSession.name, theme: d.activeSession.theme, participants: d.activeSession.participants } : null
      } catch {}
    }
    load()
    const i = setInterval(load, 10000)
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => { clearInterval(i); clearInterval(t) }
  }, [])
  // senza evento attivo mostra l'ultimo evento concluso
  const shown = activeSession || sessions[sessions.length - 1] || null
  const theme = themeOf(shown)
  const T = THEMES[theme]
  const isHw = theme === 'halloween'
  useApplyTheme(theme)
  const board = shown ? standingsFor(players, shown, shown.id) : []
  const sessionLog = shown ? players.flatMap(p => inSession(p.sessionLog || [], shown.id)) : []
  const feed = [...sessionLog].sort((a, b) => b.timestamp - a.timestamp).slice(0, 7)
  const ago = ts => { const m = Math.floor((now - ts) / 60000); return m < 1 ? 'ora' : m < 60 ? m + ' min fa' : Math.floor(m / 60) + 'h fa' }
  const totalDrinks = countDrinks(sessionLog)
  const drinkers = board.filter(p => p.dks > 0).length
  const avg = drinkers ? (totalDrinks / drinkers).toFixed(1) : 0
  const dc = {}; sessionLog.filter(isAlcoholic).forEach(e => { dc[e.name] = (dc[e.name] || 0) + 1 })
  const topDrink = Object.entries(dc).sort((a, b) => b[1] - a[1])[0]
  const costume = shown ? costumeWinner(costumes, shown.id) : null
  const statBox = (val, label, color = 'var(--text)') => (
    <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.7rem', textAlign: 'center', minWidth: 120 }}>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color, lineHeight: 1.1 }}>{val}</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{label}</div>
    </div>
  )
  return (
    <>
    {isHw && <HalloweenFX now={now} />}
    <main className="hw-content" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {finale && <Podium big sessionName={finale.name} standings={finale.standings} theme={finale.theme} costume={finale.costume} onClose={() => setFinale(null)} />}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '3.5rem', lineHeight: 1 }}>{T.logo} <span style={{ color: 'var(--accent)' }}>{T.title[0]}</span> {T.title[1]}</h1>
        {T.subtitle && <div style={{ color: 'var(--muted)', letterSpacing: '0.2em', fontSize: '0.9rem', marginTop: '0.3rem' }}>{T.subtitle}</div>}
        {activeSession
          ? <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--ok)', fontSize: '1.2rem' }}>● LIVE</span> <span style={{ color: 'var(--text)', fontSize: '1.2rem' }}>{activeSession.name}</span></div>
          : <div style={{ marginTop: '0.5rem', color: 'var(--muted)', fontSize: '1.1rem' }}>{shown ? `Ultimo evento: ${shown.name} · concluso` : 'Nessun evento ancora'}</div>}
        {isHw && activeSession && isWitchingHour(new Date(now)) && <div style={{ marginTop: '0.5rem', color: 'var(--danger)', animation: 'flicker 3s infinite' }}>🕛 È l&apos;ora delle streghe... 🩸</div>}
      </div>
      {shown && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {statBox(totalDrinks, 'Drink totali', 'var(--accent)')}
          {statBox(avg, 'Media a testa')}
          {statBox(topDrink ? topDrink[0] : '-', topDrink ? `Drink più bevuto (${topDrink[1]}x)` : 'Drink più bevuto', 'var(--ok)')}
          {statBox(board[0]?.pts ? board[0].username : '-', 'In testa', 'var(--ok)')}
          {isHw && statBox(costume ? `🧟 ${costume.username}` : '-', costume ? `Miglior costume (${costume.votes} voti)` : 'Miglior costume', 'var(--accent)')}
        </div>
      )}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {board.map((p, i) => (
            <div key={p.username} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: i === 0 ? 'linear-gradient(135deg, var(--hl-a), var(--hl-b))' : 'var(--surface)', border: `1px solid ${i === 0 ? 'var(--accent-dim)' : 'var(--border)'}`, borderRadius: '14px', padding: '0.8rem 1.2rem' }}>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', width: 44, color: i < 3 ? 'var(--accent)' : 'var(--faint)', textAlign: 'center' }}>{T.medals[i] || i + 1}</span>
              <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: 'var(--accent)' }}>{p.username[0].toUpperCase()}</span>}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--text)' }}>{p.username}{costume?.username === p.username && ' 🧟'}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{p.dks} drink</div>
              </div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.4rem', color: i === 0 ? 'var(--accent)' : 'var(--text)' }}>{p.pts}</div>
            </div>
          ))}
          {board.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '3rem' }}>Nessun giocatore</p>}
        </div>
        <div style={{ flex: '1 1 260px' }}>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>{isHw ? 'ULTIME POZIONI' : 'ULTIMI DRINK'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {feed.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem 0.8rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{e.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text)', fontSize: '0.9rem' }}><b>{e.username}</b> · {e.name}{isBonus(e) && <span style={{ color: e.points < 0 ? 'var(--danger)' : 'var(--ok)' }}> {fmtBonus(e.points)}</span>}</div>
                  <div style={{ color: 'var(--faint)', fontSize: '0.7rem' }}>{ago(e.timestamp)}</div>
                </div>
              </div>
            ))}
            {feed.length === 0 && <p style={{ color: 'var(--faint)', fontSize: '0.85rem' }}>Ancora niente...</p>}
          </div>
        </div>
      </div>
    </main>
    </>
  )
}
