'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CATEGORIES } from '@/lib/drinks'
import Podium from '@/components/Podium'
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
  try {
    if (!file) return { error: 'no file' }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      const timeout = setTimeout(() => reject(new Error('Timeout lettura file')), 15000)
      reader.onload = ev => {
        const img = new Image()
        img.onload = () => {
          clearTimeout(timeout)
          const canvas = document.createElement('canvas')
          let w = img.width, h = img.height
          const max = 1000
          if (w > max || h > max) {
            if (w > h) { h = Math.round(h*max/w); w = max }
            else { w = Math.round(w*max/h); h = max }
          }
          canvas.width = w; canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.onerror = () => { clearTimeout(timeout); reject(new Error('Immagine non valida (forse HEIC?)')) }
        img.src = ev.target.result
      }
      reader.onerror = () => { clearTimeout(timeout); reject(new Error('Errore lettura file')) }
      reader.readAsDataURL(file)
    })
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, type, sessionId: sessionId ? String(sessionId) : null })
    })
    return await res.json()
  } catch (e) {
    return { error: e.message }
  }
}
function fmtTime(ts) { return new Date(ts).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) }
function fmtDate(ts) { return new Date(ts).toLocaleDateString('it-IT',{day:'2-digit',month:'short'}) }
function fmtAgo(ts, now = Date.now()) { const m = Math.floor((now-ts)/60000); return m<1?'adesso':m<60?m+' min fa':Math.floor(m/60)+'h fa' }
const AVATAR_COLORS = ['#e03c3c','#3ce08a','#4a9eff','#ff9500','#b84aff','#F5C518']
function avColor(name) { let h=0; for (const c of name) h=(h*31+c.charCodeAt(0))>>>0; return AVATAR_COLORS[h%AVATAR_COLORS.length] }
function Avatar({ url, name, size=36 }) {
  if (url) return <span style={{width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,display:'block'}}><img src={url} style={{width:'100%',height:'100%',objectFit:'cover'}} /></span>
  return <span style={{width:size,height:size,borderRadius:'50%',background:avColor(name)+'33',color:avColor(name),display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:size*0.45,flexShrink:0}}>{name[0].toUpperCase()}</span>
}
function maxPerSession(log){const m={};log.forEach(e=>{m[e.sessionId]=(m[e.sessionId]||0)+1});return Math.max(0,...Object.values(m))}
const ACHIEVEMENTS = [
  { id:'first', emoji:'🍺', name:'Prima goccia', desc:'Il tuo primo drink', check:(log)=>log.length>=1 },
  { id:'five_night', emoji:'🔥', name:'On fire', desc:'5 drink in una serata', check:(log)=>maxPerSession(log)>=5 },
  { id:'eight_night', emoji:'🐙', name:'Piovra', desc:'8 drink in una serata', check:(log)=>maxPerSession(log)>=8 },
  { id:'fifty', emoji:'💯', name:'Mezzo secolo', desc:'50 punti totali', check:(log)=>log.reduce((s,e)=>s+e.points,0)>=50 },
  { id:'explorer', emoji:'🌈', name:'Esploratore', desc:'5 drink diversi provati', check:(log)=>new Set(log.map(e=>e.drinkId)).size>=5 },
  { id:'shots', emoji:'🥃', name:'Shottomane', desc:'3 shot in una serata', check:(log)=>{const m={};log.filter(e=>/^shot/.test(e.drinkId||'')).forEach(e=>{m[e.sessionId]=(m[e.sessionId]||0)+1});return Object.values(m).some(v=>v>=3)} },
  { id:'owl', emoji:'🦉', name:'Gufo', desc:'Un drink dopo le 3 di notte', check:(log)=>log.some(e=>{const h=new Date(e.timestamp).getHours();return h>=3&&h<6}) },
  { id:'leader', emoji:'👑', name:'Capolista', desc:'Primo in classifica generale', check:(log,rank)=>rank===1&&log.length>0 },
]
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
  const [bacError, setBacError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [confirmDrink, setConfirmDrink] = useState(null)
  const [avatar, setAvatar] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [sessionPhotos, setSessionPhotos] = useState([])
  const [toasts, setToasts] = useState([])
  const [challenges, setChallenges] = useState([])
  const [favorites, setFavorites] = useState([])
  const [note, setNote] = useState('')
  const [challengeTarget, setChallengeTarget] = useState(null)
  const [openCats, setOpenCats] = useState({ birra: true })
  const [finale, setFinale] = useState(null)
  const [boardSel, setBoardSel] = useState(undefined) // undefined = auto (serata attiva se c'è, altrimenti generale)
  const prevRef = useRef(null)
  const pushToast = useCallback(text => {
    const id = Date.now() + Math.random()
    setToasts(ts => [...ts.slice(-3), { id, text }])
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 6000)
  }, [])
  const load = useCallback(async () => {
    try {
      const [pr, dr, lr, sr, cr, fr] = await Promise.all([
        fetch('/api/players').then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch('/api/drinks').then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch('/api/log').then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch('/api/sessions').then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch('/api/challenges').then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch('/api/favorites').then(r => { if (!r.ok) throw new Error(); return r.json() }),
      ])
      setLoadError('')
      setPlayers(pr.players||[]); setActiveSession(pr.activeSession)
      setDrinks(dr.drinks||[]); setMyLog(lr.log||[])
      setSessions(sr.sessions||[])
      setChallenges(cr.challenges||[]); setFavorites(fr.favorites||[])
      const me = pr.players?.find(p=>p.username===user.username)
      if (me?.bac_info) { setBacInfo(me.bac_info); setBacForm(me.bac_info) }
      if (me?.avatar) setAvatar(me.avatar)
      if (pr.activeSession) {
        fetch('/api/photos?sessionId='+pr.activeSession.id).then(r=>r.json()).then(d=>setSessionPhotos(d.photos||[]))
      }
      // notifiche in-app: nuovi drink altrui, sorpassi in classifica, eventi sfida
      const allLog = (pr.players||[]).flatMap(p=>p.sessionLog||[])
      const rank = (pr.players||[]).findIndex(p=>p.username===user.username)+1
      const prev = prevRef.current
      const parts = pr.activeSession?.participants || []
      // serata appena chiusa: mostra il podio finale
      if (prev?.activeS && !pr.activeSession) {
        const sid = prev.activeS.id
        const inSess = p => prev.activeS.participants ? prev.activeS.participants.includes(p.username) : (p.sessionLog||[]).some(e=>e.sessionId===sid)
        const standings = (pr.players||[]).filter(inSess).map(p=>{
          const l=(p.sessionLog||[]).filter(e=>e.sessionId===sid)
          return { username:p.username, avatar:p.avatar, points:l.reduce((s,e)=>s+e.points,0), drinks:l.length }
        }).sort((a,b)=>b.points-a.points)
        if (standings.length) setFinale({ name: prev.activeS.name, standings })
      }
      if (prev) {
        allLog.filter(e=>e.username!==user.username && !prev.logIds.has(e.id)).slice(0,3)
          .forEach(e=>pushToast(`${e.emoji} ${e.username} ha aggiunto ${e.name}`))
        parts.filter(u=>prev.parts && !prev.parts.has(u) && u!==user.username)
          .forEach(u=>pushToast(`🙋 ${u} partecipa alla serata!`))
        if (prev.rank>0 && rank>prev.rank) pushToast('📉 Ti hanno superato in classifica!')
        ;(cr.challenges||[]).forEach(c=>{
          const involved = c.challenger===user.username||c.challenged===user.username
          const old = prev.challenges[c.id]
          if (!old && c.challenged===user.username && c.status==='pending') pushToast(`⚔️ ${c.challenger} ti ha sfidato!`)
          if (old && old!==c.status && involved) {
            if (c.status==='accepted') pushToast(c.challenger===user.username?`⚔️ ${c.challenged} ha accettato la sfida!`:'⚔️ Sfida accettata, si comincia!')
            if (c.status==='declined' && c.challenger===user.username) pushToast(`🙅 ${c.challenged} ha rifiutato la sfida`)
            if (c.status==='completed') pushToast(c.challenged===user.username?'🏆 Sfida completata!':`😬 ${c.challenged} ha completato la tua sfida!`)
            if (c.status==='failed') pushToast(c.challenged===user.username?'❌ Sfida fallita...':`🏆 ${c.challenged} non ce l'ha fatta!`)
          }
        })
      }
      prevRef.current = { logIds:new Set(allLog.map(e=>e.id)), rank, parts:new Set(parts), challenges:Object.fromEntries((cr.challenges||[]).map(c=>[c.id,c.status])), activeS: pr.activeSession ? { id: pr.activeSession.id, name: pr.activeSession.name, participants: pr.activeSession.participants } : null }
    } catch { setLoadError('Errore nel caricamento dati') }
  }, [user.username, pushToast])
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i) }, [load])
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(i) }, [])
  async function addDrink(drink) {
    if (!activeSession) return
    setConfirmDrink(drink); return
    //await fetch('/api/log', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({drink, foodContext:food}) })
    load()
  }
  async function removeDrink(id) {
    await fetch('/api/log', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({entryId:id}) })
    load()
  }
  async function saveBac() {
    const w = parseFloat(bacForm.weight), h = parseFloat(bacForm.height), a = parseInt(bacForm.age)
    if (!w || !h || !a || w <= 0 || h <= 0 || a <= 0) { setBacError('Inserisci valori validi e maggiori di zero'); return }
    setBacError('')
    const info = { weight: w, height: h, age: a, sex: bacForm.sex }
    await fetch('/api/bac', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(info) })
    setBacInfo(info); setBacSaved(true); setTimeout(()=>setBacSaved(false),2000); load()
  }
  async function logout() { await fetch('/api/auth/logout',{method:'POST'}); onLogout() }
  async function setParticipation(join) {
    await fetch('/api/sessions',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:join?'join':'leave'})})
    load()
  }
  async function sendChallenge(challenged, deadline) {
    const res = await fetch('/api/challenges',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challenged,deadline})})
    const d = await res.json()
    if (!res.ok) alert(d.error||'Errore'); else pushToast(`⚔️ Sfida inviata a ${challenged}!`)
    setChallengeTarget(null); load()
  }
  async function respondToChallenge(id, accept) {
    await fetch('/api/challenges',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,accept})})
    load()
  }
  async function toggleFav(drinkId) {
    setFavorites(f=>f.includes(drinkId)?f.filter(x=>x!==drinkId):[...f,drinkId])
    await fetch('/api/favorites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({drinkId})})
  }
  async function editNote(entry) {
    const n = prompt('Nota sul drink (dove, con chi...):', entry.note||'')
    if (n===null) return
    await fetch('/api/log',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({entryId:entry.id,note:n})})
    load()
  }
  async function reactPhoto(photo, emoji) {
    if (!activeSession) return
    await fetch('/api/photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:photo.url,sessionId:activeSession.id,emoji})})
    const d = await fetch('/api/photos?sessionId='+activeSession.id).then(r=>r.json())
    setSessionPhotos(d.photos||[])
  }
  const me = players.find(p=>p.username===user.username)
  const myPoints = me?.points||0
  const myRank = players.findIndex(p=>p.username===user.username)+1
  const sessionLog = activeSession ? myLog.filter(e=>e.sessionId===activeSession.id) : []
  const bac = calcBAC(sessionLog, bacInfo, now)
  const bacOverall = calcBAC(myLog, bacInfo, now)
  const bs = bacStatus(bac)
  const viewLog = selectedSession ? myLog.filter(e=>e.sessionId===selectedSession) : myLog
  const soberMs = bac > 0.002 ? (bac/0.015)*3600000 : 0
  // serate vecchie senza lista iscritti: tutti partecipano
  const hasRoster = Array.isArray(activeSession?.participants)
  const joined = !!activeSession && (!hasRoster || activeSession.participants.includes(user.username))
  const canDrink = !!activeSession && joined
  const boardSessionId = boardSel===undefined ? (activeSession?.id ?? null) : (boardSel==='' ? null : parseInt(boardSel))
  const boardPlayers = (() => {
    if (!boardSessionId) return players.filter(p => p.drinks > 0 || p.username === user.username)
    const sess = sessions.find(ss=>ss.id===boardSessionId)
    const inSess = p => sess?.participants ? sess.participants.includes(p.username) : (p.sessionLog||[]).some(e=>e.sessionId===boardSessionId)
    const sp = p => (p.sessionLog||[]).filter(e=>e.sessionId===boardSessionId).reduce((s,e)=>s+e.points,0)
    return players.filter(inSess).sort((a,b)=>sp(b)-sp(a))
  })()
  const myChallenges = activeSession ? challenges.filter(c=>c.sessionId===activeSession.id && (c.challenger===user.username||c.challenged===user.username) && c.status!=='declined') : []
  const feed = players.flatMap(p=>p.sessionLog||[]).filter(e=>activeSession?e.sessionId===activeSession.id:true).sort((a,b)=>b.timestamp-a.timestamp).slice(0,8)
  const sessPoints = u => players.find(p=>p.username===u)?.sessionLog?.filter(e=>activeSession&&e.sessionId===activeSession.id).reduce((s,e)=>s+e.points,0) ?? 0
  return (
    <>
    {finale && <Podium sessionName={finale.name} standings={finale.standings} onClose={()=>setFinale(null)} />}
    <div style={{position:'fixed',top:'0.75rem',left:'50%',transform:'translateX(-50%)',zIndex:1001,display:'flex',flexDirection:'column',gap:'0.4rem',width:'90%',maxWidth:440,pointerEvents:'none'}}>
      {toasts.map(t=><div key={t.id} style={{background:'#1a1a1a',border:'1px solid #F5C518',borderRadius:'10px',padding:'0.6rem 1rem',color:'#f0f0f0',fontSize:'0.85rem',boxShadow:'0 4px 12px rgba(0,0,0,0.5)'}}>{t.text}</div>)}
    </div>
    {challengeTarget && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
        <div style={{background:'#1a1a1a',border:'1px solid #F5C518',borderRadius:'16px',padding:'2rem',maxWidth:320,width:'100%',textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>⚔️</div>
          <h2 style={{fontFamily:'Bebas Neue',fontSize:'1.8rem',color:'#F5C518',marginBottom:'0.25rem'}}>SFIDA {challengeTarget.toUpperCase()}</h2>
          <p style={{color:'#888',fontSize:'0.8rem',marginBottom:'1.5rem'}}>"Bevi quanto me": {challengeTarget} vince se raggiunge i tuoi punti entro la scadenza.</p>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            <button onClick={()=>sendChallenge(challengeTarget, Date.now()+3600000)} style={s.btn('#F5C518','#000',{padding:'0.7rem'})}>Entro 1 ora</button>
            <button onClick={()=>sendChallenge(challengeTarget, Date.now()+2*3600000)} style={s.btn('#F5C518','#000',{padding:'0.7rem'})}>Entro 2 ore</button>
            <button onClick={()=>{const m=new Date();m.setHours(24,0,0,0);sendChallenge(challengeTarget, m.getTime())}} style={s.btn('#F5C518','#000',{padding:'0.7rem'})}>Entro mezzanotte</button>
            <button onClick={()=>setChallengeTarget(null)} style={s.btn('#2e2e2e','#888',{padding:'0.7rem'})}>Annulla</button>
          </div>
        </div>
      </div>
    )}
    {confirmDrink && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
        <div style={{background:'#1a1a1a',border:'1px solid #F5C518',borderRadius:'16px',padding:'2rem',maxWidth:320,width:'100%',textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>{confirmDrink.emoji}</div>
          <h2 style={{fontFamily:'Bebas Neue',fontSize:'2rem',color:'#F5C518',marginBottom:'0.25rem'}}>{confirmDrink.name}</h2>
          <p style={{color:'#888',fontSize:'0.85rem',marginBottom:'1rem'}}>{confirmDrink.ml}ml / {confirmDrink.abv}% / {confirmDrink.points} punti</p>
          <input style={{...s.input,marginBottom:'1rem',fontSize:'0.85rem'}} value={note} placeholder="Nota (opzionale): dove, con chi..." onChange={e=>setNote(e.target.value)} />
          <div style={{display:'flex',gap:'0.75rem'}}>
            <button onClick={()=>{setConfirmDrink(null);setNote('')}} style={{flex:1,background:'#2e2e2e',border:'none',borderRadius:'8px',padding:'0.8rem',color:'#888',fontFamily:'Bebas Neue',fontSize:'1.2rem',cursor:'pointer'}}>Annulla</button>
            <button onClick={async()=>{const d=confirmDrink;const n=note;setConfirmDrink(null);setNote('');await fetch('/api/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({drink:d,foodContext:food,note:n||null})});load()}} style={{flex:1,background:'#F5C518',border:'none',borderRadius:'8px',padding:'0.8rem',color:'#000',fontFamily:'Bebas Neue',fontSize:'1.2rem',cursor:'pointer'}}>Aggiungi</button>
          </div>
        </div>
      </div>
    )}
    <main style={{ maxWidth:480, margin:'0 auto', padding:'0 0 5rem' }}>
      <div style={{ padding:'1.5rem 1rem 0.5rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div><h1 style={{ fontSize:'2rem', color:'#F5C518', lineHeight:1 }}>DRINKING</h1><h1 style={{ fontSize:'2rem', lineHeight:1 }}>LEADERBOARD</h1></div>
        <button onClick={logout} style={s.btn('#2e2e2e','#888',{fontSize:'0.8rem',padding:'0.4rem 0.8rem'})}>Esci</button>
      </div>
      {loadError && <div style={{ margin:'0 1rem 0.5rem', background:'#220000', border:'1px solid #e03c3c', borderRadius:'8px', padding:'0.5rem 1rem', color:'#e03c3c', fontSize:'0.85rem' }}>{loadError}</div>}
      {activeSession
        ? <div style={{ margin:'0 1rem 1rem', background:'#0d2200', border:'1px solid #3ce08a', borderRadius:'8px', padding:'0.5rem 1rem' }}>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
              <span style={{ color:'#3ce08a', fontSize:'0.75rem' }}>● LIVE</span>
              <span style={{ color:'#f0f0f0', fontSize:'0.85rem', flex:1 }}>{activeSession.name}</span>
              {hasRoster && (joined
                ? <button onClick={()=>setParticipation(false)} style={s.btn('transparent','#3ce08a',{fontSize:'0.75rem',padding:'0.2rem 0.5rem',border:'1px solid #3ce08a44'})}>✓ Ci sei</button>
                : <button onClick={()=>setParticipation(true)} style={s.btn('#3ce08a','#000',{fontSize:'0.85rem',padding:'0.3rem 0.8rem'})}>🙋 Partecipo!</button>)}
            </div>
            {hasRoster && activeSession.participants.length > 0 && (
              <div style={{ color:'#888', fontSize:'0.7rem', marginTop:'0.3rem' }}>🙋 {activeSession.participants.length} iscritt{activeSession.participants.length===1?'o':'i'}: {activeSession.participants.join(', ')}</div>
            )}
          </div>
        : <div style={{ margin:'0 1rem 1rem', background:'#1a1a1a', border:'1px solid #2e2e2e', borderRadius:'8px', padding:'0.5rem 1rem' }}><span style={{ color:'#888', fontSize:'0.85rem' }}>Nessuna serata attiva</span></div>
      }
      <div style={{ display:'flex', gap:'0.4rem', padding:'0 1rem 1rem', overflowX:'auto' }}>
        {[['home','🏠'],['drinks','🍺'],['log','📋'],['board','🏆'],['photos','📸'],['stats','📊'],['profile','👤']].map(([k,l]) => (
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
                {soberMs > 0 && <p style={{ color:'#888', fontSize:'0.75rem', marginTop:'0.5rem' }}>🕐 Sobrio tra ~{Math.floor(soberMs/3600000)}h {Math.round((soberMs%3600000)/60000)}m</p>}
                <p style={{ color:'#555', fontSize:'0.65rem', marginTop:'0.5rem' }}>Stima indicativa. Non guidare.</p>
              </div>
            ) : (
              <div style={{ ...s.card(), textAlign:'center', padding:'1.5rem' }}>
                <p style={{ color:'#888', fontSize:'0.9rem', marginBottom:'0.75rem' }}>Imposta i dati nel profilo per vedere il BAC</p>
                <button onClick={()=>setTab('profile')} style={s.btn('#2e2e2e','#F5C518',{fontSize:'0.9rem'})}>Vai al profilo</button>
              </div>
            )}
            <button onClick={()=>setTab('drinks')} style={s.btn('#F5C518','#000',{width:'100%',padding:'1rem',fontSize:'1.5rem',borderRadius:'12px'})}>🍺 Aggiungi drink</button>
            {myChallenges.length > 0 && (
              <div style={s.card()}>
                <h3 style={{fontFamily:'Bebas Neue',fontSize:'1.2rem',color:'#F5C518',marginBottom:'0.6rem'}}>⚔️ SFIDE</h3>
                <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
                  {myChallenges.map(c=>{
                    const amChallenged = c.challenged===user.username
                    const other = amChallenged ? c.challenger : c.challenged
                    const myPts = sessPoints(user.username), otherPts = sessPoints(other)
                    return <div key={c.id} style={{background:'#0d0d0d',borderRadius:'8px',padding:'0.6rem 0.8rem'}}>
                      <div style={{color:'#f0f0f0',fontSize:'0.85rem',marginBottom:'0.3rem'}}>
                        {amChallenged ? <><b>{c.challenger}</b> ti ha sfidato: bevi quanto lui/lei</> : <>Hai sfidato <b>{c.challenged}</b></>} · scade {fmtTime(c.deadline)}
                      </div>
                      {c.status==='pending' && amChallenged && (
                        <div style={{display:'flex',gap:'0.5rem'}}>
                          <button onClick={()=>respondToChallenge(c.id,true)} style={s.btn('#3ce08a','#000',{flex:1,fontSize:'0.9rem',padding:'0.4rem'})}>Accetta</button>
                          <button onClick={()=>respondToChallenge(c.id,false)} style={s.btn('#2e2e2e','#e03c3c',{flex:1,fontSize:'0.9rem',padding:'0.4rem'})}>Rifiuta</button>
                        </div>
                      )}
                      {c.status==='pending' && !amChallenged && <span style={{color:'#888',fontSize:'0.75rem'}}>⏳ In attesa di risposta...</span>}
                      {c.status==='accepted' && (
                        <div style={{display:'flex',gap:'1rem',alignItems:'center'}}>
                          <span style={{fontFamily:'Bebas Neue',fontSize:'1.2rem',color:'#F5C518'}}>tu {myPts}</span>
                          <span style={{color:'#555'}}>vs</span>
                          <span style={{fontFamily:'Bebas Neue',fontSize:'1.2rem',color:'#f0f0f0'}}>{other} {otherPts}</span>
                        </div>
                      )}
                      {c.status==='completed' && <span style={{color:'#3ce08a',fontSize:'0.8rem'}}>🏆 Sfida completata da {c.challenged}</span>}
                      {c.status==='failed' && <span style={{color:'#e03c3c',fontSize:'0.8rem'}}>❌ {c.challenged} non ce l'ha fatta ({c.result?.challenged ?? 0} vs {c.result?.challenger ?? 0})</span>}
                    </div>
                  })}
                </div>
              </div>
            )}
            {feed.length > 0 && (
              <div style={s.card()}>
                <h3 style={{fontFamily:'Bebas Neue',fontSize:'1.2rem',color:'#888',marginBottom:'0.6rem'}}>📡 ATTIVITÀ</h3>
                <div style={{display:'flex',flexDirection:'column'}}>
                  {feed.map((e,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.35rem 0',borderBottom:i<feed.length-1?'1px solid #242424':'none'}}>
                      <span style={{fontSize:'1.2rem'}}>{e.emoji}</span>
                      <div style={{flex:1,color:'#f0f0f0',fontSize:'0.85rem'}}><b>{e.username===user.username?'tu':e.username}</b> · {e.name}</div>
                      <span style={{color:'#555',fontSize:'0.7rem'}}>{fmtAgo(e.timestamp,now)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {tab==='drinks' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {!activeSession && <div style={{ background:'#2a1500', border:'1px solid #e03c3c', borderRadius:'8px', padding:'0.75rem', color:'#e03c3c', fontSize:'0.85rem' }}>Nessuna serata attiva</div>}
            {activeSession && !joined && (
              <div style={{ background:'#2a1500', border:'1px solid #e03c3c', borderRadius:'8px', padding:'0.75rem' }}>
                <p style={{ color:'#e03c3c', fontSize:'0.85rem', marginBottom:'0.5rem' }}>Non sei iscritto a questa serata</p>
                <button onClick={()=>setParticipation(true)} style={s.btn('#3ce08a','#000',{width:'100%',padding:'0.5rem',fontSize:'1rem'})}>🙋 Partecipo!</button>
              </div>
            )}
            <div><label style={s.label}>Contesto cibo</label>
              <select value={food} onChange={e=>setFood(e.target.value)} style={{ ...s.input, appearance:'none' }}>
                <option value="non_specificato">Non specificato</option>
                <option value="stomaco_vuoto">Stomaco vuoto</option>
                <option value="cibo_leggero">Cibo leggero</option>
                <option value="pasto_completo">Pasto completo</option>
              </select>
            </div>
            {(() => {
              const renderDrink = drink => {
                const fav = favorites.includes(drink.id)
                return <div key={drink.id} onClick={()=>canDrink&&addDrink(drink)} style={{ ...s.card(fav), display:'flex', alignItems:'center', gap:'1rem', border:`1px solid ${fav?'#c9a014':'#2e2e2e'}`, cursor:canDrink?'pointer':'not-allowed', opacity:canDrink?1:0.5, width:'100%', textAlign:'left' }}>
                  <span style={{ fontSize:'1.8rem' }}>{drink.emoji}</span>
                  <div style={{ flex:1 }}><div style={{ color:'#f0f0f0', fontSize:'1rem', fontWeight:600 }}>{drink.name}</div><div style={{ color:'#888', fontSize:'0.75rem' }}>{drink.ml}ml / {drink.abv}%</div></div>
                  <div style={{ textAlign:'right' }}><div style={{ fontFamily:'Bebas Neue', fontSize:'1.4rem', color:'#F5C518' }}>{drink.points}</div><div style={{ color:'#888', fontSize:'0.7rem' }}>punti</div></div>
                  <button onClick={e=>{e.stopPropagation();toggleFav(drink.id)}} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',padding:'0.2rem',opacity:fav?1:0.35}} title={fav?'Rimuovi dai preferiti':'Aggiungi ai preferiti'}>⭐</button>
                </div>
              }
              const favDrinks = drinks.filter(d=>favorites.includes(d.id))
              return <>
                {favDrinks.length > 0 && <>
                  <div style={{ color:'#F5C518', letterSpacing:'0.05em', fontFamily:'Bebas Neue', fontSize:'1.1rem' }}>⭐ PREFERITI</div>
                  {favDrinks.map(renderDrink)}
                </>}
                {CATEGORIES.map(([key, label]) => {
                  const list = drinks.filter(d=>(d.category||'altro')===key && !favorites.includes(d.id))
                  if (!list.length) return null
                  const openC = !!openCats[key]
                  return <div key={key} style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                    <button onClick={()=>setOpenCats(o=>({...o,[key]:!o[key]}))} style={{ background:'#1a1a1a', border:'1px solid #2e2e2e', borderRadius:'10px', padding:'0.7rem 1rem', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', width:'100%' }}>
                      <span style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem', color:openC?'#F5C518':'#f0f0f0', letterSpacing:'0.05em' }}>{label}</span>
                      <span style={{ color:'#888', fontSize:'0.8rem' }}>{list.length} {openC?'▲':'▼'}</span>
                    </button>
                    {openC && list.map(renderDrink)}
                  </div>
                })}
              </>
            })()}
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
                  {e.note && <div style={{ color:'#F5C518', fontSize:'0.7rem', fontStyle:'italic', marginTop:'0.15rem' }}>📝 {e.note}</div>}
                </div>
                <div style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#F5C518', marginRight:'0.25rem' }}>{e.points}pt</div>
                <button onClick={()=>editNote(e)} style={s.btn('#2e2e2e','#888',{padding:'0.3rem 0.5rem',fontSize:'0.8rem'})} title="Nota">📝</button>
                <button onClick={()=>removeDrink(e.id)} style={s.btn('#2e2e2e','#e03c3c',{padding:'0.3rem 0.6rem',fontSize:'0.8rem'})}>X</button>
              </div>
            ))}
          </div>
        )}
        {tab==='board' && (
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            <div><label style={s.label}>Visualizza</label>
              <select value={boardSessionId??''} onChange={e=>setBoardSel(e.target.value)} style={{...s.input,appearance:'none'}}>
                <option value="">Classifica generale</option>
                {sessions.map(ss=><option key={ss.id} value={ss.id}>{ss.name}{ss.active?' (in corso)':''}</option>)}
              </select>
            </div>
            {boardPlayers.length===0 && <p style={{color:'#888',textAlign:'center',padding:'2rem'}}>Nessun iscritto a questa serata</p>}
            {boardPlayers.map((player,i)=>{
              const pts=boardSessionId?(player.sessionLog||[]).filter(e=>e.sessionId===boardSessionId).reduce((s,e)=>s+e.points,0):player.points
              const dks=boardSessionId?(player.sessionLog||[]).filter(e=>e.sessionId===boardSessionId).length:player.drinks
              const isMe=player.username===user.username
              const pBac=player.bac_info?calcBAC(boardSessionId?(player.sessionLog||[]).filter(e=>e.sessionId===boardSessionId):(player.sessionLog||[]),player.bac_info,now):null
              const pLog=boardSessionId?(player.sessionLog||[]).filter(e=>e.sessionId===boardSessionId):(player.sessionLog||[])
              const open=viewingPlayer===player.username
              return <div key={player.username} style={s.card(isMe,{border:isMe?'1px solid #F5C518':'1px solid #2e2e2e'})}>
                <div style={{display:'flex',alignItems:'center',gap:'1rem',cursor:'pointer'}} onClick={()=>setViewingPlayer(open?null:player.username)}>
                  <span style={{width:36,height:36,background:i<3?'#F5C518':'#2e2e2e',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:'1rem',color:i<3?'#000':'#888',flexShrink:0}}>{i<3?['👑','2','3'][i]:i+1}</span>
                  <Avatar url={player.avatar} name={player.username} size={36} />
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
                  {!isMe && activeSession && <button onClick={ev=>{ev.stopPropagation();setChallengeTarget(player.username)}} style={s.btn('#2e2e2e','#F5C518',{width:'100%',marginTop:'0.5rem',fontSize:'0.95rem',padding:'0.5rem'})}>⚔️ Sfida {player.username}</button>}
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
                    const file = e.target.files[0]; if (!file) return
                    e.target.value = ''
                    setUploading(true)
                    const data = await compressAndUpload(file, 'session', activeSession.id)
                    if (data.error) alert('Errore caricamento: ' + data.error)
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
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.6)', padding:'0.25rem 0.5rem', fontSize:'0.65rem', color:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span>{photo.username}</span>
                    <span style={{ display:'flex', gap:'0.2rem' }}>
                      {['❤️','🔥','😂'].map(em => {
                        const count = Object.values(photo.reactions||{}).filter(r=>r===em).length
                        const mine = (photo.reactions||{})[user.username]===em
                        return <button key={em} onClick={()=>reactPhoto(photo,em)} style={{ background:mine?'#F5C518':'transparent', border:'none', borderRadius:'6px', padding:'0 0.25rem', fontSize:'0.7rem', cursor:'pointer', color:'#fff' }}>{em}{count>0?count:''}</button>
                      })}
                    </span>
                  </div>
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
        {tab==='stats' && (()=>{
          const totalPts = myLog.reduce((s,e)=>s+e.points,0)
          const bySession = {}
          myLog.forEach(e=>{ bySession[e.sessionId]=bySession[e.sessionId]||{pts:0,n:0}; bySession[e.sessionId].pts+=e.points; bySession[e.sessionId].n++ })
          const best = Object.entries(bySession).sort((a,b)=>b[1].pts-a[1].pts)[0]
          const bestName = best ? (sessions.find(ss=>ss.id===parseInt(best[0]))?.name || '?') : null
          const maxNight = maxPerSession(myLog)
          const counts = {}
          myLog.forEach(e=>{counts[e.name]=(counts[e.name]||0)+1})
          const favDrink = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]
          const bands = {}
          myLog.forEach(e=>{const h=new Date(e.timestamp).getHours();const b=h<6?'Notte fonda (0-6)':h<18?'Giorno (6-18)':h<21?'Aperitivo (18-21)':'Sera (21-24)';bands[b]=(bands[b]||0)+1})
          const favBand = Object.entries(bands).sort((a,b)=>b[1]-a[1])[0]
          const sessOpts = sessions.filter(ss=>myLog.some(e=>e.sessionId===ss.id))
          const graphSess = selectedSession && sessOpts.some(ss=>ss.id===selectedSession) ? selectedSession : sessOpts[sessOpts.length-1]?.id
          const gLog = myLog.filter(e=>e.sessionId===graphSess)
          let pts = []
          if (bacInfo && gLog.length) {
            const start = Math.min(...gLog.map(e=>e.timestamp))
            const end = Math.min(Date.now(), Math.max(...gLog.map(e=>e.timestamp))+3*3600000)
            for (let i=0;i<=40;i++) pts.push(calcBAC(gLog, bacInfo, start+(end-start)*i/40))
          }
          const maxB = Math.max(0.05, ...pts)
          const poly = pts.map((b,i)=>`${(i/40)*300},${75-(b/maxB)*68}`).join(' ')
          const unlocked = ACHIEVEMENTS.filter(a=>a.check(myLog,myRank)).map(a=>a.id)
          return <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div style={s.card(true)}>
              <h3 style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:'#F5C518',marginBottom:'0.75rem'}}>🏅 RECORD PERSONALI</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                <div style={{background:'#0d0d0d',borderRadius:'8px',padding:'0.6rem',textAlign:'center'}}><div style={{fontFamily:'Bebas Neue',fontSize:'2rem',color:'#F5C518'}}>{totalPts}</div><div style={{color:'#888',fontSize:'0.7rem'}}>punti totali</div></div>
                <div style={{background:'#0d0d0d',borderRadius:'8px',padding:'0.6rem',textAlign:'center'}}><div style={{fontFamily:'Bebas Neue',fontSize:'2rem',color:'#f0f0f0'}}>{myLog.length}</div><div style={{color:'#888',fontSize:'0.7rem'}}>drink totali</div></div>
                <div style={{background:'#0d0d0d',borderRadius:'8px',padding:'0.6rem',textAlign:'center'}}><div style={{fontFamily:'Bebas Neue',fontSize:'2rem',color:'#f0f0f0'}}>{maxNight||0}</div><div style={{color:'#888',fontSize:'0.7rem'}}>max drink in una serata</div></div>
                <div style={{background:'#0d0d0d',borderRadius:'8px',padding:'0.6rem',textAlign:'center'}}><div style={{fontFamily:'Bebas Neue',fontSize:'1.1rem',color:'#3ce08a'}}>{bestName||'-'}</div><div style={{color:'#888',fontSize:'0.7rem'}}>miglior serata {best?'('+best[1].pts+'pt)':''}</div></div>
              </div>
            </div>
            <div style={s.card()}>
              <h3 style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:'#888',marginBottom:'0.75rem'}}>🍹 LE TUE ABITUDINI</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#888',fontSize:'0.85rem'}}>Drink preferito</span><span style={{color:'#f0f0f0',fontSize:'0.85rem'}}>{favDrink?favDrink[0]+' ('+favDrink[1]+'x)':'-'}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#888',fontSize:'0.85rem'}}>Fascia oraria top</span><span style={{color:'#f0f0f0',fontSize:'0.85rem'}}>{favBand?favBand[0]:'-'}</span></div>
              </div>
            </div>
            <div style={s.card()}>
              <h3 style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:'#888',marginBottom:'0.5rem'}}>📈 BAC SERATA</h3>
              {sessOpts.length===0 ? <p style={{color:'#555',fontSize:'0.8rem'}}>Nessuna serata con drink</p> : <>
                <select value={graphSess||''} onChange={e=>setSelectedSession(parseInt(e.target.value))} style={{...s.input,appearance:'none',marginBottom:'0.75rem'}}>
                  {sessOpts.map(ss=><option key={ss.id} value={ss.id}>{ss.name}</option>)}
                </select>
                {!bacInfo ? <p style={{color:'#555',fontSize:'0.8rem'}}>Imposta i dati BAC nel profilo per vedere il grafico</p> :
                  <svg viewBox="0 0 300 80" style={{width:'100%',height:'auto'}}>
                    <line x1="0" y1="75" x2="300" y2="75" stroke="#2e2e2e" strokeWidth="1" />
                    {maxB>=0.05 && <line x1="0" y1={75-(0.05/maxB)*68} x2="300" y2={75-(0.05/maxB)*68} stroke="#e03c3c44" strokeWidth="1" strokeDasharray="4 3" />}
                    <polyline points={poly} fill="none" stroke="#F5C518" strokeWidth="2" />
                    <text x="2" y={Math.max(10,75-(0.05/maxB)*68-3)} fill="#e03c3c88" fontSize="7">0.05 limite guida</text>
                  </svg>}
              </>}
            </div>
            <div style={s.card()}>
              <h3 style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:'#888',marginBottom:'0.75rem'}}>🏆 ACHIEVEMENT ({unlocked.length}/{ACHIEVEMENTS.length})</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                {ACHIEVEMENTS.map(a=>{
                  const ok = unlocked.includes(a.id)
                  return <div key={a.id} style={{background:'#0d0d0d',borderRadius:'8px',padding:'0.6rem',opacity:ok?1:0.3,border:ok?'1px solid #c9a01455':'1px solid transparent'}}>
                    <div style={{fontSize:'1.4rem'}}>{a.emoji}</div>
                    <div style={{color:ok?'#F5C518':'#888',fontSize:'0.8rem',fontWeight:600}}>{a.name}</div>
                    <div style={{color:'#555',fontSize:'0.65rem'}}>{a.desc}</div>
                  </div>
                })}
              </div>
            </div>
          </div>
        })()}
        {tab==='profile' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={s.card()}>
              <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', margin:'0 auto 0.75rem', overflow:'hidden', border:'2px solid #F5C518' }}>
                <Avatar url={avatar} name={user.username} size={76} />
              </div>
              <label style={{ cursor:'pointer', color:'#F5C518', fontSize:'0.85rem', background:'#2e2e2e', padding:'0.4rem 1rem', borderRadius:'8px' }}>
                {uploading ? 'Caricamento...' : 'Cambia foto'}
                <input type='file' accept='image/*' style={{ display:'none' }} onChange={async e => {
                  const file = e.target.files[0]; if (!file) return
                  e.target.value = ''
                  setUploading(true)
                  const data = await compressAndUpload(file, 'avatar')
                  if (data.url) setAvatar(data.url)
                  else if (data.error) alert('Errore caricamento: ' + data.error)
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
                {bacError && <p style={{ color:'#e03c3c', fontSize:'0.8rem', margin:'0' }}>{bacError}</p>}
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
  const [autoClose, setAutoClose] = useState('')
  const [exportSession, setExportSession] = useState('')
  const [board, setBoard] = useState([])
  const [players, setPlayers] = useState([])
  const [drinks, setDrinks] = useState([])
  const [newDrink, setNewDrink] = useState({ name:'', emoji:'🍺', points:'', ml:'', abv:'', category:'altro' })
  const [newUser, setNewUser] = useState({ username:'', password:'' })
  const [msg, setMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [loadingAdmin, setLoadingAdmin] = useState(false)
  const load = useCallback(async () => {
    try {
      const [sr, pr, dr, br] = await Promise.all([
        fetch('/api/sessions').then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch('/api/admin').then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch('/api/drinks').then(r => { if (!r.ok) throw new Error(); return r.json() }),
        fetch('/api/players').then(r => { if (!r.ok) throw new Error(); return r.json() }),
      ])
      setSessions(sr.sessions||[]); setActiveSession(sr.active)
      setPlayers(pr.users||[]); setDrinks(dr.drinks||[])
      setBoard(br.players||[])
    } catch { showMsg('Errore nel caricamento dati') }
  }, [])
  useEffect(() => { load() }, [load])
  function showMsg(m) { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  async function createSession() {
    if (!newSessionName) return
    setLoadingAdmin(true)
    let autoCloseAt = null
    if (autoClose) {
      const [h, m] = autoClose.split(':').map(Number)
      const d = new Date(); d.setHours(h, m, 0, 0)
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
      autoCloseAt = d.getTime()
    }
    await fetch('/api/sessions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:newSessionName, autoCloseAt}) })
    setNewSessionName(''); setAutoClose(''); showMsg('Serata creata!'); load()
    setLoadingAdmin(false)
  }
  function deleteSession(id) {
    setConfirmAction({ message: 'Eliminare la serata e tutti i drink?', onConfirm: async () => {
      setLoadingAdmin(true)
      await fetch('/api/sessions', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({sessionId:id, action:'delete'}) })
      showMsg('Serata eliminata'); load()
      setLoadingAdmin(false)
    }})
  }
  function closeSession(id) {
    setConfirmAction({ message: 'Chiudere la serata?', onConfirm: async () => {
      setLoadingAdmin(true)
      await fetch('/api/sessions', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({sessionId:id}) })
      showMsg('Serata chiusa'); load()
      setLoadingAdmin(false)
    }})
  }
  async function addDrink() {
    if (!newDrink.name||!newDrink.points||!newDrink.ml||!newDrink.abv) return showMsg('Compila tutti i campi')
    setLoadingAdmin(true)
    await fetch('/api/drinks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...newDrink,points:parseInt(newDrink.points),ml:parseFloat(newDrink.ml),abv:parseFloat(newDrink.abv)}) })
    setNewDrink({name:'',emoji:'🍺',points:'',ml:'',abv:'',category:'altro'}); showMsg('Drink aggiunto!'); load()
    setLoadingAdmin(false)
  }
  function removeDrink(id) {
    setConfirmAction({ message: 'Eliminare questo drink dal catalogo?', onConfirm: async () => {
      setLoadingAdmin(true)
      await fetch('/api/drinks', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({drinkId:id}) })
      load()
      setLoadingAdmin(false)
    }})
  }
  async function addUser() {
    if (!newUser.username||!newUser.password) return
    setLoadingAdmin(true)
    const res = await fetch('/api/admin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newUser) })
    const d = await res.json()
    if (res.ok) { showMsg(d.user.username+' aggiunto'); setNewUser({username:'',password:''}); load() } else showMsg(d.error)
    setLoadingAdmin(false)
  }
  function removeUser(username) {
    setConfirmAction({ message: 'Eliminare ' + username + '?', onConfirm: async () => {
      setLoadingAdmin(true)
      await fetch('/api/admin', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username}) })
      load()
      setLoadingAdmin(false)
    }})
  }
  async function logout() { await fetch('/api/auth/logout',{method:'POST'}); onLogout() }
  const playerList = players.filter(u=>u.role!=='admin')
  return (
    <>
    {confirmAction && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
        <div style={{background:'#1a1a1a',border:'1px solid #e03c3c',borderRadius:'16px',padding:'2rem',maxWidth:320,width:'100%',textAlign:'center'}}>
          <p style={{color:'#f0f0f0',marginBottom:'1.5rem',fontSize:'1rem'}}>{confirmAction.message}</p>
          <div style={{display:'flex',gap:'0.75rem'}}>
            <button onClick={()=>setConfirmAction(null)} style={{flex:1,background:'#2e2e2e',border:'none',borderRadius:'8px',padding:'0.8rem',color:'#888',fontFamily:'Bebas Neue',fontSize:'1.2rem',cursor:'pointer'}}>Annulla</button>
            <button onClick={()=>{ confirmAction.onConfirm(); setConfirmAction(null) }} style={{flex:1,background:'#e03c3c',border:'none',borderRadius:'8px',padding:'0.8rem',color:'#fff',fontFamily:'Bebas Neue',fontSize:'1.2rem',cursor:'pointer'}}>Conferma</button>
          </div>
        </div>
      </div>
    )}
    <main style={{ maxWidth:500, margin:'0 auto', padding:'2rem 1rem 5rem' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div><h1 style={{ fontSize:'2.5rem', color:'#F5C518', lineHeight:1 }}>ADMIN</h1>{activeSession&&<span style={{ color:'#3ce08a', fontSize:'0.8rem' }}>● {activeSession.name}</span>}</div>
        <button onClick={logout} style={s.btn('#2e2e2e','#888',{fontSize:'0.85rem',padding:'0.4rem 0.8rem'})}>Esci</button>
      </div>
      <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.5rem', overflowX:'auto' }}>
        {[['sessions','📅'],['players','👥'],['drinks_mgmt','🍺'],['add_user','➕'],['stats','📊']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={s.btn(tab===k?'#F5C518':'#1a1a1a',tab===k?'#000':'#888',{flex:1,fontSize:'1.2rem',border:'1px solid #2e2e2e',minWidth:50})}>{l}</button>
        ))}
      </div>
      {msg&&<div style={{ background:'#1a2200', border:'1px solid #3ce08a', borderRadius:'8px', padding:'0.5rem 1rem', marginBottom:'1rem', color:'#3ce08a', fontSize:'0.85rem' }}>{msg}</div>}
      {tab==='sessions'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div style={s.card()}><h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#F5C518', marginBottom:'0.5rem' }}>NUOVA SERATA</h3>
            <p style={{ color:'#888', fontSize:'0.8rem', marginBottom:'0.75rem' }}>La precedente si chiude automaticamente</p>
            <input style={{ ...s.input, marginBottom:'0.75rem' }} value={newSessionName} placeholder="es. Venerdi 6 Giugno" onChange={e=>setNewSessionName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createSession()} />
            <label style={s.label}>Chiusura automatica (opzionale)</label>
            <input style={{ ...s.input, marginBottom:'0.75rem' }} type="time" value={autoClose} onChange={e=>setAutoClose(e.target.value)} />
            <button onClick={createSession} disabled={loadingAdmin} style={s.btn('#F5C518','#000',{width:'100%',padding:'0.7rem',opacity:loadingAdmin?0.5:1})}>Apri Serata</button>
          </div>
          <h3 style={{ fontFamily:'Bebas Neue', fontSize:'1.3rem', color:'#888' }}>SERATE</h3>
          {[...sessions].reverse().map(sess=>(
            <div key={sess.id} style={s.card(sess.active)}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div><div style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem', color:sess.active?'#F5C518':'#f0f0f0' }}>{sess.name}</div>
                <div style={{ color:'#888', fontSize:'0.75rem' }}>Aperta: {fmtDate(sess.createdAt)} {fmtTime(sess.createdAt)}{sess.closedAt ? ' · Chiusa: '+fmtDate(sess.closedAt)+' '+fmtTime(sess.closedAt) : ''}{sess.active && sess.autoCloseAt ? ' · ⏰ auto-chiusura '+fmtTime(sess.autoCloseAt) : ''}{sess.participants ? ' · 🙋 '+sess.participants.length : ''}</div><div style={{marginTop:'0.25rem'}}><span style={{background:sess.active?'#3ce08a22':'#2e2e2e',color:sess.active?'#3ce08a':'#888',fontSize:'0.7rem',padding:'0.15rem 0.5rem',borderRadius:'4px'}}>{sess.active?'● Aperta':'✕ Chiusa'}</span></div></div>
                {sess.active?<button onClick={()=>closeSession(sess.id)} disabled={loadingAdmin} style={s.btn('#2e2e2e','#e03c3c',{fontSize:'0.8rem',opacity:loadingAdmin?0.5:1})}>Chiudi</button>:<button onClick={()=>deleteSession(sess.id)} disabled={loadingAdmin} style={s.btn('#2e2e2e','#e03c3c',{fontSize:'0.8rem',opacity:loadingAdmin?0.3:0.6})}>Elimina</button>}
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
                <button onClick={()=>removeUser(player.username)} disabled={loadingAdmin} style={s.btn('#2e2e2e','#e03c3c',{padding:'0.3rem 0.6rem',fontSize:'0.8rem',opacity:loadingAdmin?0.5:1})}>X</button>
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
              <select value={newDrink.category} onChange={e=>setNewDrink(d=>({...d,category:e.target.value}))} style={{ ...s.input, appearance:'none' }}>
                {CATEGORIES.map(([k,l])=><option key={k} value={k}>{l}</option>)}
              </select>
              <button onClick={addDrink} disabled={loadingAdmin} style={s.btn('#F5C518','#000',{width:'100%',padding:'0.7rem',opacity:loadingAdmin?0.5:1})}>Aggiungi</button>
            </div>
          </div>
          {drinks.map(drink=>(
            <div key={drink.id} style={{ ...s.card(), display:'flex', alignItems:'center', gap:'1rem' }}>
              <span style={{ fontSize:'1.5rem' }}>{drink.emoji}</span>
              <div style={{ flex:1 }}><div style={{ fontFamily:'Bebas Neue', fontSize:'1.1rem' }}>{drink.name}</div><div style={{ color:'#888', fontSize:'0.75rem' }}>{drink.ml}ml / {drink.abv}% / {drink.points}pt</div></div>
              <button onClick={()=>removeDrink(drink.id)} disabled={loadingAdmin} style={s.btn('#2e2e2e','#e03c3c',{padding:'0.3rem 0.6rem',fontSize:'0.8rem',opacity:loadingAdmin?0.5:1})}>X</button>
            </div>
          ))}
        </div>
      )}
      {tab==='stats'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={s.card()}>
            <h3 style={{fontFamily:'Bebas Neue',fontSize:'1.2rem',color:'#888',marginBottom:'0.75rem'}}>🛠 STRUMENTI</h3>
            <label style={s.label}>Modalità spettatore (per TV, senza login)</label>
            <button onClick={()=>{navigator.clipboard?.writeText(window.location.origin+'/tv').then(()=>showMsg('Link copiato!'))}} style={s.btn('#2e2e2e','#F5C518',{width:'100%',marginBottom:'0.75rem',fontSize:'0.9rem'})}>📺 Copia link /tv</button>
            <label style={s.label}>Esporta serata</label>
            <select value={exportSession} onChange={e=>setExportSession(e.target.value)} style={{...s.input,appearance:'none',marginBottom:'0.5rem'}}>
              <option value="">Scegli serata...</option>
              {[...sessions].reverse().map(ss=><option key={ss.id} value={ss.id}>{ss.name}{ss.active?' (in corso)':''}</option>)}
            </select>
            {exportSession && <div style={{display:'flex',gap:'0.5rem'}}>
              <a href={'/api/export?sessionId='+exportSession+'&format=csv'} style={{...s.btn('#F5C518','#000',{flex:1,fontSize:'0.9rem',textAlign:'center',textDecoration:'none',display:'block',padding:'0.5rem'})}}>⬇ CSV</a>
              <a href={'/api/export?sessionId='+exportSession+'&format=json'} style={{...s.btn('#2e2e2e','#F5C518',{flex:1,fontSize:'0.9rem',textAlign:'center',textDecoration:'none',display:'block',padding:'0.5rem'})}}>⬇ JSON</a>
            </div>}
          </div>
          {activeSession ? (() => {
            const sessionLog = board.flatMap(p=>(p.sessionLog||[]).filter(e=>String(e.sessionId)===String(activeSession.id)))
            const totalDrinks = sessionLog.length
            const activePlayers = board.filter(p=>(p.sessionLog||[]).some(e=>String(e.sessionId)===String(activeSession.id)))
            const avg = activePlayers.length ? (totalDrinks/activePlayers.length).toFixed(1) : 0
            const drinkCount = {}
            sessionLog.forEach(e=>{drinkCount[e.name]=(drinkCount[e.name]||0)+1})
            const topDrink = Object.entries(drinkCount).sort((a,b)=>b[1]-a[1])[0]
            const playerCount = {}
            sessionLog.forEach(e=>{playerCount[e.username]=(playerCount[e.username]||0)+1})
            const topPlayer = Object.entries(playerCount).sort((a,b)=>b[1]-a[1])[0]
            return <>
              <div style={s.card(true)}>
                <h3 style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:'#F5C518',marginBottom:'1rem'}}>📊 {activeSession.name}</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  <div style={{background:'#0d0d0d',borderRadius:'8px',padding:'0.75rem',textAlign:'center'}}>
                    <div style={{fontFamily:'Bebas Neue',fontSize:'2.5rem',color:'#F5C518'}}>{totalDrinks}</div>
                    <div style={{color:'#888',fontSize:'0.75rem'}}>Drink totali</div>
                  </div>
                  <div style={{background:'#0d0d0d',borderRadius:'8px',padding:'0.75rem',textAlign:'center'}}>
                    <div style={{fontFamily:'Bebas Neue',fontSize:'2.5rem',color:'#f0f0f0'}}>{avg}</div>
                    <div style={{color:'#888',fontSize:'0.75rem'}}>Media a testa</div>
                  </div>
                  <div style={{background:'#0d0d0d',borderRadius:'8px',padding:'0.75rem',textAlign:'center'}}>
                    <div style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:'#3ce08a'}}>{topDrink?topDrink[0]:'-'}</div>
                    <div style={{color:'#888',fontSize:'0.75rem'}}>Drink più bevuto {topDrink?'('+topDrink[1]+'x)':''}</div>
                  </div>
                  <div style={{background:'#0d0d0d',borderRadius:'8px',padding:'0.75rem',textAlign:'center'}}>
                    <div style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:'#3ce08a'}}>{topPlayer?topPlayer[0]:'-'}</div>
                    <div style={{color:'#888',fontSize:'0.75rem'}}>Più attivo {topPlayer?'('+topPlayer[1]+' drink)':''}</div>
                  </div>
                </div>
              </div>
              <div style={s.card()}>
                <h3 style={{fontFamily:'Bebas Neue',fontSize:'1.2rem',color:'#888',marginBottom:'0.75rem'}}>CLASSIFICA SERATA</h3>
                {[...board].sort((a,b)=>{
                  const sp=p=>(p.sessionLog||[]).filter(e=>String(e.sessionId)===String(activeSession.id)).reduce((s,e)=>s+e.points,0)
                  return sp(b)-sp(a)
                }).map((p,i)=>{
                  const pts=(p.sessionLog||[]).filter(e=>String(e.sessionId)===String(activeSession.id)).reduce((s,e)=>s+e.points,0)
                  const dks=(p.sessionLog||[]).filter(e=>String(e.sessionId)===String(activeSession.id)).length
                  if(dks===0) return null
                  return <div key={p.username} style={{display:'flex',alignItems:'center',gap:'1rem',padding:'0.4rem 0',borderBottom:'1px solid #1a1a1a'}}>
                    <span style={{fontFamily:'Bebas Neue',color:'#555',width:20}}>{i+1}</span>
                    <div style={{flex:1,fontFamily:'Bebas Neue',fontSize:'1.1rem'}}>{p.username}</div>
                    <span style={{color:'#888',fontSize:'0.8rem'}}>{dks} drink</span>
                    <span style={{fontFamily:'Bebas Neue',color:'#F5C518',fontSize:'1.2rem'}}>{pts}pt</span>
                  </div>
                })}
              </div>
            </>
          })() : <p style={{color:'#888',textAlign:'center',padding:'2rem'}}>Nessuna serata attiva</p>}
        </div>
      )}
      {tab==='add_user'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div><label style={s.label}>Username</label><input style={s.input} value={newUser.username} placeholder="es. mario" onChange={e=>setNewUser(p=>({...p,username:e.target.value}))} /></div>
          <div><label style={s.label}>Password</label><input style={s.input} type="password" value={newUser.password} placeholder="..." onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} /></div>
          <button onClick={addUser} disabled={loadingAdmin} style={s.btn('#F5C518','#000',{width:'100%',padding:'0.8rem',fontSize:'1.3rem',opacity:loadingAdmin?0.5:1})}>Aggiungi Giocatore</button>
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
