'use client'

import { useState, useEffect } from 'react'
const MEDAL = ['🥇', '🥈', '🥉']

export default function TvPage() {
  const [players, setPlayers] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    async function load() {
      try {
        const d = await fetch('/api/players').then(r => r.json())
        setPlayers(d.players || [])
        setActiveSession(d.activeSession)
      } catch {}
    }
    load()
    const i = setInterval(load, 10000)
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => { clearInterval(i); clearInterval(t) }
  }, [])
  const board = players.filter(p => !activeSession?.participants || activeSession.participants.includes(p.username)).map(p => {
    const log = activeSession ? (p.sessionLog || []).filter(e => e.sessionId === activeSession.id) : (p.sessionLog || [])
    return { username: p.username, avatar: p.avatar, points: log.reduce((s, e) => s + e.points, 0), drinks: log.length }
  }).sort((a, b) => b.points - a.points)
  const feed = players.flatMap(p => p.sessionLog || [])
    .filter(e => !activeSession || e.sessionId === activeSession.id)
    .sort((a, b) => b.timestamp - a.timestamp).slice(0, 6)
  const ago = ts => { const m = Math.floor((now - ts) / 60000); return m < 1 ? 'ora' : m < 60 ? m + ' min fa' : Math.floor(m / 60) + 'h fa' }
  const sessionLog = players.flatMap(p => (p.sessionLog || []).filter(e => activeSession && e.sessionId === activeSession.id))
  const drinkers = board.filter(p => p.drinks > 0).length
  const avg = drinkers ? (sessionLog.length / drinkers).toFixed(1) : 0
  const dc = {}; sessionLog.forEach(e => { dc[e.name] = (dc[e.name] || 0) + 1 })
  const topDrink = Object.entries(dc).sort((a, b) => b[1] - a[1])[0]
  const statBox = (val, label, color = '#f0f0f0') => (
    <div style={{ flex: 1, background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '12px', padding: '0.7rem', textAlign: 'center', minWidth: 120 }}>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color, lineHeight: 1.1 }}>{val}</div>
      <div style={{ color: '#888', fontSize: '0.75rem' }}>{label}</div>
    </div>
  )
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '3.5rem', lineHeight: 1 }}><span style={{ color: '#F5C518' }}>DRINKING</span> LEADERBOARD</h1>
        {activeSession
          ? <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#3ce08a', fontSize: '1.2rem' }}>● LIVE</span> <span style={{ color: '#f0f0f0', fontSize: '1.2rem' }}>{activeSession.name}</span></div>
          : <div style={{ marginTop: '0.5rem', color: '#888', fontSize: '1.1rem' }}>Classifica generale</div>}
      </div>
      {activeSession && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {statBox(sessionLog.length, 'Drink totali', '#F5C518')}
          {statBox(avg, 'Media a testa')}
          {statBox(topDrink ? topDrink[0] : '-', topDrink ? `Drink più bevuto (${topDrink[1]}x)` : 'Drink più bevuto', '#3ce08a')}
          {statBox(board[0]?.points ? board[0].username : '-', 'In testa', '#3ce08a')}
        </div>
      )}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {board.map((p, i) => (
            <div key={p.username} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: i === 0 ? 'linear-gradient(135deg, #1e1a00, #2a2200)' : '#1a1a1a', border: `1px solid ${i === 0 ? '#c9a014' : '#2e2e2e'}`, borderRadius: '14px', padding: '0.8rem 1.2rem' }}>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', width: 44, color: i < 3 ? '#F5C518' : '#555', textAlign: 'center' }}>{MEDAL[i] || i + 1}</span>
              <span style={{ width: 44, height: 44, borderRadius: '50%', background: '#2e2e2e', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: '#F5C518' }}>{p.username[0].toUpperCase()}</span>}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: '#f0f0f0' }}>{p.username}</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>{p.drinks} drink</div>
              </div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.4rem', color: i === 0 ? '#F5C518' : '#f0f0f0' }}>{p.points}</div>
            </div>
          ))}
          {board.length === 0 && <p style={{ color: '#888', textAlign: 'center', padding: '3rem' }}>Nessun giocatore</p>}
        </div>
        <div style={{ flex: '1 1 260px' }}>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.4rem', color: '#888', marginBottom: '0.75rem' }}>ULTIMI DRINK</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {feed.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '10px', padding: '0.5rem 0.8rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{e.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f0f0f0', fontSize: '0.9rem' }}><b>{e.username}</b> · {e.name}</div>
                  <div style={{ color: '#555', fontSize: '0.7rem' }}>{ago(e.timestamp)}</div>
                </div>
              </div>
            ))}
            {feed.length === 0 && <p style={{ color: '#555', fontSize: '0.85rem' }}>Ancora niente...</p>}
          </div>
        </div>
      </div>
    </main>
  )
}
