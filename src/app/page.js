'use client'

import { useState, useEffect } from 'react'

const MEDAL = ['🥇', '🥈', '🥉']
const DRINKS = ['🍺', '🍻', '🥂', '🍷', '🥃', '🍹']

export default function Home() {
  const [players, setPlayers] = useState([])
  const [name, setName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('drinking-leaderboard')
    if (saved) setPlayers(JSON.parse(saved))
  }, [])

  useEffect(() => {
    if (mounted) localStorage.setItem('drinking-leaderboard', JSON.stringify(players))
  }, [players, mounted])

  const sorted = [...players].sort((a, b) => b.drinks - a.drinks)

  function addPlayer() {
    const trimmed = name.trim()
    if (!trimmed) return
    setPlayers(prev => [...prev, {
      id: Date.now(),
      name: trimmed,
      drinks: 0,
      emoji: DRINKS[Math.floor(Math.random() * DRINKS.length)],
    }])
    setName('')
    setShowAdd(false)
  }

  function increment(id) {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, drinks: p.drinks + 1 } : p))
  }

  function decrement(id) {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, drinks: Math.max(0, p.drinks - 1) } : p))
  }

  function removePlayer(id) {
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  function reset() {
    if (confirm('Resettare tutti i punteggi?'))
      setPlayers(prev => prev.map(p => ({ ...p, drinks: 0 })))
  }

  if (!mounted) return null

  const btn = (bg, color = 'var(--text)', padding = '0.4rem 0.8rem') => ({
    background: bg, color, border: 'none', borderRadius: '8px',
    padding, cursor: 'pointer', fontFamily: 'Bebas Neue',
    fontSize: '1.1rem', letterSpacing: '0.05em',
  })

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="fade-up" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.25rem' }}>🍺</div>
        <h1 style={{ fontSize: '3.5rem', color: 'var(--gold)', lineHeight: 1 }}>DRINKING</h1>
        <h1 style={{ fontSize: '3.5rem', lineHeight: 1 }}>LEADERBOARD</h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Chi beve di più vince. O perde. Dipende.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {sorted.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)',
            border: '2px dashed var(--border)', borderRadius: '12px', fontSize: '0.95rem'
          }}>
            Nessun giocatore ancora.<br />Aggiungine uno per iniziare!
          </div>
        )}
        {sorted.map((player, i) => (
          <div key={player.id} className="fade-up" style={{
            animationDelay: `${i * 0.05}s`,
            background: i === 0 ? 'linear-gradient(135deg, #1e1a00, #2a2200)' : 'var(--surface)',
            border: `1px solid ${i === 0 ? 'var(--gold-dim)' : 'var(--border)'}`,
            borderRadius: '14px', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{ width: 32, textAlign: 'center' }}>
              {i < 3
                ? <span style={{ fontSize: '1.4rem' }}>{MEDAL[i]}</span>
                : <span style={{ color: 'var(--muted)', fontFamily: 'Bebas Neue', fontSize: '1.2rem' }}>{i + 1}</span>
              }
            </div>
            <span style={{ fontSize: '1.5rem' }}>{player.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'Bebas Neue', fontSize: '1.4rem', letterSpacing: '0.05em',
                color: i === 0 ? 'var(--gold)' : 'var(--text)',
              }}>{player.name}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                {player.drinks} {player.drinks === 1 ? 'drink' : 'drinks'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => decrement(player.id)} style={btn('#2e2e2e')}>−</button>
              <span style={{
                fontFamily: 'Bebas Neue', fontSize: '1.8rem',
                minWidth: 36, textAlign: 'center',
                color: i === 0 ? 'var(--gold)' : 'var(--text)',
              }}>{player.drinks}</span>
              <button onClick={() => increment(player.id)} style={btn('var(--gold)', '#000')}>+</button>
              <button onClick={() => removePlayer(player.id)}
                style={{ ...btn('#2e2e2e'), marginLeft: '0.25rem', opacity: 0.5, fontSize: '0.75rem' }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="fade-up" style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem',
          display: 'flex', gap: '0.75rem',
        }}>
          <input
            autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            placeholder="Nome giocatore..."
            style={{
              flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '0.6rem 1rem', color: 'var(--text)',
              fontSize: '1rem', outline: 'none',
            }}
          />
          <button onClick={addPlayer} style={btn('var(--gold)', '#000', '0.6rem 1.2rem')}>Aggiungi</button>
          <button onClick={() => setShowAdd(false)} style={btn('#2e2e2e', 'var(--text)', '0.6rem 1rem')}>✕</button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{
          width: '100%', padding: '0.9rem', borderRadius: '12px',
          border: '2px dashed var(--border)', background: 'transparent',
          color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer', marginBottom: '1rem',
        }}>
          + Aggiungi giocatore
        </button>
      )}

      {players.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={reset} style={{
            background: 'none', border: 'none', color: 'var(--muted)',
            fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline',
          }}>Reset punteggi</button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--border)', fontSize: '0.75rem' }}>
        bevi responsabilmente 🫡
      </div>
    </main>
  )
}
