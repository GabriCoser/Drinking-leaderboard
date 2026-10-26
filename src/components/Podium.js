'use client'

import { THEMES } from '@/lib/theme'

const COLORS = ['#F5C518', '#c0c0c0', '#cd7f32']

function PodiumAvatar({ p, size }) {
  if (p.avatar) return <img src={p.avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
  return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue', fontSize: size * 0.45, color: 'var(--accent)' }}>{p.username[0].toUpperCase()}</div>
}

export default function Podium({ sessionName, standings, onClose, big = false, theme = 'classic', costume = null }) {
  const { medals: MEDALS, confetti: CONFETTI } = THEMES[theme] || THEMES.classic
  const top = standings.slice(0, 3)
  const rest = standings.slice(3)
  // ordine visivo: 2°, 1°, 3°
  const cols = [top[1] && { p: top[1], rank: 1 }, top[0] && { p: top[0], rank: 0 }, top[2] && { p: top[2], rank: 2 }].filter(Boolean)
  const stepH = rank => (big ? [220, 160, 120] : [140, 100, 75])[rank]
  const avSize = big ? 88 : 64
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg) 96%, transparent)', zIndex: 1100, overflowY: 'auto', cursor: onClose ? 'pointer' : 'default' }}>
      {[...Array(14)].map((_, i) => (
        <span key={i} style={{ position: 'fixed', top: 0, left: `${(i * 37 + 11) % 100}%`, fontSize: big ? '2rem' : '1.4rem', animation: `confettiFall ${3 + (i % 5) * 0.8}s linear ${(i % 7) * 0.5}s infinite`, pointerEvents: 'none' }}>{CONFETTI[i % CONFETTI.length]}</span>
      ))}
      <div style={{ maxWidth: big ? 760 : 480, margin: '0 auto', padding: '2.5rem 1rem 3rem', textAlign: 'center' }}>
        <div style={{ fontSize: big ? '3rem' : '2.2rem' }}>{theme === 'halloween' ? '🪦' : '🏁'}</div>
        <h1 style={{ fontSize: big ? '3rem' : '2rem', color: 'var(--accent)', lineHeight: 1.1 }}>{sessionName}</h1>
        <p style={{ color: 'var(--muted)', marginBottom: big ? '2.5rem' : '1.5rem', letterSpacing: '0.15em', fontSize: '0.85rem' }}>CLASSIFICA FINALE</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: big ? '1.5rem' : '0.75rem', marginBottom: '2rem' }}>
          {cols.map(({ p, rank }) => (
            <div key={p.username} style={{ flex: 1, maxWidth: big ? 200 : 130 }}>
              <div style={{ animation: `podiumDrop 0.7s ease-out ${0.9 + rank * 0.35}s both`, marginBottom: '0.5rem' }}>
                <div style={{ width: avSize, height: avSize, margin: '0 auto 0.4rem', borderRadius: '50%', overflow: 'hidden', border: `3px solid ${COLORS[rank]}`, boxShadow: `0 0 ${big ? 28 : 16}px ${COLORS[rank]}55` }}>
                  <PodiumAvatar p={p} size={avSize - 6} />
                </div>
                <div style={{ fontSize: big ? '1.6rem' : '1.2rem' }}>{MEDALS[rank]}</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: big ? '1.6rem' : '1.2rem', color: 'var(--text)' }}>{p.username}</div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: big ? '1.4rem' : '1.05rem', color: COLORS[rank] }}>{p.points} pt · {p.drinks} drink</div>
              </div>
              <div style={{ height: stepH(rank), background: `linear-gradient(180deg, ${COLORS[rank]}, ${COLORS[rank]}44)`, borderRadius: '10px 10px 0 0', transformOrigin: 'bottom', animation: `podiumRise 0.8s ease-out ${rank * 0.35}s both`, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '0.4rem', fontFamily: 'Bebas Neue', fontSize: big ? '2.4rem' : '1.8rem', color: '#000' }}>{rank + 1}</div>
            </div>
          ))}
        </div>
        {costume && (
          <div style={{ margin: '0 auto 1.5rem', maxWidth: 360, background: 'linear-gradient(135deg, var(--hl-a), var(--hl-b))', border: '1px solid var(--accent-dim)', borderRadius: '12px', padding: '0.8rem 1rem', animation: `podiumDrop 0.6s ease-out 2s both` }}>
            <div style={{ fontSize: big ? '2.2rem' : '1.6rem' }}>🧟</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem', letterSpacing: '0.12em' }}>MIGLIOR COSTUME</div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: big ? '2rem' : '1.5rem', color: 'var(--accent)' }}>{costume.username} <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>· {costume.votes} vot{costume.votes === 1 ? 'o' : 'i'}</span></div>
          </div>
        )}
        {rest.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
            {rest.map((p, i) => (
              <div key={p.username} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem 0.9rem', animation: `podiumDrop 0.5s ease-out ${2 + i * 0.12}s both` }}>
                <span style={{ fontFamily: 'Bebas Neue', color: 'var(--faint)', width: 24 }}>{i + 4}</span>
                <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden' }}><PodiumAvatar p={p} size={30} /></div>
                <span style={{ flex: 1, fontFamily: 'Bebas Neue', fontSize: '1.05rem', color: 'var(--text)' }}>{p.username}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{p.drinks} drink</span>
                <span style={{ fontFamily: 'Bebas Neue', color: 'var(--accent)', fontSize: '1.1rem' }}>{p.points}pt</span>
              </div>
            ))}
          </div>
        )}
        {onClose && <button onClick={onClose} style={{ marginTop: '2rem', background: 'var(--border)', border: 'none', borderRadius: '8px', padding: '0.7rem 2rem', color: 'var(--muted)', fontFamily: 'Bebas Neue', fontSize: '1.2rem', cursor: 'pointer', letterSpacing: '0.05em' }}>Chiudi</button>}
      </div>
    </div>
  )
}
