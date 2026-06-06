'use client'

import { useState, useEffect, useCallback } from 'react'
const MEDAL = ['🥇', '🥈', '🥉']
const s = {
  btn: (bg, color = '#fff', extra = {}) => ({ background: bg, color, border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.05em', ...extra }),
  input: { width: '100%', background: '#242424', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '0.7rem 1rem', color: '#f0f0f0', fontSize: '1rem', outline: 'none' },
  card: (gold = false, extra = {}) => ({ background: gold ? 'linear-gradient(135deg, #1e1a00, #2a2200)' : '#1a1a1a', border: `1px solid ${gold ? '#c9a014' : '#2e2e2e'}`, borderRadius: '14px', padding: '1rem 1.25rem', ...extra }),
  label: { color: '#888', fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' },
}
function calcBAC(log, info, now = Date.now()) {
  if (!info?.weight || !log.length) return 0
  const { weight, height, age, sex } = info
  let r = sex === 'M' ? (2.447 - 0.09516*age + 0.1074*height + 0.3362*weight)/weight : (-2.097 + 0.1069*height + 0.2466*weight)/weight
  r = Math.max(0.5, Math.min(0.85, r))
  const META = 0.015/3600000, ABS = 30*60000
  return Math.max(0, log.reduce((t, d) => {
    const e = now - d.timestamp; if (e < 0) return t
    const g = d.ml*(d.abv/100)*0.789, peak = (g/(weight*1000*r))*100
    const abs = e < ABS ? e/ABS : 1, met = META*Math.max(0, e-ABS)
    return t + Math.max(0, peak*abs - met)
  }, 0))
}
function bacStatus(b) {
  if (b < 0.02) return { label: 'Sobrio', color: '#3ce08a' }
  if (b < 0.05) return { label: 'Leggero', color: '#F5C518' }
  if (b < 0.08) return { label: 'Moderato', color: '#ff9500' }
  if (b < 0.15) return { label: 'Alterato', color: '#e03c3c' }
  return { label: 'Molto alterato', color: '#9b0000' }
}
async function compressAndUpload(file, type, sessionId = null) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  if (sessionId) formData.append('sessionId', String(sessionId))
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  return await res.json()
}
function fmtTime(ts) { return new Date(ts).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) }
function fmtDate(ts) { return new Date(ts).toLocaleDateString('it-IT',{day:'2-digit',month:'short'}) }
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function handle() {
    if (!username || !password) return setError('Compila tutti i campi')
    setLoading(true); setError('')
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Errore')
      if (mode === 'register') {
        const lr = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
        const ld = await lr.json(); if (lr.ok) onLogin(ld)
      } else onLogin(data)
    } catch { setError('Errore connessione') } finally { setLoading(false) }
  }
  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: '4rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '3rem' }}>🍺</div>
        <h1 style={{ fontSize: '3.5rem', color: '#F5C518', lineHeight: 1 }}>DRINKING</h1>
        <h1 style={{ fontSize: '3.5rem', lineHeight: 1 }}>LEADERBOARD</h1>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[['login','Accedi'],['register','Registrati']].map(([k,l]) => (
          <button key={k} onClick={() => { setMode(k); setError('') }} style={s.btn(mode===k?'#F5C518':'#1a1a1a',mode===k?'#000':'#888',{flex:1,border:'1px solid #2e2e2e'})}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div><label style={s.label}>Username</label><input style={s.input} value={username} placeholder="es. mario" onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} /></div>
        <div><label style={s.label}>Password</label><input style={s.input} type="password" value={password} placeholder="..." onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} /></div>
        {error && <p style={{ color:'#e03c3c', fontSize:'0.85rem', textAlign:'center' }}>{error}</p>}
        <button onClick={handle} disabled={loading} style={s.btn('#F5C518','#000',{width:'100%',padding:'0.8rem',fontSize:'1.3rem',opacity:loading?0.6:1})}>{loading?'...':mode==='login'?'Entra':'Crea Account'}</button>
      </div>
    </main>
  )
}
function SetupScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function go() {
    if (!password) return; setLoading(true)
    try {
      const res = await fetch('/api/setup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({adminPassword:password}) })
      const d = await res.json(); if (!res.ok) return setError(d.error); onDone()
    } catch { setError('Errore') } finally { setLoading(false) }
  }
  return (
    <main style={{ maxWidth:400, margin:'0 auto', padding:'4rem 1rem', textAlign:'center' }}>
      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>⚙️</div>
      <h1 style={{ fontSize:'2.5rem', color:'#F5C518', marginBottom:'0.5rem' }}>SETUP INIZIALE</h1>
      <p style={{ color:'#888', marginBottom:'2rem', fontSize:'0.9rem' }}>Crea la password per l admin</p>
      <input style={s.input} type="password" value={password} placeholder="Password admin..." onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} />
      {error && <p style={{ color:'#e03c3c', fontSize:'0.85rem', marginTop:'0.5rem' }}>{error}</p>}
      <button onClick={go} disabled={loading} style={s.btn('#F5C518','#000',{width:'100%',padding:'0.8rem',fontSize:'1.3rem',marginTop:'1rem',opacity:loading?0.6:1})}>{loading?'...':'Crea Admin'}</button>
    </main>
  )
}
function PlayerView({ user, onLogout }) {
  const [tab, setTab] = useState('home')
  const [players, setPlayers] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [sessions, setSessions] = useState([])
  const [drinks, setDrinks] = useState([])
  const [myLog, setMyLog] = useState([])
  const [bacInfo, setBacInfo] = useState(null)
  const [food, setFood] = useState('non_specificato')
  const [now, setNow] = useState(Date.now())
  const [selectedSession, setSelectedSession] = useState(null)
  const [viewingPlayer, setViewingPlayer] = useState(null)
  const [bacForm, setBacForm] = useState({ weight:'', height:'', age:'', sex:'M' })
  const [bacSaved, setBacSaved] = useState(false)
  const [confirmDrink, setConfirmDrink] = useState(null)
  const [viewingPlayer, setViewingPlayer] = useState(null)
  const [confirmDrink, setConfirmDrink] = useState(null)
  const [avatar, setAvatar] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sessionPhotos, setSessionPhotos] = useState([])
  const load = useCallback(async () => {
    const [pr, dr, lr, sr] = await Promise.all([
      fetch('/api/players').then(r=>r.json()),
      fetch('/api/drinks').then(r=>r.json()),
      fetch('/api/log').then(r=>r.json()),
      fetch('/api/sessions').then(r=>r.json()),
    ])
    setPlayers(pr.players||[]); setActiveSession(pr.activeSession)
    setDrinks(dr.drinks||[]); setMyLog(lr.log||[])
    setSessions(sr.sessions||[])
    const me = pr.players?.find(p=>p.username===user.username)
    if (me?.bac_info) { setBacInfo(me.bac_info); setBacForm(me.bac_info) }
    if (me?.avatar) setAvatar(me.avatar)
    if (pr.activeSession) {
      fetch('/api/photos?sessionId='+pr.activeSession.id).then(r=>r.json()).then(d=>setSessionPhotos(d.photos||[]))
    }
  }, [user.username])
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i) }, [load])
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(i) }, [])
  async function addDrink(drink) {
    if (!activeSession) return alert('Nessuna serata attiva!')
    setConfirmDrink(drink); return
    //await fetch('/api/log', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({drink, foodContext:food}) })
    load()
  }
  async function removeDrink(id) {
    await fetch('/api/log', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({entryId:id}) })
    load()
  }
  async function saveBac() {
    if (!bacForm.weight||!bacForm.height||!bacForm.age) return
    const info = { weight:parseFloat(bacForm.weight), height:parseFloat(bacForm.height), age:parseInt(bacForm.age), sex:bacForm.sex }
    await fetch('/api/bac', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(info) })
    setBacInfo(info); setBacSaved(true); setTimeout(()=>setBacSaved(false),2000); load()
  }
  async function logout() { await fetch('/api/auth/logout',{method:'POST'}); onLogout() }
  const me = players.find(p=>p.username===user.username)
  const myPoints = me?.points||0
  const myRank = players.findIndex(p=>p.username===user.username)+1
  const sessionLog = activeSession ? myLog.filter(e=>e.sessionId===activeSession.id) : []
  const bac = calcBAC(sessionLog, bacInfo, now)
  const bacOverall = calcBAC(myLog, bacInfo, now)
  const bs = bacStatus(bac)
  const viewLog = selectedSession ? myLog.filter(e=>e.sessionId===selectedSession) : myLog
  return (
    <>
    {confirmDrink && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
        <div style={{background:'#1a1a1a',border:'1px solid #F5C518',borderRadius:'16px',padding:'2rem',maxWidth:320,width:'100%',textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>{confirmDrink.emoji}</div>
          <h2 style={{fontFamily:'Bebas Neue',fontSize:'2rem',color:'#F5C518',marginBottom:'0.25rem'}}>{confirmDrink.name}</h2>
          <p style={{color:'#888',fontSize:'0.85rem',marginBottom:'1.5rem'}}>{confirmDrink.ml}ml / {confirmDrink.abv}% / {confirmDrink.points} punti</p>
          <div style={{display:'flex',gap:'0.75rem'}}>
            <button onClick={()=>setConfirmDrink(null)} style={{flex:1,background:'#2e2e2e',border:'none',borderRadius:'8px',padding:'0.8rem',color:'#888',fontFamily:'Bebas Neue',fontSize:'1.2rem',cursor:'pointer'}}>Annulla</button>
            <button onClick={async()=>{const d=confirmDrink;setConfirmDrink(null);await fetch('/api/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({drink:d,foodContext:food})});load()}} style={{flex:1,background:'#F5C518',border:'none',borderRadius:'8px',padding:'0.8rem',color:'#000',fontFamily:'Bebas Neue',fontSize:'1.2rem',cursor:'pointer'}}>Aggiungi</button>
          </div>
        </div>
      </div>
    )}
    <main style={{ maxWidth:480, margin:'0 auto', padding:'0 0 5rem' }}>
      <div style={{ padding:'1.5rem 1rem 0.5rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div><h1 style={{ fontSize:'2rem', color:'#F5C518', lineHeight:1 }}>DRINKING</h1><h1 style={{ fontSize:'2rem', lineHeight:1 }}>LEADERBOARD</h1></div>
        <button onClick={logout} style={s.btn('#2e2e2e','#888',{fontSize:'0.8rem',padding:'0.4rem 0.8rem'})}>Esci</button>
      </div>
      {activeSession
        ? <div style={{ margin:'0 1rem 1rem', background:'#0d2200', border:'1px solid #3ce08a', borderRadius:'8px', padding:'0.5rem 1rem', display:'flex', gap:'0.5rem', alignItems:'center' }}><span style={{ color:'#3ce08a', fontSize:'0.75rem' }}>● LIVE</span><span style={{ color:'#f0f0f0', fontSize:'0.85rem' }}>{activeSession.name}</span></div>
        : <div style={{ margin:'0 1rem 1rem', background:'#1a1a1a', border:'1px solid #2e2e2e', borderRadius:'8px', padding:'0.5rem 1rem' }}><span style={{ color:'#888', fontSize:'0.85rem' }}>Nessuna serata attiva</span></div>
      }
      <div style={{ display:'flex', gap:'0.4rem', padding:'0 1rem 1rem', overflowX:'auto' }}>
        {[['home','🏠'],['drinks','🍺'],['log','📋'],['board','🏆'],['photos','📸'],['profile','👤']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={s.btn(tab===k?'#F5C518':'#1a1a1a',tab===k?'#000':'#888',{flex:1,fontSize:'1.2rem',padding:'0.5rem',border:'1px solid #2e2e2e',minWidth:50})}>{l}</button>
        ))}
      </div>
      <div style={{ padding:'0 1rem' }}>
        {tab==='home' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={s.card(true)}>
              <p style={{ color:'#888', fontSize:'0.85rem' }}>Ciao, {user.username}!</p>
              <div style={{ display:'flex', gap:'1rem', marginTop:'0.5rem' }}>
                <div><div style={{ fontFamily:'Bebas Neue', fontSize:'3rem', color:'#F5C518', lineHeight:1 }}>{myPoints}</div><div style={{ color:'#888', fontSize:'0.75rem' }}>punti totali</div></div>
                <div><div style={{ fontFamily:'Bebas Neue', fontSize:'3rem', color:'#f0f0f0', lineHeight:1 }}>#{myRank||'-'}</div><div style={{ color:'#888', fontSize:'0.75rem' }}>posizione</div></div>
                <div><div style={{ fontFamily:'Bebas Neue', fontSize:'3rem', color:'#f0f0f0', lineHeight:1 }}>{sessionLog.length}</div><div style={{ color:'#888', fontSize:'0.75rem' }}>drink stasera</div></div>
              </div>
            </div>
            {bacInfo ? (
              <div style={{ ...s.card(), borderColor:bs.color }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ color:'#888', fontSize:'0.75rem' }}>BAC SERATA</p>
                    <div style={{ fontFamily:'Bebas Neue', fontSize:'2.5rem', color:bs.color, lineHeight:1 }}>{bac.toFixed(3)}%</div>
                    <span style={{ background:bs.color+'22', color:bs.color, fontSize:'0.75rem', padding:'0.2rem 0.5rem', borderRadius:'4px' }}>{bs.label}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ color:'#888', fontSize:'0.7rem' }}>BAC OVERALL</p>
                    <div style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'#888' }}>{bacOverall.toFixed(3)}%</div>
                  </div>
                </div>
                <p style={{ color:'#555', fontSize:'0.65rem', marginTop:'0.5rem' }}>Stima indicativa. Non guidare.</p>
              </div>
            ) : (
              <div style={{ ...s.card(), textAlign:'center', padding:'1.5rem' }}>
                <p style={{ color:'#888', fontSize:'0.9rem', marginBottom:'0.75rem' }}>Imposta i dati nel profilo per vedere il BAC</p>
                <button onClick={()=>setTab('profile')} style={s.btn('#2e2e2e','#F5C518',{fontSize:'0.9rem'})}>Vai al profilo</button>
              </div>
            )}
            <button onClick={()=>setTab('drinks')} style={s.btn('#F5C518','#000',{width:'100%',padding:'1rem',fontSize:'1.5rem',borderRadius:'12px'})}>🍺 Aggiungi drink</button>
          </div>
        )}
        {tab==='drinks' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {!activeSession && <div style={{ background:'#2a1500', border:'1px solid #e03c3c', borderRadius:'8px', padding:'0.75rem', color:'#e03c3c', fontSize:'0.85rem' }}>Nessuna serata attiva</div>}
            <div><label style={s.label}>Contesto cibo</label>
              <select value={food} onChange={e=>setFood(e.target.value)} style={{ ...s.input, appearance:'none' }}>
                <option value="non_specificato">Non specificato</option>
                <option value="stomaco_vuoto">Stomaco vuoto</option>
                <option value="cibo_leggero">Cibo leggero</option>
                <option value="pasto_completo">Pasto completo</option>
              </select>
            </div>
            {drinks.map(drink => (
              <button key={drink.id} onClick={()=>addDrink(drink)} disabled={!activeSession} style={{ ...s.card(), display:'flex', alignItems:'center', gap:'1rem', border:'1px solid #2e2e2e', cursor:activeSession?'pointer':'not-allowed', opacity:activeSession?1:0.5, width:'100%', textAlign:'left' }}>
                <span style={{ fontSize:'1.8rem' }}>{drink.emoji}</span>
                <div style={{ flex:1 }}><div style={{ color:'#f0f0f0', fontSize:'1rem', fontWeight:600 }}>{drink.name}</div><div style={{ color:'#888', fontSize:'0.75rem' }}>{drink.ml}ml / {drink.abv}%</div></div>
                <div style={{ textAlign:'right' }}><div style={{ fontFamily:'Bebas Neue', fontSize:'1.4rem', color:'#F5C518' }}>{drink.points}</div><div style={{ color:'#888', fontSize:'0.7rem' }}>punti</div></div>
              </button>
            ))}
          </div>
        )}
        {tab==='log' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <div><label style={s.label}>Filtra serata</label>
              <select value={selectedSession||''} onChange={e=>setSelectedSession(e.target.value?parseInt(e.target.value):null)} style={{ ...s.input, appearance:'none' }}>
                <option value="">Tutte</option>
                {sessions.map(ss=><option key={ss.id} value={ss.id}>{ss.name}{ss.active?' (in corso)':''}</option>)}
              </select>
            </div>
            {viewLog.length===0 && <p style={{ color:'#888', textAlign:'center', padding:'2rem' }}>Nessun drink</p>}
            {viewLog.map(e => (
              <div key={e.id} style={{ ...s.card(), display:'flex', alignItems:'center', gap:'1rem' }}>
                <span style={{ fontSize:'1.5rem' }}>{e.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:'#f0f0f0', fontSize:'0.95rem', fontWeight:600 }}>{e.name}</div>
                  <div style={{ color:'#888', fontSize:'0.7rem' }}>{e.ml}ml / {fmtDate(e.timestamp)} {fmtTime(e.timestamp)}</div>
                </div>
                <div style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#F5C518', marginRight:'0.5rem' }}>{e.points}pt</div>
                <button onClick={()=>removeDrink(e.id)} style={s.btn('#2e2e2e','#e03c3c',{padding:'0.3rem 0.6rem',fontSize:'0.8rem'})}>X</button>
              </div>
            ))}
          </div>
        )}
        {tab==='board' && (
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            <div><label style={s.label}>Visualizza</label>
              <select value={selectedSession||''} onChange={e=>setSelectedSession(e.target.value?parseInt(e.target.value):null)} style={{...s.input,appearance:'none'}}>
                <option value="">Classifica generale</option>
                {sessions.map(ss=><option key={ss.id} value={ss.id}>{ss.name}{ss.active?' (in corso)':''}</option>)}
              </select>
            </div>
            {players.map((player,i)=>{
              const pts=selectedSession?(player.sessionLog||[]).filter(e=>e.sessionId===selectedSession).reduce((s,e)=>s+e.points,0):player.points
              const dks=selectedSession?(player.sessionLog||[]).filter(e=>e.sessionId===selectedSession).length:player.drinks
              const isMe=player.username===user.username
              const pBac=player.bac_info?calcBAC(selectedSession?(player.sessionLog||[]).filter(e=>e.sessionId===selectedSession):(player.sessionLog||[]),player.bac_info,now):null
              const pLog=selectedSession?(player.sessionLog||[]).filter(e=>e.sessionId===selectedSession):(player.sessionLog||[])
              const open=viewingPlayer===player.username
              return <div key={player.username} style={s.card(isMe,{border:isMe?'1px solid #F5C518':'1px solid #2e2e2e'})}>
                <div style={{display:'flex',alignItems:'center',gap:'1rem',cursor:'pointer'}} onClick={()=>setViewingPlayer(open?null:player.username)}>
                  <span style={{width:36,height:36,background:i<3?'#F5C518':'#2e2e2e',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:'1rem',color:i<3?'#000':'#888',flexShrink:0}}>{i<3?['👑','2','3'][i]:i+1}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:isMe?'#F5C518':'#f0f0f0'}}>{player.username} <span style={{fontSize:'0.7rem',color:'#555'}}>{open?'▲':'▼'}</span>{isMe&&<span style={{background:'#F5C518',color:'#000',fontSize:'0.6rem',padding:'0.1rem 0.3rem',borderRadius:'3px',marginLeft:'0.5rem'}}>TU</span>}</div>
                    <div style={{color:'#888',fontSize:'0.75rem'}}>{dks} drink{pBac!==null?' / BAC '+pBac.toFixed(3)+'%':''}</div>
                  </div>
                  <div style={{fontFamily:'Bebas Neue',fontSize:'1.8rem',color:i===0?'#F5C518':'#f0f0f0'}}>{pts}</div>
                </div>
                {open&&<div style={{marginTop:'0.75rem',borderTop:'1px solid #2e2e2e',paddingTop:'0.5rem'}}>
                  {pLog.length===0?<p style={{color:'#555',fontSize:'0.8rem',textAlign:'center'}}>Nessun drink</p>:pLog.map((e,ei)=><div key={ei} style={{display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.3rem 0',borderBottom:'1px solid #1a1a1a'}}>
                    <span>{e.emoji}</span>
                    <div style={{flex:1}}><div style={{color:'#f0f0f0',fontSize:'0.8rem'}}>{e.name}</div><div style={{color:'#555',fontSize:'0.65rem'}}>{fmtDate(e.timestamp)} {fmtTime(e.timestamp)}</div></div>
                    <div style={{fontFamily:'Bebas Neue',color:'#F5C518',fontSize:'0.9rem'}}>{e.points}pt</div>
                  </div>)}
                </div>}
              </div>
            })}
          </div>
        )}
                {tab==='photos' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {activeSession && (
              <div style={s.card()}>
                <h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#F5C518', marginBottom:'0.75rem' }}>AGGIUNGI FOTO</h3>
                <label style={{ cursor:'pointer', display:'block', textAlign:'center', background:'#2e2e2e', border:'2px dashed #888', borderRadius:'12px', padding:'1.5rem', color:'#888', fontSize:'0.9rem' }}>
                  {uploading ? '📤 Caricamento...' : '📸 Tocca per aggiungere foto alla serata'}
                  <input type='file' accept='image/*' style={{ display:'none' }} onChange={async e => {
                    setUploading(true)
                    await compressAndUpload(file, 'session', activeSession.id)
                    const d = await fetch('/api/photos?sessionId='+activeSession.id).then(r=>r.json())
                    setSessionPhotos(d.photos||[])
                    setUploading(false)
                  }} />
                </label>
              </div>
            )}
            <h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#888' }}>FOTO SERATA</h3>
            {sessionPhotos.length === 0 && <p style={{ color:'#888', textAlign:'center', padding:'2rem' }}>Nessuna foto ancora</p>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
              {sessionPhotos.map((photo, i) => (
                <div key={i} style={{ position:'relative', borderRadius:'8px', overflow:'hidden', aspectRatio:'1' }}>
                  <img src={photo.url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.6)', padding:'0.25rem 0.5rem', fontSize:'0.65rem', color:'#f0f0f0' }}>{photo.username}</div>
                  {(photo.username === user.username) && (
                    <button onClick={async () => {
                      await fetch('/api/photos', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({url:photo.url, sessionId:activeSession?.id}) })
                      const d = await fetch('/api/photos?sessionId='+activeSession?.id).then(r=>r.json())
                      setSessionPhotos(d.photos||[])
                    }} style={{ position:'absolute', top:'0.25rem', right:'0.25rem', background:'rgba(0,0,0,0.7)', border:'none', borderRadius:'50%', width:24, height:24, color:'#e03c3c', cursor:'pointer', fontSize:'0.75rem' }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='profile' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={s.card()}>
              <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:'#2e2e2e', margin:'0 auto 0.75rem', overflow:'hidden', border:'2px solid #F5C518' }}>
                {avatar ? <img src={avatar} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem' }}>👤</div>}
              </div>
              <label style={{ cursor:'pointer', color:'#F5C518', fontSize:'0.85rem', background:'#2e2e2e', padding:'0.4rem 1rem', borderRadius:'8px' }}>
                {uploading ? 'Caricamento...' : 'Cambia foto'}
                <input type='file' accept='image/*' style={{ display:'none' }} onChange={async e => {
                  setUploading(true)
                  const data = await compressAndUpload(file, 'avatar')
                  if (data.url) setAvatar(data.url)
                  setUploading(false)
                }} />
              </label>
            </div>
            <h2 style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'#F5C518', marginBottom:'1rem' }}>DATI BAC</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  {[['M','Maschio'],['F','Femmina']].map(([v,l]) => (
                    <button key={v} onClick={()=>setBacForm(f=>({...f,sex:v}))} style={s.btn(bacForm.sex===v?'#F5C518':'#2e2e2e',bacForm.sex===v?'#000':'#888',{flex:1,fontSize:'0.9rem'})}>{l}</button>
                  ))}
                </div>
                <div><label style={s.label}>Peso (kg)</label><input style={s.input} type="number" value={bacForm.weight} placeholder="es. 75" onChange={e=>setBacForm(f=>({...f,weight:e.target.value}))} /></div>
                <div><label style={s.label}>Altezza (cm)</label><input style={s.input} type="number" value={bacForm.height} placeholder="es. 178" onChange={e=>setBacForm(f=>({...f,height:e.target.value}))} /></div>
                <div><label style={s.label}>Eta</label><input style={s.input} type="number" value={bacForm.age} placeholder="es. 25" onChange={e=>setBacForm(f=>({...f,age:e.target.value}))} /></div>
                <button onClick={saveBac} style={s.btn('#F5C518','#000',{width:'100%',padding:'0.8rem',fontSize:'1.2rem'})}>{bacSaved?'Salvato!':'Salva dati BAC'}</button>
              </div>
            </div>
            <p style={{ color:'#555', fontSize:'0.7rem', textAlign:'center' }}>Modello Widmark. Non guidare.</p>
          </div>
        )}
      </div>
    </main>
  </>
  )
}
function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState('sessions')
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [newSessionName, setNewSessionName] = useState('')
  const [players, setPlayers] = useState([])
  const [drinks, setDrinks] = useState([])
  const [newDrink, setNewDrink] = useState({ name:'', emoji:'🍺', points:'', ml:'', abv:'' })
  const [newUser, setNewUser] = useState({ username:'', password:'' })
  const [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    const [sr, pr, dr] = await Promise.all([
      fetch('/api/sessions').then(r=>r.json()),
      fetch('/api/admin').then(r=>r.json()),
      fetch('/api/drinks').then(r=>r.json()),
    ])
    setSessions(sr.sessions||[]); setActiveSession(sr.active)
    setPlayers(pr.users||[]); setDrinks(dr.drinks||[])
  }, [])
  useEffect(() => { load() }, [load])
  function showMsg(m) { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  async function createSession() {
    if (!newSessionName) return
    await fetch('/api/sessions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:newSessionName}) })
    setNewSessionName(''); showMsg('Serata creata!'); load()
  }
  async function deleteSession(id) { if (!window.confirm("Eliminare la serata e tutti i drink?")) return; await fetch("/api/sessions", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({sessionId:id, action:"delete"}) }); showMsg("Serata eliminata"); load(); } async function closeSession(id) {
    if (!confirm('Chiudere la serata?')) return
    await fetch('/api/sessions', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({sessionId:id}) })
    showMsg('Serata chiusa'); load()
  }
  async function addDrink() {
    if (!newDrink.name||!newDrink.points||!newDrink.ml||!newDrink.abv) return showMsg('Compila tutti i campi')
    await fetch('/api/drinks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...newDrink,points:parseInt(newDrink.points),ml:parseFloat(newDrink.ml),abv:parseFloat(newDrink.abv)}) })
    setNewDrink({name:'',emoji:'🍺',points:'',ml:'',abv:''}); showMsg('Drink aggiunto!'); load()
  }
  async function removeDrink(id) {
    if (!confirm('Eliminare?')) return
    await fetch('/api/drinks', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({drinkId:id}) })
    load()
  }
  async function addUser() {
    if (!newUser.username||!newUser.password) return
    const res = await fetch('/api/admin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newUser) })
    const d = await res.json()
    if (res.ok) { showMsg(d.user.username+' aggiunto'); setNewUser({username:'',password:''}); load() } else showMsg(d.error)
  }
  async function removeUser(username) {
    if (!confirm('Eliminare '+username+'?')) return
    await fetch('/api/admin', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username}) })
    load()
  }
  async function logout() { await fetch('/api/auth/logout',{method:'POST'}); onLogout() }
  const playerList = players.filter(u=>u.role!=='admin')
  return (
    <main style={{ maxWidth:500, margin:'0 auto', padding:'2rem 1rem 5rem' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div><h1 style={{ fontSize:'2.5rem', color:'#F5C518', lineHeight:1 }}>ADMIN</h1>{activeSession&&<span style={{ color:'#3ce08a', fontSize:'0.8rem' }}>● {activeSession.name}</span>}</div>
        <button onClick={logout} style={s.btn('#2e2e2e','#888',{fontSize:'0.85rem',padding:'0.4rem 0.8rem'})}>Esci</button>
      </div>
      <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.5rem', overflowX:'auto' }}>
        {[['sessions','📅'],['players','👥'],['drinks_mgmt','🍺'],['add_user','➕']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={s.btn(tab===k?'#F5C518':'#1a1a1a',tab===k?'#000':'#888',{flex:1,fontSize:'1.2rem',border:'1px solid #2e2e2e',minWidth:50})}>{l}</button>
        ))}
      </div>
      {msg&&<div style={{ background:'#1a2200', border:'1px solid #3ce08a', borderRadius:'8px', padding:'0.5rem 1rem', marginBottom:'1rem', color:'#3ce08a', fontSize:'0.85rem' }}>{msg}</div>}
      {tab==='sessions'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div style={s.card()}><h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#F5C518', marginBottom:'0.5rem' }}>NUOVA SERATA</h3>
            <p style={{ color:'#888', fontSize:'0.8rem', marginBottom:'0.75rem' }}>La precedente si chiude automaticamente</p>
            <input style={{ ...s.input, marginBottom:'0.75rem' }} value={newSessionName} placeholder="es. Venerdi 6 Giugno" onChange={e=>setNewSessionName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createSession()} />
            <button onClick={createSession} style={s.btn('#F5C518','#000',{width:'100%',padding:'0.7rem'})}>Apri Serata</button>
          </div>
          <h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#888' }}>SERATE</h3>
          {[...sessions].reverse().map(sess=>(
            <div key={sess.id} style={s.card(sess.active)}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div><div style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem', color:sess.active?'#F5C518':'#f0f0f0' }}>{sess.name}</div>
                <div style={{ color:'#888', fontSize:'0.75rem' }}>Aperta: {fmtDate(sess.createdAt)} {fmtTime(sess.createdAt)}{sess.closedAt ? ' · Chiusa: '+fmtDate(sess.closedAt)+' '+fmtTime(sess.closedAt) : ''}</div><div style={{marginTop:'0.25rem'}}><span style={{background:sess.active?'#3ce08a22':'#2e2e2e',color:sess.active?'#3ce08a':'#888',fontSize:'0.7rem',padding:'0.15rem 0.5rem',borderRadius:'4px'}}>{sess.active?'● Aperta':'✕ Chiusa'}</span></div></div>
                {sess.active?<button onClick={()=>closeSession(sess.id)} style={s.btn('#2e2e2e','#e03c3c',{fontSize:'0.8rem'})}>Chiudi</button>:<button onClick={()=>deleteSession(sess.id)} style={s.btn('#2e2e2e','#e03c3c',{fontSize:'0.8rem',opacity:0.6})}>Elimina</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==='players'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {playerList.map((player,i)=>(
            <div key={player.username} style={s.card()}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <span style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem', color:'#888', width:24 }}>{i+1}</span>
                <div style={{ flex:1 }}><div style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem' }}>{player.username}</div></div>
                <button onClick={()=>removeUser(player.username)} style={s.btn('#2e2e2e','#e03c3c',{padding:'0.3rem 0.6rem',fontSize:'0.8rem'})}>X</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==='drinks_mgmt'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          <div style={s.card()}><h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#F5C518', marginBottom:'0.75rem' }}>AGGIUNGI DRINK</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              <input style={s.input} value={newDrink.name} placeholder="Nome drink" onChange={e=>setNewDrink(d=>({...d,name:e.target.value}))} />
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <input style={{ ...s.input, width:'60px' }} value={newDrink.emoji} placeholder="🍺" onChange={e=>setNewDrink(d=>({...d,emoji:e.target.value}))} />
                <input style={{ ...s.input, flex:1 }} type="number" value={newDrink.points} placeholder="Punti" onChange={e=>setNewDrink(d=>({...d,points:e.target.value}))} />
              </div>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <input style={{ ...s.input, flex:1 }} type="number" value={newDrink.ml} placeholder="ml" onChange={e=>setNewDrink(d=>({...d,ml:e.target.value}))} />
                <input style={{ ...s.input, flex:1 }} type="number" value={newDrink.abv} placeholder="% alcol" onChange={e=>setNewDrink(d=>({...d,abv:e.target.value}))} />
              </div>
              <button onClick={addDrink} style={s.btn('#F5C518','#000',{width:'100%',padding:'0.7rem'})}>Aggiungi</button>
            </div>
          </div>
          {drinks.map(drink=>(
            <div key={drink.id} style={{ ...s.card(), display:'flex', alignItems:'center', gap:'1rem' }}>
              <span style={{ fontSize:'1.5rem' }}>{drink.emoji}</span>
              <div style={{ flex:1 }}><div style={{ fontFamily:'Bebas Neue', fontSize:'1.1rem' }}>{drink.name}</div><div style={{ color:'#888', fontSize:'0.75rem' }}>{drink.ml}ml / {drink.abv}% / {drink.points}pt</div></div>
              <button onClick={()=>removeDrink(drink.id)} style={s.btn('#2e2e2e','#e03c3c',{padding:'0.3rem 0.6rem',fontSize:'0.8rem'})}>X</button>
            </div>
          ))}
        </div>
      )}
      {tab==='add_user'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div><label style={s.label}>Username</label><input style={s.input} value={newUser.username} placeholder="es. mario" onChange={e=>setNewUser(p=>({...p,username:e.target.value}))} /></div>
          <div><label style={s.label}>Password</label><input style={s.input} type="password" value={newUser.password} placeholder="..." onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} /></div>
          <button onClick={addUser} style={s.btn('#F5C518','#000',{width:'100%',padding:'0.8rem',fontSize:'1.3rem'})}>Aggiungi Giocatore</button>
        </div>
      )}
    </main>
  )
}
export default function Home() {
  const [state, setState] = useState('loading')
  const [user, setUser] = useState(null)
  useEffect(() => {
    async function init() {
      try {
        const sr = await fetch('/api/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminPassword:'__check__'})})
        const sd = await sr.json()
        if (sd.error==='Setup già completato') {
          const mr = await fetch('/api/auth/me'); const md = await mr.json()
          if (md.user) { setUser(md.user); setState(md.user.role==='admin'?'admin':'player') } else setState('login')
        } else setState('setup')
      } catch { setState('login') }
    }
    init()
  }, [])
  function handleLogin(u) { setUser(u); setState(u.role==='admin'?'admin':'player') }
  function handleLogout() { setUser(null); setState('login') }
  if (state==='loading') return <main style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}><div style={{ textAlign:'center' }}><div style={{ fontSize:'3rem' }}>🍺</div><p style={{ color:'#888' }}>Caricamento...</p></div></main>
  if (state==='setup') return <SetupScreen onDone={()=>setState('login')} />
  if (state==='login') return <AuthScreen onLogin={handleLogin} />
  if (state==='admin') return <AdminPanel onLogout={handleLogout} />
  return <PlayerView user={user} onLogout={handleLogout} />
}
