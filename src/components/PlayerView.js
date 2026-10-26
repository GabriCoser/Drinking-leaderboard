'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CATEGORIES, THEMED_CATEGORIES } from '@/lib/drinks'
import { THEMES, themeOf, isWitchingHour } from '@/lib/theme'
import { sumPoints, countDrinks, inSession, isBonus, isAlcoholic, standingsFor, costumeWinner, rankOf } from '@/lib/score'
import Podium from '@/components/Podium'
import { useApplyTheme, HalloweenFX } from '@/components/Theme'
import { HalloweenTab, BooOverlay, WitchingBanner } from '@/components/Halloween'
import { s, api, calcBAC, bacStatus, compressAndUpload, fmtTime, fmtDate, fmtAgo, fmtBonus, Avatar } from '@/components/ui'

const perSession = (log, pred) => { const m = {}; log.filter(pred).forEach(e => { m[e.sessionId] = (m[e.sessionId] || 0) + 1 }); return Math.max(0, ...Object.values(m)) }
const maxPerSession = log => perSession(log, isAlcoholic)
const isShot = e => isAlcoholic(e) && (e.category ? e.category === 'shot' : /^shot/.test(e.drinkId || ''))
const hasBonus = (log, type) => log.some(e => isBonus(e) && e.bonusType === type)
const ACHIEVEMENTS = [
  { id:'first', emoji:'🍺', name:'Prima goccia', desc:'Il tuo primo drink', check:(log)=>countDrinks(log)>=1 },
  { id:'five_night', emoji:'🔥', name:'On fire', desc:'5 drink in un evento', check:(log)=>maxPerSession(log)>=5 },
  { id:'eight_night', emoji:'🐙', name:'Piovra', desc:'8 drink in un evento', check:(log)=>maxPerSession(log)>=8 },
  { id:'fifty', emoji:'💯', name:'Mezzo secolo', desc:'50 punti totali', check:(log)=>sumPoints(log)>=50 },
  { id:'explorer', emoji:'🌈', name:'Esploratore', desc:'5 drink diversi provati', check:(log)=>new Set(log.filter(isAlcoholic).map(e=>e.drinkId)).size>=5 },
  { id:'shots', emoji:'🥃', name:'Shottomane', desc:'3 shot in un evento', check:(log)=>perSession(log,isShot)>=3 },
  { id:'water', emoji:'💧', name:'Idratato', desc:"3 bicchieri d'acqua in un evento", check:(log)=>perSession(log,e=>e.drinkId==='water')>=3 },
  { id:'owl', emoji:'🦉', name:'Gufo', desc:'Un drink dopo le 3 di notte', check:(log)=>log.filter(isAlcoholic).some(e=>{const h=new Date(e.timestamp).getHours();return h>=3&&h<6}) },
  { id:'leader', emoji:'👑', name:'Capolista', desc:'Primo nella classifica di sempre', check:(log,rank)=>rank===1&&log.length>0 },
  { id:'hw_treat', hw:true, emoji:'🍬', name:'Dolcetto!', desc:'Ricevi un dolcetto dalla strega', check:(log)=>hasBonus(log,'treat') },
  { id:'hw_dare', hw:true, emoji:'👻', name:'Senza paura', desc:'Supera uno scherzetto', check:(log)=>hasBonus(log,'dare') },
  { id:'hw_bite', hw:true, emoji:'🧛', name:'Vampiro', desc:'Mordi chi è in testa', check:(log)=>hasBonus(log,'bite') },
]
function LogRow({ e, compact = false, actions = null }) {
  const bonus = isBonus(e)
  return (
    <div style={compact ? { display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.3rem 0', borderBottom:'1px solid var(--surface)' } : { ...s.card(), display:'flex', alignItems:'center', gap:'1rem' }}>
      <span style={{ fontSize: compact ? '1rem' : '1.5rem' }}>{e.emoji}</span>
      <div style={{ flex:1 }}>
        <div style={{ color:'var(--text)', fontSize: compact ? '0.8rem' : '0.95rem', fontWeight: compact ? 400 : 600 }}>{e.name}{bonus && <span style={{ color:'var(--muted)', fontWeight:400, fontSize:'0.7rem' }}> · bonus</span>}</div>
        <div style={{ color: compact ? 'var(--faint)' : 'var(--muted)', fontSize: compact ? '0.65rem' : '0.7rem' }}>{!bonus && !compact ? e.ml+'ml / ' : ''}{fmtDate(e.timestamp)} {fmtTime(e.timestamp)}</div>
        {!compact && e.note && <div style={{ color:'var(--accent)', fontSize:'0.7rem', fontStyle:'italic', marginTop:'0.15rem' }}>📝 {e.note}</div>}
      </div>
      <div style={{ fontFamily:'Bebas Neue', fontSize: compact ? '0.9rem' : '1.3rem', color: e.points < 0 ? 'var(--danger)' : 'var(--accent)', marginRight: compact ? 0 : '0.25rem' }}>{bonus ? fmtBonus(e.points) : e.points}pt</div>
      {actions}
    </div>
  )
}

export default function PlayerView({ user, onLogout }) {
  const [tab, setTab] = useState('home')
  const [players, setPlayers] = useState([])
  const [costumes, setCostumes] = useState({})
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
  const [openCats, setOpenCats] = useState({ halloween: true, birra: true })
  const [finale, setFinale] = useState(null)
  const [boardSel, setBoardSel] = useState(undefined) // undefined = auto (evento attivo se c'è, altrimenti di sempre)
  const [hw, setHw] = useState({ enabled: false })
  const [boo, setBoo] = useState(false)
  const prevRef = useRef(null)
  const bacLoaded = useRef(false)
  const taps = useRef([])
  const me = user.username
  const theme = themeOf(activeSession)
  const T = THEMES[theme]
  const isHw = theme === 'halloween'
  useApplyTheme(theme)
  const pushToast = useCallback(text => {
    const id = Date.now() + Math.random()
    setToasts(ts => [...ts.slice(-3), { id, text }])
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 6000)
  }, [])
  const load = useCallback(async () => {
    try {
      const ok = r => { if (r.status === 401) throw Object.assign(new Error(), { auth: true }); if (!r.ok) throw new Error(); return r.json() }
      const [pr, dr, lr, sr, cr, fr, hr] = await Promise.all([
        fetch('/api/players').then(ok),
        fetch('/api/drinks').then(ok),
        fetch('/api/log').then(ok),
        fetch('/api/sessions').then(ok),
        fetch('/api/challenges').then(ok),
        fetch('/api/favorites').then(ok),
        fetch('/api/halloween').then(r => r.json()).catch(() => ({ enabled: false })),
      ])
      setLoadError('')
      const allPlayers = pr.players || []
      setPlayers(allPlayers); setActiveSession(pr.activeSession); setCostumes(pr.costumes || {})
      setDrinks(dr.drinks||[]); setMyLog(lr.log||[])
      setSessions(sr.sessions||[])
      setChallenges(cr.challenges||[]); setFavorites(fr.favorites||[])
      setHw(hr || { enabled: false })
      const mine = allPlayers.find(p=>p.username===me)
      if (mine?.bac_info) { setBacInfo(mine.bac_info); if (!bacLoaded.current) { setBacForm(mine.bac_info); bacLoaded.current = true } }
      if (mine?.avatar) setAvatar(mine.avatar)
      if (pr.activeSession) {
        fetch('/api/photos?sessionId='+pr.activeSession.id).then(r=>r.json()).then(d=>setSessionPhotos(d.photos||[])).catch(()=>{})
      } else setSessionPhotos([])
      // notifiche in-app: nuovi drink altrui, sorpassi in classifica, eventi sfida, bonus Halloween
      const allLog = allPlayers.flatMap(p=>p.sessionLog||[])
      const act = pr.activeSession
      const board = act ? standingsFor(allPlayers, act, act.id) : standingsFor(allPlayers, null, null, me)
      const rank = rankOf(board, me)
      const prev = prevRef.current
      const parts = act?.participants || []
      // evento appena chiuso (o sostituito da uno nuovo): podio finale
      if (prev?.activeS && act?.id !== prev.activeS.id) {
        const sid = prev.activeS.id
        const standings = standingsFor(allPlayers, prev.activeS, sid).map(p => ({ username: p.username, avatar: p.avatar, points: p.pts, drinks: p.dks }))
        if (standings.some(p => p.points !== 0 || p.drinks > 0)) setFinale({ name: prev.activeS.name, theme: themeOf(prev.activeS), standings, costume: costumeWinner(pr.costumes, sid) })
      }
      if (prev) {
        allLog.filter(e=>!prev.logIds.has(e.id)).slice(-4).forEach(e => {
          if (e.username === me) { if (e.bonusType === 'bitten') pushToast(`🩸 ${e.name.replace('Morso da ', '')} ti ha morso: ${e.points} punti!`); return }
          if (e.bonusType === 'bitten') return
          pushToast(isBonus(e) ? `${e.emoji} ${e.username}: ${e.name} (${fmtBonus(e.points)})` : `${e.emoji} ${e.username} ha aggiunto ${e.name}`)
        })
        parts.filter(u=>prev.parts && !prev.parts.has(u) && u!==me)
          .forEach(u=>pushToast(`🙋 ${u} partecipa all'evento!`))
        if (prev.rank>0 && rank>prev.rank && prev.activeS?.id === act?.id) pushToast('📉 Ti hanno superato in classifica!')
        ;(cr.challenges||[]).forEach(c=>{
          const involved = c.challenger===me||c.challenged===me
          const old = prev.challenges[c.id]
          if (!old && c.challenged===me && c.status==='pending') pushToast(`⚔️ ${c.challenger} ti ha sfidato!`)
          if (old && old!==c.status && involved) {
            if (c.status==='accepted') pushToast(c.challenger===me?`⚔️ ${c.challenged} ha accettato la sfida!`:'⚔️ Sfida accettata, si comincia!')
            if (c.status==='declined' && c.challenger===me) pushToast(`🙅 ${c.challenged} ha rifiutato la sfida`)
            if (c.status==='completed') pushToast(c.challenged===me?'🏆 Sfida completata!':`😬 ${c.challenged} ha completato la tua sfida!`)
            if (c.status==='failed') pushToast(c.challenged===me?'❌ Sfida fallita...':`🏆 ${c.challenged} non ce l'ha fatta!`)
          }
        })
      }
      prevRef.current = { logIds:new Set(allLog.map(e=>e.id)), rank, parts:new Set(parts), challenges:Object.fromEntries((cr.challenges||[]).map(c=>[c.id,c.status])), activeS: act ? { id: act.id, name: act.name, theme: act.theme, participants: act.participants } : null }
    } catch (e) {
      if (e.auth) return onLogout()
      setLoadError('Errore nel caricamento dati')
    }
  }, [me, pushToast, onLogout])
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i) }, [load])
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(i) }, [])
  async function confirmAdd() {
    const d = confirmDrink, n = note
    setConfirmDrink(null); setNote('')
    const { ok, status, data } = await api('/api/log', 'POST', { drinkId: d.id, foodContext: food, note: n || null })
    if (status === 401) return onLogout()
    if (!ok) pushToast('⚠️ ' + (data.error || 'Errore'))
    else if (d.abv === 0) pushToast(isHw ? '💧 Anche i vampiri si idratano. Bravo!' : '💧 Idratazione registrata. Bravo!')
    load()
  }
  async function removeDrink(id) { await api('/api/log', 'DELETE', { entryId: id }); load() }
  async function saveBac() {
    const w = parseFloat(bacForm.weight), h = parseFloat(bacForm.height), a = parseInt(bacForm.age)
    if (!w || !h || !a || w <= 0 || h <= 0 || a <= 0) { setBacError('Inserisci valori validi e maggiori di zero'); return }
    const info = { weight: w, height: h, age: a, sex: bacForm.sex }
    const { ok, data } = await api('/api/bac', 'POST', info)
    if (!ok) { setBacError(data.error || 'Errore nel salvataggio'); return }
    setBacError(''); setBacInfo(info); setBacSaved(true); setTimeout(()=>setBacSaved(false),2000); load()
  }
  async function logout() { await fetch('/api/auth/logout',{method:'POST'}); onLogout() }
  async function setParticipation(join) { await api('/api/sessions', 'PATCH', { action: join ? 'join' : 'leave' }); load() }
  async function sendChallenge(challenged, deadline) {
    const { ok, data } = await api('/api/challenges', 'POST', { challenged, deadline })
    pushToast(ok ? `⚔️ Sfida inviata a ${challenged}!` : '⚠️ ' + (data.error || 'Errore'))
    setChallengeTarget(null); load()
  }
  async function respondToChallenge(id, accept) { await api('/api/challenges', 'PATCH', { id, accept }); load() }
  async function toggleFav(drinkId) {
    setFavorites(f=>f.includes(drinkId)?f.filter(x=>x!==drinkId):[...f,drinkId])
    await api('/api/favorites', 'POST', { drinkId })
  }
  async function editNote(entry) {
    const n = prompt('Nota sul drink (dove, con chi...):', entry.note||'')
    if (n===null) return
    await api('/api/log', 'PATCH', { entryId: entry.id, note: n })
    load()
  }
  async function reactPhoto(photo, emoji) {
    if (!activeSession) return
    await api('/api/photos', 'POST', { url: photo.url, sessionId: activeSession.id, emoji })
    const d = await fetch('/api/photos?sessionId='+activeSession.id).then(r=>r.json())
    setSessionPhotos(d.photos||[])
  }
  function tapLogo() {
    const t = Date.now()
    taps.current = [...taps.current.filter(x => t - x < 2500), t]
    if (taps.current.length >= 5) { taps.current = []; setBoo(true); setTimeout(() => setBoo(false), 1700) }
  }

  const sid = activeSession?.id ?? null
  const hasRoster = Array.isArray(activeSession?.participants)
  // eventi vecchi senza lista iscritti: tutti partecipano
  const joined = !!activeSession && (!hasRoster || activeSession.participants.includes(me))
  const canDrink = !!activeSession
  const eventBoard = activeSession ? standingsFor(players, activeSession, sid) : []
  const allTimeBoard = standingsFor(players, null, null, me)
  const allTimeRank = rankOf(allTimeBoard, me)
  const eventEntries = activeSession ? inSession(myLog, sid) : []
  const homePoints = activeSession ? sumPoints(eventEntries) : sumPoints(myLog)
  const homeRank = activeSession ? rankOf(eventBoard, me) : allTimeRank
  const homeDrinks = activeSession ? countDrinks(eventEntries) : countDrinks(myLog)
  const bac = calcBAC(eventEntries, bacInfo, now)
  const bacOverall = calcBAC(myLog, bacInfo, now)
  const bs = bacStatus(bac)
  const viewLog = selectedSession ? myLog.filter(e=>e.sessionId===selectedSession) : myLog
  const soberMs = bac > 0.002 ? (bac/0.015)*3600000 : 0
  const boardSessionId = boardSel===undefined ? sid : (boardSel==='' ? null : parseInt(boardSel))
  const boardPlayers = boardSessionId ? standingsFor(players, sessions.find(ss=>ss.id===boardSessionId), boardSessionId) : allTimeBoard
  const myChallenges = activeSession ? challenges.filter(c=>c.sessionId===sid && (c.challenger===me||c.challenged===me) && c.status!=='declined') : []
  const feed = players.flatMap(p=>p.sessionLog||[]).filter(e=>activeSession?e.sessionId===sid:true).sort((a,b)=>b.timestamp-a.timestamp).slice(0,8)
  const sessPoints = u => eventBoard.find(p=>p.username===u)?.pts ?? 0
  const showHwTab = isHw && !!activeSession && hw.enabled
  const curTab = tab === 'halloween' && !showHwTab ? 'home' : tab
  const visibleDrinks = drinks.filter(d => { const t = Object.entries(THEMED_CATEGORIES).find(([, cat]) => cat === d.category); return !t || t[0] === theme })
  const TABS = [['home','🏠'], ...(showHwTab ? [['halloween','🎃']] : []), ['drinks', isHw ? '🧪' : '🍺'], ['log','📋'], ['board','🏆'], ['photos','📸'], ['stats','📊'], ['profile','👤']]
  return (
    <>
    {isHw && <HalloweenFX now={now} />}
    {boo && <BooOverlay theme={theme} />}
    {finale && <Podium sessionName={finale.name} standings={finale.standings} theme={finale.theme} costume={finale.costume} onClose={()=>setFinale(null)} />}
    <div style={{position:'fixed',top:'0.75rem',left:'50%',transform:'translateX(-50%)',zIndex:1001,display:'flex',flexDirection:'column',gap:'0.4rem',width:'90%',maxWidth:440,pointerEvents:'none'}}>
      {toasts.map(t=><div key={t.id} style={{background:'var(--surface)',border:'1px solid var(--accent)',borderRadius:'10px',padding:'0.6rem 1rem',color:'var(--text)',fontSize:'0.85rem',boxShadow:'0 4px 12px rgba(0,0,0,0.5)',animation:'fadeUp 0.3s ease both'}}>{t.text}</div>)}
    </div>
    {challengeTarget && (
      <div style={s.overlay}>
        <div style={s.modal()}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>⚔️</div>
          <h2 style={{fontFamily:'Bebas Neue',fontSize:'1.8rem',color:'var(--accent)',marginBottom:'0.25rem'}}>SFIDA {challengeTarget.toUpperCase()}</h2>
          <p style={{color:'var(--muted)',fontSize:'0.8rem',marginBottom:'1.5rem'}}>&quot;Bevi quanto me&quot;: {challengeTarget} vince se raggiunge i tuoi punti entro la scadenza.</p>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            <button onClick={()=>sendChallenge(challengeTarget, Date.now()+3600000)} style={s.btn('var(--accent)','var(--accent-ink)',{padding:'0.7rem'})}>Entro 1 ora</button>
            <button onClick={()=>sendChallenge(challengeTarget, Date.now()+2*3600000)} style={s.btn('var(--accent)','var(--accent-ink)',{padding:'0.7rem'})}>Entro 2 ore</button>
            <button onClick={()=>{const m=new Date();m.setHours(24,0,0,0);sendChallenge(challengeTarget, m.getTime())}} style={s.btn('var(--accent)','var(--accent-ink)',{padding:'0.7rem'})}>Entro mezzanotte</button>
            <button onClick={()=>setChallengeTarget(null)} style={s.btn('var(--border)','var(--muted)',{padding:'0.7rem'})}>Annulla</button>
          </div>
        </div>
      </div>
    )}
    {confirmDrink && (
      <div style={s.overlay}>
        <div style={s.modal()}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>{confirmDrink.emoji}</div>
          <h2 style={{fontFamily:'Bebas Neue',fontSize:'2rem',color:'var(--accent)',marginBottom:'0.25rem'}}>{confirmDrink.name}</h2>
          {confirmDrink.desc && <p style={{color:'var(--text)',fontSize:'0.9rem',marginBottom:'0.4rem',lineHeight:1.35}}>{confirmDrink.desc}</p>}
          <p style={{color:'var(--muted)',fontSize:'0.85rem',marginBottom:'1rem'}}>{confirmDrink.ml}ml / {confirmDrink.abv}% / {confirmDrink.points} punti</p>
          <input style={{...s.input,marginBottom:'1rem',fontSize:'0.85rem'}} value={note} placeholder="Nota (opzionale): dove, con chi..." onChange={e=>setNote(e.target.value)} />
          <div style={{display:'flex',gap:'0.75rem'}}>
            <button onClick={()=>{setConfirmDrink(null);setNote('')}} style={s.btn('var(--border)','var(--muted)',{flex:1,padding:'0.8rem',fontSize:'1.2rem'})}>Annulla</button>
            <button onClick={confirmAdd} style={s.btn('var(--accent)','var(--accent-ink)',{flex:1,padding:'0.8rem',fontSize:'1.2rem'})}>Aggiungi</button>
          </div>
        </div>
      </div>
    )}
    <main className="hw-content" style={{ maxWidth:480, margin:'0 auto', padding:'0 0 5rem', animation: boo ? 'shake 0.5s' : undefined }}>
      <div style={{ padding:'1.5rem 1rem 0.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.75rem' }}>
        <button onClick={tapLogo} aria-label="Logo" style={{ background:'none', border:'none', fontSize:'2.4rem', cursor:'pointer', padding:0, lineHeight:1 }}>{T.logo}</button>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:'2rem', color:'var(--accent)', lineHeight:1 }}>{T.title[0]}</h1>
          <h1 style={{ fontSize:'2rem', lineHeight:1 }}>{T.title[1]}</h1>
          {T.subtitle && <div style={{ color:'var(--muted)', fontSize:'0.7rem', letterSpacing:'0.1em', marginTop:'0.2rem' }}>{T.subtitle}</div>}
        </div>
        <button onClick={logout} style={s.btn('var(--border)','var(--muted)',{fontSize:'0.8rem',padding:'0.4rem 0.8rem'})}>Esci</button>
      </div>
      {loadError && <div style={{ margin:'0 1rem 0.5rem', background:'color-mix(in srgb, var(--danger) 12%, var(--bg))', border:'1px solid var(--danger)', borderRadius:'8px', padding:'0.5rem 1rem', color:'var(--danger)', fontSize:'0.85rem' }}>{loadError}</div>}
      {isHw && isWitchingHour(new Date(now)) && <WitchingBanner />}
      {activeSession
        ? <div style={{ margin:'0 1rem 1rem', background:'color-mix(in srgb, var(--ok) 8%, var(--bg))', border:'1px solid var(--ok)', borderRadius:'8px', padding:'0.5rem 1rem' }}>
            <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
              <span style={{ color:'var(--ok)', fontSize:'0.75rem' }}>● LIVE</span>
              <span style={{ color:'var(--text)', fontSize:'0.85rem', flex:1 }}>{activeSession.name}</span>
              {hasRoster && (joined
                ? <button onClick={()=>setParticipation(false)} style={s.btn('transparent','var(--ok)',{fontSize:'0.75rem',padding:'0.2rem 0.5rem',border:'1px solid color-mix(in srgb, var(--ok) 27%, transparent)'})}>✓ Ci sei</button>
                : <button onClick={()=>setParticipation(true)} style={s.btn('var(--ok)','var(--accent-ink)',{fontSize:'0.85rem',padding:'0.3rem 0.8rem'})}>🙋 Partecipo!</button>)}
            </div>
            {hasRoster && activeSession.participants.length > 0 && (
              <div style={{ color:'var(--muted)', fontSize:'0.7rem', marginTop:'0.3rem' }}>🙋 {activeSession.participants.length} partecipant{activeSession.participants.length===1?'e':'i'}: {activeSession.participants.slice(0,8).join(', ')}{activeSession.participants.length>8?` e altri ${activeSession.participants.length-8}`:''}</div>
            )}
          </div>
        : <div style={{ margin:'0 1rem 1rem', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'8px', padding:'0.5rem 1rem' }}><span style={{ color:'var(--muted)', fontSize:'0.85rem' }}>Nessun evento attivo: aspetta che l&apos;admin ne avvii uno</span></div>
      }
      <div style={{ display:'flex', gap:'0.4rem', padding:'0 1rem 1rem', overflowX:'auto' }}>
        {TABS.map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={s.btn(curTab===k?'var(--accent)':'var(--surface)',curTab===k?'var(--accent-ink)':'var(--muted)',{flex:1,fontSize:'1.2rem',padding:'0.5rem',border:'1px solid var(--border)',minWidth:46})}>{l}</button>
        ))}
      </div>
      <div style={{ padding:'0 1rem' }}>
        {curTab==='home' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={s.card(true)}>
              <p style={{ color:'var(--muted)', fontSize:'0.85rem' }}>{isHw ? `Benvenuto nella cripta, ${me}! 🦇` : `Ciao, ${me}!`}</p>
              <div style={{ display:'flex', gap:'1rem', marginTop:'0.5rem' }}>
                <div><div style={{ fontFamily:'Bebas Neue', fontSize:'3rem', color:'var(--accent)', lineHeight:1 }}>{homePoints}</div><div style={{ color:'var(--muted)', fontSize:'0.75rem' }}>{activeSession?'punti evento':'punti di sempre'}</div></div>
                <div><div style={{ fontFamily:'Bebas Neue', fontSize:'3rem', color:'var(--text)', lineHeight:1 }}>#{homeRank||'-'}</div><div style={{ color:'var(--muted)', fontSize:'0.75rem' }}>posizione</div></div>
                <div><div style={{ fontFamily:'Bebas Neue', fontSize:'3rem', color:'var(--text)', lineHeight:1 }}>{homeDrinks}</div><div style={{ color:'var(--muted)', fontSize:'0.75rem' }}>{activeSession?'drink stasera':'drink totali'}</div></div>
              </div>
            </div>
            {bacInfo ? (
              <div style={{ ...s.card(), borderColor:bs.color }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ color:'var(--muted)', fontSize:'0.75rem' }}>BAC EVENTO</p>
                    <div style={{ fontFamily:'Bebas Neue', fontSize:'2.5rem', color:bs.color, lineHeight:1 }}>{bac.toFixed(3)}%</div>
                    <span style={{ background:bs.color+'22', color:bs.color, fontSize:'0.75rem', padding:'0.2rem 0.5rem', borderRadius:'4px' }}>{bs.label}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ color:'var(--muted)', fontSize:'0.7rem' }}>BAC TOTALE</p>
                    <div style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'var(--muted)' }}>{bacOverall.toFixed(3)}%</div>
                  </div>
                </div>
                {soberMs > 0 && <p style={{ color:'var(--muted)', fontSize:'0.75rem', marginTop:'0.5rem' }}>🕐 Sobrio tra ~{Math.floor(soberMs/3600000)}h {Math.round((soberMs%3600000)/60000)}m</p>}
                <p style={{ color:'var(--faint)', fontSize:'0.65rem', marginTop:'0.5rem' }}>Stima indicativa. Non guidare.</p>
              </div>
            ) : (
              <div style={{ ...s.card(), textAlign:'center', padding:'1.5rem' }}>
                <p style={{ color:'var(--muted)', fontSize:'0.9rem', marginBottom:'0.75rem' }}>Imposta i dati nel profilo per vedere il BAC</p>
                <button onClick={()=>setTab('profile')} style={s.btn('var(--border)','var(--accent)',{fontSize:'0.9rem'})}>Vai al profilo</button>
              </div>
            )}
            <button onClick={()=>setTab('drinks')} style={s.btn('var(--accent)','var(--accent-ink)',{width:'100%',padding:'1rem',fontSize:'1.5rem',borderRadius:'12px'})}>{isHw ? '🧪 Aggiungi pozione' : '🍺 Aggiungi drink'}</button>
            {showHwTab && (
              <button onClick={()=>setTab('halloween')} style={{ ...s.card(), display:'flex', alignItems:'center', gap:'0.75rem', cursor:'pointer', textAlign:'left', width:'100%' }}>
                <span style={{ fontSize:'2rem' }}>{hw.dare ? '👻' : '🚪'}</span>
                <span style={{ flex:1 }}>
                  <span style={{ display:'block', fontFamily:'Bebas Neue', fontSize:'1.2rem', color:'var(--accent)' }}>DOLCETTO O SCHERZETTO?</span>
                  <span style={{ color:'var(--muted)', fontSize:'0.8rem' }}>{hw.dare ? 'Hai uno scherzetto da completare!' : (hw.cooldownUntil||0) > now ? 'La strega sta ricaricando i dolcetti...' : 'La porta della strega è aperta: bussa!'}</span>
                </span>
                <span style={{ color:'var(--muted)' }}>›</span>
              </button>
            )}
            {myChallenges.length > 0 && (
              <div style={s.card()}>
                <h3 style={s.h3('var(--accent)',{fontSize:'1.2rem',marginBottom:'0.6rem'})}>⚔️ SFIDE</h3>
                <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
                  {myChallenges.map(c=>{
                    const amChallenged = c.challenged===me
                    const other = amChallenged ? c.challenger : c.challenged
                    const myPts = sessPoints(me), otherPts = sessPoints(other)
                    return <div key={c.id} style={{background:'var(--bg)',borderRadius:'8px',padding:'0.6rem 0.8rem'}}>
                      <div style={{color:'var(--text)',fontSize:'0.85rem',marginBottom:'0.3rem'}}>
                        {amChallenged ? <><b>{c.challenger}</b> ti ha sfidato: bevi quanto lui/lei</> : <>Hai sfidato <b>{c.challenged}</b></>} · scade {fmtTime(c.deadline)}
                      </div>
                      {c.status==='pending' && amChallenged && (
                        <div style={{display:'flex',gap:'0.5rem'}}>
                          <button onClick={()=>respondToChallenge(c.id,true)} style={s.btn('var(--ok)','var(--accent-ink)',{flex:1,fontSize:'0.9rem',padding:'0.4rem'})}>Accetta</button>
                          <button onClick={()=>respondToChallenge(c.id,false)} style={s.btn('var(--border)','var(--danger)',{flex:1,fontSize:'0.9rem',padding:'0.4rem'})}>Rifiuta</button>
                        </div>
                      )}
                      {c.status==='pending' && !amChallenged && <span style={{color:'var(--muted)',fontSize:'0.75rem'}}>⏳ In attesa di risposta...</span>}
                      {c.status==='accepted' && (
                        <div style={{display:'flex',gap:'1rem',alignItems:'center'}}>
                          <span style={{fontFamily:'Bebas Neue',fontSize:'1.2rem',color:'var(--accent)'}}>tu {myPts}</span>
                          <span style={{color:'var(--faint)'}}>vs</span>
                          <span style={{fontFamily:'Bebas Neue',fontSize:'1.2rem',color:'var(--text)'}}>{other} {otherPts}</span>
                        </div>
                      )}
                      {c.status==='completed' && <span style={{color:'var(--ok)',fontSize:'0.8rem'}}>🏆 Sfida completata da {c.challenged}</span>}
                      {c.status==='failed' && <span style={{color:'var(--danger)',fontSize:'0.8rem'}}>❌ {c.challenged} non ce l&apos;ha fatta ({c.result?.challenged ?? 0} vs {c.result?.challenger ?? 0})</span>}
                    </div>
                  })}
                </div>
              </div>
            )}
            {feed.length > 0 && (
              <div style={s.card()}>
                <h3 style={s.h3('var(--muted)',{fontSize:'1.2rem',marginBottom:'0.6rem'})}>📡 ATTIVITÀ</h3>
                <div style={{display:'flex',flexDirection:'column'}}>
                  {feed.map((e,i)=>(
                    <div key={e.id} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.35rem 0',borderBottom:i<feed.length-1?'1px solid var(--surface2)':'none'}}>
                      <span style={{fontSize:'1.2rem'}}>{e.emoji}</span>
                      <div style={{flex:1,color:'var(--text)',fontSize:'0.85rem'}}><b>{e.username===me?'tu':e.username}</b> · {e.name}{isBonus(e) && <span style={{color:e.points<0?'var(--danger)':'var(--ok)'}}> {fmtBonus(e.points)}</span>}</div>
                      <span style={{color:'var(--faint)',fontSize:'0.7rem'}}>{fmtAgo(e.timestamp,now)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {curTab==='halloween' && (
          <HalloweenTab hw={hw} setHw={setHw} me={me} participants={activeSession?.participants || []} players={players} onChange={load} pushToast={pushToast} />
        )}
        {curTab==='drinks' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {!activeSession && <div style={{ background:'color-mix(in srgb, var(--danger) 14%, var(--bg))', border:'1px solid var(--danger)', borderRadius:'8px', padding:'0.75rem', color:'var(--danger)', fontSize:'0.85rem' }}>Nessun evento attivo</div>}
            {activeSession && !joined && (
              <div style={{ background:'color-mix(in srgb, var(--danger) 14%, var(--bg))', border:'1px solid var(--danger)', borderRadius:'8px', padding:'0.75rem', color:'var(--danger)', fontSize:'0.85rem' }}>
                Non risulti fra i partecipanti: col primo drink entri automaticamente nell&apos;evento.
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
                return <div key={drink.id} onClick={()=>canDrink&&setConfirmDrink(drink)} style={{ ...s.card(fav), display:'flex', alignItems:'center', gap:'1rem', border:`1px solid ${fav?'var(--accent-dim)':'var(--border)'}`, cursor:canDrink?'pointer':'not-allowed', opacity:canDrink?1:0.5, width:'100%', textAlign:'left' }}>
                  <span style={{ fontSize:'1.8rem' }}>{drink.emoji}</span>
                  <div style={{ flex:1 }}><div style={{ color:'var(--text)', fontSize:'1rem', fontWeight:600 }}>{drink.name}</div>{drink.desc && <div style={{ color:'var(--text)', opacity:0.75, fontSize:'0.78rem', lineHeight:1.3, margin:'0.1rem 0' }}>{drink.desc}</div>}<div style={{ color:'var(--muted)', fontSize:'0.75rem' }}>{drink.ml}ml / {drink.abv > 0 ? drink.abv + '%' : 'analcolico'}</div></div>
                  <div style={{ textAlign:'right' }}><div style={{ fontFamily:'Bebas Neue', fontSize:'1.4rem', color:drink.points?'var(--accent)':'var(--ok)' }}>{drink.points}</div><div style={{ color:'var(--muted)', fontSize:'0.7rem' }}>punti</div></div>
                  <button onClick={e=>{e.stopPropagation();toggleFav(drink.id)}} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',padding:'0.2rem',opacity:fav?1:0.35}} title={fav?'Rimuovi dai preferiti':'Aggiungi ai preferiti'}>⭐</button>
                </div>
              }
              const favDrinks = visibleDrinks.filter(d=>favorites.includes(d.id))
              return <>
                {favDrinks.length > 0 && <>
                  <div style={{ color:'var(--accent)', letterSpacing:'0.05em', fontFamily:'Bebas Neue', fontSize:'1.1rem' }}>⭐ PREFERITI</div>
                  {favDrinks.map(renderDrink)}
                </>}
                {CATEGORIES.map(([key, label]) => {
                  const list = visibleDrinks.filter(d=>(d.category||'altro')===key && !favorites.includes(d.id))
                  if (!list.length) return null
                  const openC = !!openCats[key]
                  return <div key={key} style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                    <button onClick={()=>setOpenCats(o=>({...o,[key]:!o[key]}))} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'10px', padding:'0.7rem 1rem', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', width:'100%' }}>
                      <span style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem', color:openC?'var(--accent)':'var(--text)', letterSpacing:'0.05em' }}>{label}</span>
                      <span style={{ color:'var(--muted)', fontSize:'0.8rem' }}>{list.length} {openC?'▲':'▼'}</span>
                    </button>
                    {openC && list.map(renderDrink)}
                  </div>
                })}
                <p style={{ color:'var(--faint)', fontSize:'0.7rem', textAlign:'center' }}>Punti = alcol puro (1 punto ogni 4 g). Gli analcolici valgono 0 ma contano per il BAC... e per la salute 💧</p>
              </>
            })()}
          </div>
        )}
        {curTab==='log' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <div><label style={s.label}>Filtra evento</label>
              <select value={selectedSession||''} onChange={e=>setSelectedSession(e.target.value?parseInt(e.target.value):null)} style={{ ...s.input, appearance:'none' }}>
                <option value="">Tutti</option>
                {sessions.map(ss=><option key={ss.id} value={ss.id}>{ss.name}{ss.active?' (in corso)':''}</option>)}
              </select>
            </div>
            {viewLog.length===0 && <p style={{ color:'var(--muted)', textAlign:'center', padding:'2rem' }}>Nessun drink</p>}
            {viewLog.map(e => (
              <LogRow key={e.id} e={e} actions={!isBonus(e) && <>
                <button onClick={()=>editNote(e)} style={s.btn('var(--border)','var(--muted)',{padding:'0.3rem 0.5rem',fontSize:'0.8rem'})} title="Nota">📝</button>
                <button onClick={()=>removeDrink(e.id)} style={s.btn('var(--border)','var(--danger)',{padding:'0.3rem 0.6rem',fontSize:'0.8rem'})} title="Elimina">X</button>
              </>} />
            ))}
          </div>
        )}
        {curTab==='board' && (
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            <div><label style={s.label}>Visualizza</label>
              <select value={boardSessionId??''} onChange={e=>setBoardSel(e.target.value)} style={{...s.input,appearance:'none'}}>
                <option value="">🏛️ Classifica di sempre (tutti gli eventi)</option>
                {sessions.map(ss=><option key={ss.id} value={ss.id}>{ss.name}{ss.active?' (in corso)':''}</option>)}
              </select>
            </div>
            {boardPlayers.length===0 && <p style={{color:'var(--muted)',textAlign:'center',padding:'2rem'}}>Nessun partecipante</p>}
            {boardPlayers.map((player,i)=>{
              const isMe=player.username===me
              const pBac=player.bac_info?calcBAC(player.log,player.bac_info,now):null
              const open=viewingPlayer===player.username
              return <div key={player.username} style={s.card(isMe,{border:isMe?'1px solid var(--accent)':'1px solid var(--border)'})}>
                <div style={{display:'flex',alignItems:'center',gap:'1rem',cursor:'pointer'}} onClick={()=>setViewingPlayer(open?null:player.username)}>
                  <span style={{width:36,height:36,background:i<3?'var(--accent)':'var(--border)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:i<3?'1.2rem':'1rem',color:i<3?'var(--accent-ink)':'var(--muted)',flexShrink:0}}>{i<3?(isHw?T.medals[i]:['👑','2','3'][i]):i+1}</span>
                  <Avatar url={player.avatar} name={player.username} size={36} />
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:isMe?'var(--accent)':'var(--text)'}}>{player.username} <span style={{fontSize:'0.7rem',color:'var(--faint)'}}>{open?'▲':'▼'}</span>{isMe&&<span style={{background:'var(--accent)',color:'var(--accent-ink)',fontSize:'0.6rem',padding:'0.1rem 0.3rem',borderRadius:'3px',marginLeft:'0.5rem'}}>TU</span>}</div>
                    <div style={{color:'var(--muted)',fontSize:'0.75rem'}}>{player.dks} drink{pBac!==null?' / BAC '+pBac.toFixed(3)+'%':''}</div>
                  </div>
                  <div style={{fontFamily:'Bebas Neue',fontSize:'1.8rem',color:i===0?'var(--accent)':'var(--text)'}}>{player.pts}</div>
                </div>
                {open&&<div style={{marginTop:'0.75rem',borderTop:'1px solid var(--border)',paddingTop:'0.5rem'}}>
                  {player.log.length===0?<p style={{color:'var(--faint)',fontSize:'0.8rem',textAlign:'center'}}>Nessun drink</p>:[...player.log].sort((a,b)=>b.timestamp-a.timestamp).map(e=><LogRow key={e.id} e={e} compact />)}
                  {!isMe && activeSession && boardSessionId===sid && <button onClick={ev=>{ev.stopPropagation();setChallengeTarget(player.username)}} style={s.btn('var(--border)','var(--accent)',{width:'100%',marginTop:'0.5rem',fontSize:'0.95rem',padding:'0.5rem'})}>⚔️ Sfida {player.username}</button>}
                </div>}
              </div>
            })}
          </div>
        )}
        {curTab==='photos' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {activeSession && (
              <div style={s.card()}>
                <h3 style={s.h3()}>AGGIUNGI FOTO</h3>
                <label style={{ cursor:'pointer', display:'block', textAlign:'center', background:'var(--border)', border:'2px dashed var(--muted)', borderRadius:'12px', padding:'1.5rem', color:'var(--muted)', fontSize:'0.9rem' }}>
                  {uploading ? '📤 Caricamento...' : isHw ? '📸 Immortala i costumi più mostruosi!' : "📸 Tocca per aggiungere foto all'evento"}
                  <input type='file' accept='image/*' style={{ display:'none' }} onChange={async e => {
                    const file = e.target.files[0]; if (!file) return
                    e.target.value = ''
                    setUploading(true)
                    const data = await compressAndUpload(file, 'session', activeSession.id)
                    if (data.error) pushToast('⚠️ Errore caricamento: ' + data.error)
                    const d = await fetch('/api/photos?sessionId='+activeSession.id).then(r=>r.json())
                    setSessionPhotos(d.photos||[])
                    setUploading(false)
                  }} />
                </label>
              </div>
            )}
            <h3 style={s.h3('var(--muted)',{marginBottom:0})}>FOTO EVENTO</h3>
            {sessionPhotos.length === 0 && <p style={{ color:'var(--muted)', textAlign:'center', padding:'2rem' }}>Nessuna foto ancora</p>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
              {sessionPhotos.map(photo => (
                <div key={photo.url} style={{ position:'relative', borderRadius:'8px', overflow:'hidden', aspectRatio:'1' }}>
                  <img src={photo.url} alt={'Foto di '+photo.username} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.6)', padding:'0.25rem 0.5rem', fontSize:'0.65rem', color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span>{photo.username}</span>
                    <span style={{ display:'flex', gap:'0.2rem' }}>
                      {(isHw ? ['🎃','👻','😱'] : ['❤️','🔥','😂']).map(em => {
                        const count = Object.values(photo.reactions||{}).filter(r=>r===em).length
                        const mine = (photo.reactions||{})[me]===em
                        return <button key={em} onClick={()=>reactPhoto(photo,em)} style={{ background:mine?'var(--accent)':'transparent', border:'none', borderRadius:'6px', padding:'0 0.25rem', fontSize:'0.7rem', cursor:'pointer', color:'#fff' }}>{em}{count>0?count:''}</button>
                      })}
                    </span>
                  </div>
                  {(photo.username === me) && (
                    <button onClick={async () => {
                      await api('/api/photos', 'DELETE', { url: photo.url, sessionId: activeSession?.id })
                      const d = await fetch('/api/photos?sessionId='+activeSession?.id).then(r=>r.json())
                      setSessionPhotos(d.photos||[])
                    }} style={{ position:'absolute', top:'0.25rem', right:'0.25rem', background:'rgba(0,0,0,0.7)', border:'none', borderRadius:'50%', width:24, height:24, color:'var(--danger)', cursor:'pointer', fontSize:'0.75rem' }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {curTab==='stats' && (()=>{
          const drinksOnly = myLog.filter(isAlcoholic)
          const totalPts = sumPoints(myLog)
          const bySession = {}
          myLog.forEach(e=>{ bySession[e.sessionId]=bySession[e.sessionId]||{pts:0,n:0}; bySession[e.sessionId].pts+=e.points; if (isAlcoholic(e)) bySession[e.sessionId].n++ })
          const best = Object.entries(bySession).sort((a,b)=>b[1].pts-a[1].pts)[0]
          const bestName = best ? (sessions.find(ss=>ss.id===parseInt(best[0]))?.name || '?') : null
          const maxNight = maxPerSession(myLog)
          const counts = {}
          drinksOnly.forEach(e=>{counts[e.name]=(counts[e.name]||0)+1})
          const favDrink = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]
          const bands = {}
          drinksOnly.forEach(e=>{const h=new Date(e.timestamp).getHours();const b=h<6?'Notte fonda (0-6)':h<18?'Giorno (6-18)':h<21?'Aperitivo (18-21)':'Sera (21-24)';bands[b]=(bands[b]||0)+1})
          const favBand = Object.entries(bands).sort((a,b)=>b[1]-a[1])[0]
          const sessOpts = sessions.filter(ss=>drinksOnly.some(e=>e.sessionId===ss.id))
          const graphSess = selectedSession && sessOpts.some(ss=>ss.id===selectedSession) ? selectedSession : sessOpts[sessOpts.length-1]?.id
          const gLog = drinksOnly.filter(e=>e.sessionId===graphSess)
          let pts = []
          if (bacInfo && gLog.length) {
            const start = Math.min(...gLog.map(e=>e.timestamp))
            const end = Math.min(Date.now(), Math.max(...gLog.map(e=>e.timestamp))+3*3600000)
            for (let i=0;i<=40;i++) pts.push(calcBAC(gLog, bacInfo, start+(end-start)*i/40))
          }
          const maxB = Math.max(0.05, ...pts)
          const poly = pts.map((b,i)=>`${(i/40)*300},${75-(b/maxB)*68}`).join(' ')
          const shown = ACHIEVEMENTS.filter(a => !a.hw || isHw || a.check(myLog, allTimeRank))
          const unlocked = shown.filter(a=>a.check(myLog,allTimeRank)).map(a=>a.id)
          return <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div style={s.card(true)}>
              <h3 style={s.h3()}>🏅 RECORD PERSONALI</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                <div style={s.tile}><div style={{fontFamily:'Bebas Neue',fontSize:'2rem',color:'var(--accent)'}}>{totalPts}</div><div style={{color:'var(--muted)',fontSize:'0.7rem'}}>punti di sempre</div></div>
                <div style={s.tile}><div style={{fontFamily:'Bebas Neue',fontSize:'2rem',color:'var(--text)'}}>{drinksOnly.length}</div><div style={{color:'var(--muted)',fontSize:'0.7rem'}}>drink totali</div></div>
                <div style={s.tile}><div style={{fontFamily:'Bebas Neue',fontSize:'2rem',color:'var(--text)'}}>{maxNight||0}</div><div style={{color:'var(--muted)',fontSize:'0.7rem'}}>max drink in un evento</div></div>
                <div style={s.tile}><div style={{fontFamily:'Bebas Neue',fontSize:'1.1rem',color:'var(--ok)'}}>{bestName||'-'}</div><div style={{color:'var(--muted)',fontSize:'0.7rem'}}>miglior evento {best?'('+best[1].pts+'pt)':''}</div></div>
              </div>
            </div>
            <div style={s.card()}>
              <h3 style={s.h3('var(--muted)')}>🍹 LE TUE ABITUDINI</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--muted)',fontSize:'0.85rem'}}>Drink preferito</span><span style={{color:'var(--text)',fontSize:'0.85rem'}}>{favDrink?favDrink[0]+' ('+favDrink[1]+'x)':'-'}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--muted)',fontSize:'0.85rem'}}>Fascia oraria top</span><span style={{color:'var(--text)',fontSize:'0.85rem'}}>{favBand?favBand[0]:'-'}</span></div>
              </div>
            </div>
            <div style={s.card()}>
              <h3 style={s.h3('var(--muted)',{marginBottom:'0.5rem'})}>📈 BAC EVENTO</h3>
              {sessOpts.length===0 ? <p style={{color:'var(--faint)',fontSize:'0.8rem'}}>Nessun evento con drink</p> : <>
                <select value={graphSess||''} onChange={e=>setSelectedSession(parseInt(e.target.value))} style={{...s.input,appearance:'none',marginBottom:'0.75rem'}}>
                  {sessOpts.map(ss=><option key={ss.id} value={ss.id}>{ss.name}</option>)}
                </select>
                {!bacInfo ? <p style={{color:'var(--faint)',fontSize:'0.8rem'}}>Imposta i dati BAC nel profilo per vedere il grafico</p> :
                  <svg viewBox="0 0 300 80" style={{width:'100%',height:'auto'}}>
                    <line x1="0" y1="75" x2="300" y2="75" stroke="var(--border)" strokeWidth="1" />
                    {maxB>=0.05 && <line x1="0" y1={75-(0.05/maxB)*68} x2="300" y2={75-(0.05/maxB)*68} stroke="var(--danger)" strokeOpacity="0.27" strokeWidth="1" strokeDasharray="4 3" />}
                    <polyline points={poly} fill="none" stroke="var(--accent)" strokeWidth="2" />
                    <text x="2" y={Math.max(10,75-(0.05/maxB)*68-3)} fill="var(--danger)" fillOpacity="0.55" fontSize="7">0.05 limite guida</text>
                  </svg>}
              </>}
            </div>
            <div style={s.card()}>
              <h3 style={s.h3('var(--muted)')}>🏆 ACHIEVEMENT ({unlocked.length}/{shown.length})</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                {shown.map(a=>{
                  const ok = unlocked.includes(a.id)
                  return <div key={a.id} style={{background:'var(--bg)',borderRadius:'8px',padding:'0.6rem',opacity:ok?1:0.3,border:ok?'1px solid color-mix(in srgb, var(--accent-dim) 33%, transparent)':'1px solid transparent'}}>
                    <div style={{fontSize:'1.4rem'}}>{a.emoji}</div>
                    <div style={{color:ok?'var(--accent)':'var(--muted)',fontSize:'0.8rem',fontWeight:600}}>{a.name}</div>
                    <div style={{color:'var(--faint)',fontSize:'0.65rem'}}>{a.desc}</div>
                  </div>
                })}
              </div>
            </div>
          </div>
        })()}
        {curTab==='profile' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={s.card()}>
              <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
                <div style={{ width:80, height:80, borderRadius:'50%', margin:'0 auto 0.75rem', overflow:'hidden', border:'2px solid var(--accent)' }}>
                  <Avatar url={avatar} name={me} size={76} />
                </div>
                <div style={{ fontFamily:'Bebas Neue', fontSize:'1.6rem', marginBottom:'0.5rem' }}>{me}</div>
                <label style={{ cursor:'pointer', color:'var(--accent)', fontSize:'0.85rem', background:'var(--border)', padding:'0.4rem 1rem', borderRadius:'8px' }}>
                  {uploading ? 'Caricamento...' : 'Cambia foto'}
                  <input type='file' accept='image/*' style={{ display:'none' }} onChange={async e => {
                    const file = e.target.files[0]; if (!file) return
                    e.target.value = ''
                    setUploading(true)
                    const data = await compressAndUpload(file, 'avatar')
                    if (data.url) setAvatar(data.url)
                    else if (data.error) pushToast('⚠️ Errore caricamento: ' + data.error)
                    setUploading(false)
                  }} />
                </label>
              </div>
              <h2 style={{ fontFamily:'Bebas Neue', fontSize:'1.5rem', color:'var(--accent)', marginBottom:'1rem' }}>DATI BAC</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  {[['M','Maschio'],['F','Femmina']].map(([v,l]) => (
                    <button key={v} onClick={()=>setBacForm(f=>({...f,sex:v}))} style={s.btn(bacForm.sex===v?'var(--accent)':'var(--border)',bacForm.sex===v?'var(--accent-ink)':'var(--muted)',{flex:1,fontSize:'0.9rem'})}>{l}</button>
                  ))}
                </div>
                <div><label style={s.label}>Peso (kg)</label><input style={s.input} type="number" inputMode="decimal" value={bacForm.weight} placeholder="es. 75" onChange={e=>setBacForm(f=>({...f,weight:e.target.value}))} /></div>
                <div><label style={s.label}>Altezza (cm)</label><input style={s.input} type="number" inputMode="numeric" value={bacForm.height} placeholder="es. 178" onChange={e=>setBacForm(f=>({...f,height:e.target.value}))} /></div>
                <div><label style={s.label}>Età</label><input style={s.input} type="number" inputMode="numeric" value={bacForm.age} placeholder="es. 25" onChange={e=>setBacForm(f=>({...f,age:e.target.value}))} /></div>
                {bacError && <p style={{ color:'var(--danger)', fontSize:'0.8rem', margin:'0' }}>{bacError}</p>}
                <button onClick={saveBac} style={s.btn('var(--accent)','var(--accent-ink)',{width:'100%',padding:'0.8rem',fontSize:'1.2rem'})}>{bacSaved?'Salvato!':'Salva dati BAC'}</button>
              </div>
            </div>
            <p style={{ color:'var(--faint)', fontSize:'0.7rem', textAlign:'center' }}>Modello Widmark. Non guidare.</p>
          </div>
        )}
      </div>
    </main>
  </>
  )
}
