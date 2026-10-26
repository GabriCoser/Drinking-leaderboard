'use client'

import { useState, useEffect, useCallback } from 'react'
import { THEMES, themeOf } from '@/lib/theme'
import { useApplyTheme, HalloweenFX } from '@/components/Theme'
import { s, api } from '@/components/ui'
import PlayerView from '@/components/PlayerView'
import AdminPanel from '@/components/AdminPanel'

const LAST_NAME_KEY = 'drinkboard:lastName'
function readLastName() { try { return localStorage.getItem(LAST_NAME_KEY) || '' } catch { return '' } }
function saveLastName(n) { try { localStorage.setItem(LAST_NAME_KEY, n) } catch {} }

// Accesso admin: password, oppure creazione password al primo avvio
function AdminLogin({ onLogin, onBack }) {
  const [needsSetup, setNeedsSetup] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { api('/api/setup').then(({ data }) => setNeedsSetup(!!data.needsSetup)).catch(() => setNeedsSetup(false)) }, [])
  async function go() {
    if (!password) return setError('Inserisci la password')
    if (needsSetup && password !== confirm) return setError('Le password non coincidono')
    setLoading(true); setError('')
    try {
      const { ok, data } = needsSetup ? await api('/api/setup', 'POST', { adminPassword: password }) : await api('/api/auth/admin', 'POST', { password })
      if (data.needsSetup) { setNeedsSetup(true); return setError('Admin non ancora configurato: crea la password') }
      if (!ok) return setError(data.error || 'Errore')
      onLogin(data)
    } catch { setError('Errore connessione') } finally { setLoading(false) }
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      <h2 style={{ fontFamily:'Bebas Neue', fontSize:'1.8rem', color:'var(--accent)', textAlign:'center' }}>{needsSetup ? '⚙️ PRIMO AVVIO: CREA ADMIN' : '🔐 AREA ADMIN'}</h2>
      {needsSetup && <p style={{ color:'var(--muted)', fontSize:'0.8rem', textAlign:'center' }}>Scegli la password dell&apos;admin: servirà per creare e chiudere gli eventi.</p>}
      <input style={s.input} type="password" autoFocus value={password} placeholder="Password admin" onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} />
      {needsSetup && <input style={s.input} type="password" value={confirm} placeholder="Ripeti password" onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} />}
      {error && <p style={{ color:'var(--danger)', fontSize:'0.85rem', textAlign:'center' }}>{error}</p>}
      <button onClick={go} disabled={loading || needsSetup===null} style={s.btn('var(--accent)','var(--accent-ink)',{width:'100%',padding:'0.8rem',fontSize:'1.3rem',opacity:loading?0.6:1})}>{loading?'...':needsSetup?'Crea admin':'Entra'}</button>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:'0.85rem', cursor:'pointer' }}>← Torna all&apos;ingresso giocatori</button>
    </div>
  )
}

function JoinScreen({ onLogin }) {
  const [mode, setMode] = useState('player')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(undefined)
  const theme = themeOf(active)
  const T = THEMES[theme]
  useApplyTheme(theme)
  useEffect(() => {
    setName(readLastName())
    api('/api/sessions').then(({ data }) => setActive(data.active || null)).catch(() => setActive(null))
  }, [])
  async function join() {
    if (!name.trim()) return setError('Scrivi il tuo nome')
    setLoading(true); setError('')
    try {
      const { ok, data } = await api('/api/auth/login', 'POST', { name })
      if (!ok) return setError(data.error || 'Errore')
      saveLastName(name.trim())
      onLogin(data)
    } catch { setError('Errore connessione') } finally { setLoading(false) }
  }
  return (
    <>
    {theme === 'halloween' && <HalloweenFX />}
    <main className="hw-content" style={{ maxWidth: 400, margin: '0 auto', padding: '4rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3.5rem', animation: theme === 'halloween' ? 'pumpkinBob 2.4s ease-in-out infinite' : undefined }}>{T.logo}</div>
        <h1 style={{ fontSize: '3.5rem', color: 'var(--accent)', lineHeight: 1 }}>{T.title[0]}</h1>
        <h1 style={{ fontSize: '3.5rem', lineHeight: 1 }}>{T.title[1]}</h1>
        {T.subtitle && <div style={{ color:'var(--muted)', letterSpacing:'0.15em', fontSize:'0.8rem', marginTop:'0.5rem' }}>{T.subtitle}</div>}
      </div>
      {mode === 'admin' ? <AdminLogin onLogin={onLogin} onBack={() => setMode('player')} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {active !== undefined && (active
            ? <div style={{ background:'color-mix(in srgb, var(--ok) 8%, var(--bg))', border:'1px solid var(--ok)', borderRadius:'10px', padding:'0.6rem 1rem', textAlign:'center' }}>
                <span style={{ color:'var(--ok)', fontSize:'0.75rem' }}>● LIVE</span> <span style={{ color:'var(--text)', fontSize:'0.9rem' }}>{active.name}</span>
                {active.participants?.length > 0 && <div style={{ color:'var(--muted)', fontSize:'0.7rem', marginTop:'0.2rem' }}>🙋 {active.participants.length} già dentro</div>}
              </div>
            : <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'10px', padding:'0.6rem 1rem', textAlign:'center', color:'var(--muted)', fontSize:'0.85rem' }}>Nessun evento in corso: puoi entrare lo stesso</div>)}
          <div>
            <label style={s.label}>{theme === 'halloween' ? 'Come ti chiami, mortale?' : 'Come ti chiami?'}</label>
            <input style={{ ...s.input, fontSize:'1.2rem', padding:'0.9rem 1rem' }} autoFocus value={name} maxLength={20} placeholder="es. Mario" autoCapitalize="words" autoComplete="nickname" onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&join()} />
            <p style={{ color:'var(--faint)', fontSize:'0.72rem', marginTop:'0.4rem' }}>Niente password: usa sempre lo stesso nome per ritrovare i tuoi drink.</p>
          </div>
          {error && <p style={{ color:'var(--danger)', fontSize:'0.85rem', textAlign:'center' }}>{error}</p>}
          <button onClick={join} disabled={loading} style={s.btn('var(--accent)','var(--accent-ink)',{width:'100%',padding:'0.9rem',fontSize:'1.4rem',opacity:loading?0.6:1})}>{loading ? '...' : theme === 'halloween' ? '🎃 Entra nella cripta' : '🍻 Entra'}</button>
          <button onClick={() => { setMode('admin'); setError('') }} style={{ background:'none', border:'none', color:'var(--faint)', fontSize:'0.8rem', cursor:'pointer', marginTop:'1.5rem' }}>🔐 Area admin</button>
        </div>
      )}
    </main>
    </>
  )
}

export default function Home() {
  const [state, setState] = useState('loading')
  const [user, setUser] = useState(null)
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})
    api('/api/auth/me')
      .then(({ data }) => { if (data.user) { setUser(data.user); setState(data.user.role==='admin'?'admin':'player') } else setState('login') })
      .catch(() => setState('login'))
  }, [])
  const handleLogin = useCallback(u => { setUser(u); setState(u.role==='admin'?'admin':'player') }, [])
  const handleLogout = useCallback(() => { setUser(null); setState('login') }, [])
  if (state==='loading') return <main style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}><div style={{ textAlign:'center' }}><div style={{ fontSize:'3rem' }}>🍺</div><p style={{ color:'var(--muted)' }}>Caricamento...</p></div></main>
  if (state==='login') return <JoinScreen onLogin={handleLogin} />
  if (state==='admin') return <AdminPanel onLogout={handleLogout} />
  return <PlayerView user={user} onLogout={handleLogout} />
}
