'use client'
import { useState, useEffect, useCallback } from 'react'
const MEDAL = ['🥇', '🥈', '🥉']
const DRINKS_EMOJI = ['🍺', '🍻', '🥂', '🍷', '🥃', '🍹']
const s = {
  btn: (bg, color = '#fff', extra = {}) => ({ background: bg, color, border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.05em', ...extra }),
  input: { width: '100%', background: '#242424', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '0.7rem 1rem', color: '#f0f0f0', fontSize: '1rem', outline: 'none' },
  card: (gold = false) => ({ background: gold ? 'linear-gradient(135deg, #1e1a00, #2a2200)' : '#1a1a1a', border: `1px solid ${gold ? '#c9a014' : '#2e2e2e'}`, borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }),
  label: { color: '#888', fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' },
}
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function handleLogin() {
    if (!username || !password) return setError('Compila tutti i campi')
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Errore')
      onLogin(data)
    } catch { setError('Errore di connessione') } finally { setLoading(false) }
  }
  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '4rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '3rem' }}>🍺</div>
        <h1 style={{ fontSize: '3.5rem', color: '#F5C518', lineHeight: 1 }}>DRINKING</h1>
        <h1 style={{ fontSize: '3.5rem', lineHeight: 1 }}>LEADERBOARD</h1>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div><label style={s.label}>Username</label><input style={s.input} value={username} placeholder="es. mario" onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
        <div><label style={s.label}>Password</label><input style={s.input} type="password" value={password} placeholder="..." onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
        {error && <p style={{ color: '#e03c3c', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}
        <button onClick={handleLogin} disabled={loading} style={s.btn('#F5C518', '#000', { width: '100%', padding: '0.8rem', fontSize: '1.3rem', opacity: loading ? 0.6 : 1 })}>{loading ? 'Accesso...' : 'Entra'}</button>
      </div>
    </main>
  )
}
function SetupScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function handleSetup() {
    if (!password) return
    setLoading(true)
    try {
      const res = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPassword: password }) })
      const data = await res.json()
      if (!res.ok) return setError(data.error)
      onDone()
    } catch { setError('Errore') } finally { setLoading(false) }
  }
  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '4rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
      <h1 style={{ fontSize: '2.5rem', color: '#F5C518', marginBottom: '0.5rem' }}>SETUP INIZIALE</h1>
      <p style={{ color: '#888', marginBottom: '2rem', fontSize: '0.9rem' }}>Crea la password per l admin</p>
      <input style={s.input} type="password" value={password} placeholder="Password admin..." onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSetup()} />
      {error && <p style={{ color: '#e03c3c', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
      <button onClick={handleSetup} disabled={loading} style={s.btn('#F5C518', '#000', { width: '100%', padding: '0.8rem', fontSize: '1.3rem', marginTop: '1rem', opacity: loading ? 0.6 : 1 })}>{loading ? 'Creazione...' : 'Crea Admin'}</button>
    </main>
  )
}
function AdminPanel({ onLogout }) {
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('players')
  const [newUser, setNewUser] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const loadUsers = useCallback(async () => { const res = await fetch('/api/admin'); const data = await res.json(); setUsers(data.users || []) }, [])
  useEffect(() => { loadUsers() }, [loadUsers])
  async function addUser() {
    if (!newUser.username || !newUser.password) return
    setLoading(true)
    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) })
    const data = await res.json()
    setLoading(false)
    if (res.ok) { setMsg('Aggiunto ' + data.user.username); setNewUser({ username: '', password: '' }); loadUsers() } else { setMsg(data.error) }
    setTimeout(() => setMsg(''), 3000)
  }
  async function removeUser(username) {
    if (!confirm('Eliminare ' + username + '?')) return
    await fetch('/api/admin', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) })
    loadUsers()
  }
  async function updateDrinks(username, drinks) {
    await fetch('/api/admin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', username, drinks }) })
    loadUsers()
  }
  async function resetAll() {
    if (!confirm('Resettare tutti i punteggi?')) return
    await fetch('/api/admin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset' }) })
    loadUsers()
  }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); onLogout() }
  const players = users.filter(u => u.role !== 'admin').sort((a, b) => b.drinks - a.drinks)
  const totalDrinks = players.reduce((sum, p) => sum + p.drinks, 0)
  return (
    <main style={{ maxWidth: 500, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div><h1 style={{ fontSize: '2.5rem', color: '#F5C518', lineHeight: 1 }}>ADMIN</h1><p style={{ color: '#888', fontSize: '0.8rem' }}>Pannello di controllo</p></div>
        <button onClick={logout} style={s.btn('#2e2e2e', '#888', { fontSize: '0.85rem', padding: '0.4rem 0.8rem' })}>Esci</button>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[['players', 'Giocatori'], ['add', 'Aggiungi'], ['stats', 'Stats']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={s.btn(tab === key ? '#F5C518' : '#1a1a1a', tab === key ? '#000' : '#888', { flex: 1, fontSize: '0.85rem', border: '1px solid #2e2e2e' })}>{label}</button>
        ))}
      </div>
      {tab === 'players' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={resetAll} style={s.btn('#2e2e2e', '#e03c3c', { alignSelf: 'flex-end', fontSize: '0.85rem' })}>Reset punteggi</button>
          {players.length === 0 && <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Nessun giocatore</p>}
          {players.map((player, i) => (
            <div key={player.username} style={s.card(i === 0)}>
              <span style={{ width: 32, textAlign: 'center', fontFamily: 'Bebas Neue', fontSize: i < 3 ? '1.4rem' : '1.1rem' }}>{i < 3 ? MEDAL[i] : i + 1}</span>
              <span style={{ fontSize: '1.3rem' }}>{DRINKS_EMOJI[i % DRINKS_EMOJI.length]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: i === 0 ? '#F5C518' : '#f0f0f0' }}>{player.username}</div>
                <div style={{ color: '#888', fontSize: '0.75rem' }}>{player.drinks} drinks</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button onClick={() => updateDrinks(player.username, player.drinks - 1)} style={s.btn('#2e2e2e', '#f0f0f0', { padding: '0.3rem 0.7rem' })}>-</button>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', minWidth: 30, textAlign: 'center' }}>{player.drinks}</span>
                <button onClick={() => updateDrinks(player.username, player.drinks + 1)} style={s.btn('#F5C518', '#000', { padding: '0.3rem 0.7rem' })}>+</button>
                <button onClick={() => removeUser(player.username)} style={s.btn('#2e2e2e', '#e03c3c', { padding: '0.3rem 0.6rem', fontSize: '0.8rem' })}>X</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'add' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><label style={s.label}>Username</label><input style={s.input} value={newUser.username} placeholder="es. mario" onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} /></div>
          <div><label style={s.label}>Password</label><input style={s.input} type="password" value={newUser.password} placeholder="..." onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} /></div>
          {msg && <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#F5C518' }}>{msg}</p>}
          <button onClick={addUser} disabled={loading} style={s.btn('#F5C518', '#000', { width: '100%', padding: '0.8rem', fontSize: '1.3rem', opacity: loading ? 0.6 : 1 })}>{loading ? 'Aggiunta...' : 'Aggiungi Giocatore'}</button>
        </div>
      )}
      {tab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[{ label: 'Giocatori totali', value: players.length, emoji: '👥' }, { label: 'Drinks totali', value: totalDrinks, emoji: '🍺' }, { label: 'Media drinks', value: players.length ? (totalDrinks / players.length).toFixed(1) : 0, emoji: '📊' }, { label: 'Leader', value: players[0]?.username || '-', emoji: '🥇' }].map(stat => (
            <div key={stat.label} style={{ ...s.card(), justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span style={{ fontSize: '1.5rem' }}>{stat.emoji}</span><span style={{ color: '#888', fontSize: '0.9rem' }}>{stat.label}</span></div>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: '#F5C518' }}>{stat.value}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
function PlayerView({ user, onLogout }) {
  const [players, setPlayers] = useState([])
  const [myDrinks, setMyDrinks] = useState(user.drinks)
  const loadPlayers = useCallback(async () => {
    const res = await fetch('/api/players'); const data = await res.json(); setPlayers(data.players || [])
    const me = data.players?.find(p => p.username === user.username); if (me) setMyDrinks(me.drinks)
  }, [user.username])
  useEffect(() => { loadPlayers(); const i = setInterval(loadPlayers, 10000); return () => clearInterval(i) }, [loadPlayers])
  async function addDrink() {
    const n = myDrinks + 1; setMyDrinks(n)
    await fetch('/api/players', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username, drinks: n }) })
    loadPlayers()
  }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); onLogout() }
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div><h1 style={{ fontSize: '3rem', color: '#F5C518', lineHeight: 1 }}>DRINKING</h1><h1 style={{ fontSize: '3rem', lineHeight: 1 }}>LEADERBOARD</h1></div>
        <button onClick={logout} style={s.btn('#2e2e2e', '#888', { fontSize: '0.8rem', padding: '0.4rem 0.8rem' })}>Esci</button>
      </div>
      <div style={{ background: 'linear-gradient(135deg, #1e1a00, #2a2200)', border: '2px solid #c9a014', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Ciao, {user.username}!</p>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '4rem', color: '#F5C518', lineHeight: 1 }}>{myDrinks}</div>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>drinks bevuti</p>
        <button onClick={addDrink} style={s.btn('#F5C518', '#000', { width: '100%', padding: '0.9rem', fontSize: '1.5rem', borderRadius: '12px' })}>🍺 +1 Drink</button>
      </div>
      <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#888', marginBottom: '0.75rem' }}>CLASSIFICA</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {players.map((player, i) => (
          <div key={player.username} style={s.card(player.username === user.username)}>
            <span style={{ width: 28, textAlign: 'center' }}>{i < 3 ? <span style={{ fontSize: '1.2rem' }}>{MEDAL[i]}</span> : <span style={{ color: '#888', fontFamily: 'Bebas Neue' }}>{i + 1}</span>}</span>
            <span style={{ fontSize: '1.2rem' }}>{DRINKS_EMOJI[i % DRINKS_EMOJI.length]}</span>
            <div style={{ flex: 1 }}><div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: player.username === user.username ? '#F5C518' : '#f0f0f0' }}>{player.username}{player.username === user.username ? ' (tu)' : ''}</div></div>
            <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: i === 0 ? '#F5C518' : '#f0f0f0' }}>{player.drinks}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: '2rem', color: '#2e2e2e', fontSize: '0.75rem' }}>bevi responsabilmente 🫡</div>
    </main>
  )
}
export default function Home() {
  const [state, setState] = useState('loading')
  const [user, setUser] = useState(null)
  useEffect(() => {
    async function init() {
      try {
        const setupRes = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminPassword: '__check__' }) })
        const setupData = await setupRes.json()
        if (setupData.error === 'Setup già completato') {
          const meRes = await fetch('/api/auth/me'); const meData = await meRes.json()
          if (meData.user) { setUser(meData.user); setState(meData.user.role === 'admin' ? 'admin' : 'player') } else { setState('login') }
        } else { setState('setup') }
      } catch { setState('login') }
    }
    init()
  }, [])
  function handleLogin(userData) { setUser(userData); setState(userData.role === 'admin' ? 'admin' : 'player') }
  function handleLogout() { setUser(null); setState('login') }
  if (state === 'loading') return <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '3rem' }}>🍺</div><p style={{ color: '#888' }}>Caricamento...</p></div></main>
  if (state === 'setup') return <SetupScreen onDone={() => setState('login')} />
  if (state === 'login') return <LoginScreen onLogin={handleLogin} />
  if (state === 'admin') return <AdminPanel onLogout={handleLogout} />
  if (state === 'player') return <PlayerView user={user} onLogout={handleLogout} />
}
