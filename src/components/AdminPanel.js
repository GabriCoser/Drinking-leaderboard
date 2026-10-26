'use client'

import { useState, useEffect, useCallback } from 'react'
import { CATEGORIES, pointsFor } from '@/lib/drinks'
import { THEMES, themeOf, seasonalTheme } from '@/lib/theme'
import { countDrinks, inSession, standingsFor, costumeWinner } from '@/lib/score'
import { useApplyTheme, HalloweenFX } from '@/components/Theme'
import { s, api, fmtTime, fmtDate, Avatar, Confirm } from '@/components/ui'

export default function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState('sessions')
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [newEvent, setNewEvent] = useState({ name: '', autoClose: '', theme: seasonalTheme(), wipe: false })
  const [exportSession, setExportSession] = useState('')
  const [board, setBoard] = useState([])
  const [costumes, setCostumes] = useState({})
  const [players, setPlayers] = useState([])
  const [drinks, setDrinks] = useState([])
  const [newDrink, setNewDrink] = useState({ name:'', desc:'', emoji:'🍹', ml:'', abv:'', category:'cocktail' })
  const [msg, setMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [loadingAdmin, setLoadingAdmin] = useState(false)
  const theme = themeOf(activeSession)
  useApplyTheme(theme)
  const showMsg = useCallback(m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }, [])
  const load = useCallback(async () => {
    try {
      const ok = r => { if (r.status === 401) throw Object.assign(new Error(), { auth: true }); if (!r.ok) throw new Error(); return r.json() }
      const [sr, pr, dr, br] = await Promise.all([
        fetch('/api/sessions').then(ok),
        fetch('/api/admin').then(ok),
        fetch('/api/drinks').then(ok),
        fetch('/api/players').then(ok),
      ])
      setSessions(sr.sessions||[]); setActiveSession(sr.active)
      setPlayers(pr.users||[]); setDrinks(dr.drinks||[])
      setBoard(br.players||[]); setCostumes(br.costumes||{})
    } catch (e) { if (e.auth) return onLogout(); showMsg('Errore nel caricamento dati') }
  }, [onLogout, showMsg])
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i) }, [load])
  async function run(fn) { setLoadingAdmin(true); try { await fn() } finally { setLoadingAdmin(false); load() } }
  function createEvent() {
    if (!newEvent.name.trim()) return showMsg("Dai un nome all'evento")
    let autoCloseAt = null
    if (newEvent.autoClose) {
      const [h, m] = newEvent.autoClose.split(':').map(Number)
      const d = new Date(); d.setHours(h, m, 0, 0)
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
      autoCloseAt = d.getTime()
    }
    const go = () => run(async () => {
      const { ok, data } = await api('/api/sessions', 'POST', { name: newEvent.name, autoCloseAt, theme: newEvent.theme, wipe: newEvent.wipe })
      if (!ok) return showMsg(data.error || 'Errore')
      setNewEvent(e => ({ ...e, name: '', autoClose: '', wipe: false })); showMsg(`Evento "${data.session.name}" avviato! Classifica azzerata 🚀`)
    })
    const parts = []
    if (activeSession) parts.push(`L'evento "${activeSession.name}" verrà chiuso (i giocatori vedranno il podio finale).`)
    if (newEvent.wipe) parts.push('⚠️ Verranno CANCELLATI per sempre tutti gli eventi passati, i drink, le sfide e la classifica di sempre.')
    if (parts.length) setConfirmAction({ message: parts.join(' ') + ' Continuare?', onConfirm: go })
    else go()
  }
  function deleteSession(id) {
    setConfirmAction({ message: "Eliminare l'evento e tutti i suoi drink?", onConfirm: () => run(async () => {
      await api('/api/sessions', 'DELETE', { sessionId: id, action: 'delete' }); showMsg('Evento eliminato')
    })})
  }
  function closeSession(id) {
    setConfirmAction({ message: "Chiudere l'evento? Comparirà il podio finale.", onConfirm: () => run(async () => {
      await api('/api/sessions', 'DELETE', { sessionId: id }); showMsg('Evento chiuso')
    })})
  }
  function addDrink() {
    if (!newDrink.name || !newDrink.ml || newDrink.abv === '') return showMsg('Compila nome, ml e gradazione')
    run(async () => {
      const { ok, data } = await api('/api/drinks', 'POST', newDrink)
      if (!ok) return showMsg(data.error || 'Errore')
      setNewDrink(d => ({ ...d, name:'', desc:'', ml:'', abv:'' })); showMsg(`${data.drink.name} aggiunto (${data.drink.points} punti)`)
    })
  }
  function removeDrink(drink) {
    setConfirmAction({ message: `Eliminare "${drink.name}" dal catalogo?`, onConfirm: () => run(async () => { await api('/api/drinks', 'DELETE', { drinkId: drink.id }) }) })
  }
  function removeUser(username) {
    setConfirmAction({ message: `Eliminare ${username}? Potrà comunque rientrare col suo nome, ma partirà da zero.`, onConfirm: () => run(async () => { await api('/api/admin', 'DELETE', { username }) }) })
  }
  async function logout() { await fetch('/api/auth/logout',{method:'POST'}); onLogout() }
  const previewPts = pointsFor(newDrink.ml, newDrink.abv)
  const eventBoard = activeSession ? standingsFor(board, activeSession, activeSession.id) : []
  const catLabel = Object.fromEntries(CATEGORIES)
  return (
    <>
    {theme === 'halloween' && <HalloweenFX />}
    {confirmAction && <Confirm message={confirmAction.message} onCancel={()=>setConfirmAction(null)} onConfirm={()=>{ confirmAction.onConfirm(); setConfirmAction(null) }} />}
    <main className="hw-content" style={{ maxWidth:500, margin:'0 auto', padding:'2rem 1rem 5rem' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div><h1 style={{ fontSize:'2.5rem', color:'var(--accent)', lineHeight:1 }}>{THEMES[theme].logo} ADMIN</h1>{activeSession&&<span style={{ color:'var(--ok)', fontSize:'0.8rem' }}>● {activeSession.name}</span>}</div>
        <button onClick={logout} style={s.btn('var(--border)','var(--muted)',{fontSize:'0.85rem',padding:'0.4rem 0.8rem'})}>Esci</button>
      </div>
      <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.5rem', overflowX:'auto' }}>
        {[['sessions','📅 Eventi'],['players','👥'],['drinks_mgmt','🍹'],['stats','📊']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={s.btn(tab===k?'var(--accent)':'var(--surface)',tab===k?'var(--accent-ink)':'var(--muted)',{flex:k==='sessions'?2:1,fontSize:'1.2rem',border:'1px solid var(--border)',minWidth:50})}>{l}</button>
        ))}
      </div>
      {msg&&<div style={{ background:'color-mix(in srgb, var(--ok) 8%, var(--bg))', border:'1px solid var(--ok)', borderRadius:'8px', padding:'0.5rem 1rem', marginBottom:'1rem', color:'var(--ok)', fontSize:'0.85rem' }}>{msg}</div>}
      {tab==='sessions'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div style={s.card(true)}><h3 style={s.h3('var(--accent)',{marginBottom:'0.5rem'})}>🚀 NUOVO EVENTO</h3>
            <p style={{ color:'var(--muted)', fontSize:'0.8rem', marginBottom:'0.75rem', lineHeight:1.4 }}>Si riparte da zero: punti, posizioni e classifica della home tornano a 0. L&apos;evento in corso viene chiuso e chi entra col proprio nome viene iscritto in automatico.</p>
            <label style={s.label}>Nome evento</label>
            <input style={{ ...s.input, marginBottom:'0.75rem' }} value={newEvent.name} placeholder={newEvent.theme==='halloween'?'es. Halloween 2026 🎃':'es. Venerdì 6 Giugno'} onChange={e=>setNewEvent(v=>({...v,name:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&createEvent()} />
            <label style={s.label}>Tema</label>
            <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.75rem' }}>
              {Object.entries(THEMES).map(([k,t]) => (
                <button key={k} onClick={()=>setNewEvent(v=>({...v,theme:k}))} style={s.btn(newEvent.theme===k?'var(--accent)':'var(--surface2)',newEvent.theme===k?'var(--accent-ink)':'var(--muted)',{flex:1,fontSize:'1rem',border:'1px solid var(--border)'})}>{t.label}</button>
              ))}
            </div>
            {newEvent.theme==='halloween' && <p style={{ color:'var(--muted)', fontSize:'0.75rem', marginBottom:'0.75rem', lineHeight:1.4 }}>🎃 Attiva: tema spettrale, pozioni di Halloween nel menu, Dolcetto o Scherzetto e voto del miglior costume.</p>}
            <label style={s.label}>Chiusura automatica (opzionale)</label>
            <input style={{ ...s.input, marginBottom:'0.75rem' }} type="time" value={newEvent.autoClose} onChange={e=>setNewEvent(v=>({...v,autoClose:e.target.value}))} />
            <label style={{ display:'flex', gap:'0.6rem', alignItems:'flex-start', cursor:'pointer', marginBottom:'0.9rem', color:'var(--muted)', fontSize:'0.8rem', lineHeight:1.4 }}>
              <input type="checkbox" checked={newEvent.wipe} onChange={e=>setNewEvent(v=>({...v,wipe:e.target.checked}))} style={{ marginTop:'0.15rem', accentColor:'var(--danger)' }} />
              <span>🧹 Azzera anche lo storico: cancella eventi passati, drink, sfide e classifica di sempre (i giocatori restano)</span>
            </label>
            <button onClick={createEvent} disabled={loadingAdmin} style={s.btn('var(--accent)','var(--accent-ink)',{width:'100%',padding:'0.8rem',fontSize:'1.3rem',opacity:loadingAdmin?0.5:1})}>Avvia evento</button>
          </div>
          <h3 style={s.h3('var(--muted)',{marginBottom:0})}>EVENTI</h3>
          {sessions.length===0 && <p style={{ color:'var(--faint)', textAlign:'center', padding:'1rem' }}>Nessun evento ancora</p>}
          {[...sessions].reverse().map(sess=>(
            <div key={sess.id} style={s.card(sess.active)}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.5rem' }}>
                <div><div style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem', color:sess.active?'var(--accent)':'var(--text)' }}>{THEMES[themeOf(sess)].logo} {sess.name}</div>
                <div style={{ color:'var(--muted)', fontSize:'0.75rem' }}>Aperto: {fmtDate(sess.createdAt)} {fmtTime(sess.createdAt)}{sess.closedAt ? ' · Chiuso: '+fmtDate(sess.closedAt)+' '+fmtTime(sess.closedAt) : ''}{sess.active && sess.autoCloseAt ? ' · ⏰ auto-chiusura '+fmtTime(sess.autoCloseAt) : ''}{sess.participants ? ' · 🙋 '+sess.participants.length : ''}</div><div style={{marginTop:'0.25rem'}}><span style={{background:sess.active?'color-mix(in srgb, var(--ok) 13%, transparent)':'var(--border)',color:sess.active?'var(--ok)':'var(--muted)',fontSize:'0.7rem',padding:'0.15rem 0.5rem',borderRadius:'4px'}}>{sess.active?'● In corso':'✕ Concluso'}</span></div></div>
                {sess.active?<button onClick={()=>closeSession(sess.id)} disabled={loadingAdmin} style={s.btn('var(--border)','var(--danger)',{fontSize:'0.8rem',opacity:loadingAdmin?0.5:1})}>Chiudi</button>:<button onClick={()=>deleteSession(sess.id)} disabled={loadingAdmin} style={s.btn('var(--border)','var(--danger)',{fontSize:'0.8rem',opacity:loadingAdmin?0.3:0.6})}>Elimina</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==='players'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          <p style={{ color:'var(--muted)', fontSize:'0.8rem' }}>I giocatori si creano da soli entrando col proprio nome. {activeSession ? 'Punti e drink si riferiscono all\'evento in corso.' : ''}</p>
          {players.length===0 && <p style={{ color:'var(--faint)', textAlign:'center', padding:'1rem' }}>Nessun giocatore</p>}
          {players.map(player=>{
            const st = eventBoard.find(p=>p.username===player.username)
            const avatar = board.find(p=>p.username===player.username)?.avatar
            return <div key={player.username} style={s.card()}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <Avatar url={avatar} name={player.username} size={32} />
                <div style={{ flex:1 }}><div style={{ fontFamily:'Bebas Neue', fontSize:'1.2rem' }}>{player.username}</div>
                  <div style={{ color:'var(--muted)', fontSize:'0.7rem' }}>{activeSession ? (st ? `🙋 in gara · ${st.pts} pt · ${st.dks} drink` : 'non partecipa') : 'dal '+fmtDate(player.createdAt)}</div></div>
                <button onClick={()=>removeUser(player.username)} disabled={loadingAdmin} style={s.btn('var(--border)','var(--danger)',{padding:'0.3rem 0.6rem',fontSize:'0.8rem',opacity:loadingAdmin?0.5:1})}>X</button>
              </div>
            </div>
          })}
        </div>
      )}
      {tab==='drinks_mgmt'&&(
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          <div style={s.card()}><h3 style={s.h3()}>AGGIUNGI DRINK</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <input style={{ ...s.input, width:'60px', textAlign:'center' }} value={newDrink.emoji} placeholder="🍹" onChange={e=>setNewDrink(d=>({...d,emoji:e.target.value}))} />
                <input style={{ ...s.input, flex:1 }} value={newDrink.name} placeholder="Nome drink" onChange={e=>setNewDrink(d=>({...d,name:e.target.value}))} />
              </div>
              <input style={s.input} value={newDrink.desc} maxLength={80} placeholder="Cos'è (opzionale): es. gin, Campari e vermouth" onChange={e=>setNewDrink(d=>({...d,desc:e.target.value}))} />
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <input style={{ ...s.input, flex:1 }} type="number" inputMode="numeric" value={newDrink.ml} placeholder="ml" onChange={e=>setNewDrink(d=>({...d,ml:e.target.value}))} />
                <input style={{ ...s.input, flex:1 }} type="number" inputMode="decimal" value={newDrink.abv} placeholder="% alcol (0 = analcolico)" onChange={e=>setNewDrink(d=>({...d,abv:e.target.value}))} />
              </div>
              <select value={newDrink.category} onChange={e=>setNewDrink(d=>({...d,category:e.target.value}))} style={{ ...s.input, appearance:'none' }}>
                {CATEGORIES.map(([k,l])=><option key={k} value={k}>{l}</option>)}
              </select>
              <div style={{ color:'var(--muted)', fontSize:'0.8rem', textAlign:'center' }}>Punti calcolati: <b style={{ color:'var(--accent)', fontFamily:'Bebas Neue', fontSize:'1.2rem' }}>{previewPts}</b> <span style={{ color:'var(--faint)' }}>(1 punto ogni 4 g di alcol)</span></div>
              <button onClick={addDrink} disabled={loadingAdmin} style={s.btn('var(--accent)','var(--accent-ink)',{width:'100%',padding:'0.7rem',opacity:loadingAdmin?0.5:1})}>Aggiungi</button>
            </div>
          </div>
          {CATEGORIES.map(([key]) => {
            const list = drinks.filter(d=>(d.category||'altro')===key)
            if (!list.length) return null
            return <div key={key} style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              <h3 style={s.h3('var(--muted)',{marginBottom:0,marginTop:'0.5rem'})}>{catLabel[key]} ({list.length})</h3>
              {list.map(drink=>(
                <div key={drink.id} style={{ ...s.card(), display:'flex', alignItems:'center', gap:'1rem', padding:'0.6rem 1rem' }}>
                  <span style={{ fontSize:'1.5rem' }}>{drink.emoji}</span>
                  <div style={{ flex:1 }}><div style={{ fontFamily:'Bebas Neue', fontSize:'1.1rem' }}>{drink.name}{String(drink.id).startsWith('custom_')&&<span style={{ color:'var(--faint)', fontSize:'0.7rem' }}> · custom</span>}</div>{drink.desc && <div style={{ color:'var(--text)', opacity:0.75, fontSize:'0.78rem', lineHeight:1.3, margin:'0.1rem 0' }}>{drink.desc}</div>}<div style={{ color:'var(--muted)', fontSize:'0.75rem' }}>{drink.ml}ml / {drink.abv}% / {drink.points}pt</div></div>
                  <button onClick={()=>removeDrink(drink)} disabled={loadingAdmin} style={s.btn('var(--border)','var(--danger)',{padding:'0.3rem 0.6rem',fontSize:'0.8rem',opacity:loadingAdmin?0.5:1})}>X</button>
                </div>
              ))}
            </div>
          })}
        </div>
      )}
      {tab==='stats'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={s.card()}>
            <h3 style={s.h3('var(--muted)',{fontSize:'1.2rem'})}>🛠 STRUMENTI</h3>
            <label style={s.label}>Modalità spettatore (per TV, senza login)</label>
            <button onClick={()=>{navigator.clipboard?.writeText(window.location.origin+'/tv').then(()=>showMsg('Link copiato!'))}} style={s.btn('var(--border)','var(--accent)',{width:'100%',marginBottom:'0.75rem',fontSize:'0.9rem'})}>📺 Copia link /tv</button>
            <label style={s.label}>Esporta evento</label>
            <select value={exportSession} onChange={e=>setExportSession(e.target.value)} style={{...s.input,appearance:'none',marginBottom:'0.5rem'}}>
              <option value="">Scegli evento...</option>
              {[...sessions].reverse().map(ss=><option key={ss.id} value={ss.id}>{ss.name}{ss.active?' (in corso)':''}</option>)}
            </select>
            {exportSession && <div style={{display:'flex',gap:'0.5rem'}}>
              <a href={'/api/export?sessionId='+exportSession+'&format=csv'} style={{...s.btn('var(--accent)','var(--accent-ink)',{flex:1,fontSize:'0.9rem',textAlign:'center',textDecoration:'none',display:'block',padding:'0.5rem'})}}>⬇ CSV</a>
              <a href={'/api/export?sessionId='+exportSession+'&format=json'} style={{...s.btn('var(--border)','var(--accent)',{flex:1,fontSize:'0.9rem',textAlign:'center',textDecoration:'none',display:'block',padding:'0.5rem'})}}>⬇ JSON</a>
            </div>}
          </div>
          {activeSession ? (() => {
            const sessionLog = board.flatMap(p=>inSession(p.sessionLog||[], activeSession.id))
            const totalDrinks = countDrinks(sessionLog)
            const activePlayers = eventBoard.filter(p=>p.dks>0)
            const avg = activePlayers.length ? (totalDrinks/activePlayers.length).toFixed(1) : 0
            const drinkCount = {}
            sessionLog.filter(e=>e.abv>0 && e.kind!=='bonus').forEach(e=>{drinkCount[e.name]=(drinkCount[e.name]||0)+1})
            const topDrink = Object.entries(drinkCount).sort((a,b)=>b[1]-a[1])[0]
            const topPlayer = [...eventBoard].sort((a,b)=>b.dks-a.dks)[0]
            const costume = costumeWinner(costumes, activeSession.id)
            return <>
              <div style={s.card(true)}>
                <h3 style={s.h3('var(--accent)',{marginBottom:'1rem'})}>📊 {activeSession.name}</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  <div style={s.tile}><div style={{fontFamily:'Bebas Neue',fontSize:'2.5rem',color:'var(--accent)'}}>{totalDrinks}</div><div style={{color:'var(--muted)',fontSize:'0.75rem'}}>Drink totali</div></div>
                  <div style={s.tile}><div style={{fontFamily:'Bebas Neue',fontSize:'2.5rem',color:'var(--text)'}}>{avg}</div><div style={{color:'var(--muted)',fontSize:'0.75rem'}}>Media a testa</div></div>
                  <div style={s.tile}><div style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:'var(--ok)'}}>{topDrink?topDrink[0]:'-'}</div><div style={{color:'var(--muted)',fontSize:'0.75rem'}}>Drink più bevuto {topDrink?'('+topDrink[1]+'x)':''}</div></div>
                  <div style={s.tile}><div style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:'var(--ok)'}}>{topPlayer?.dks?topPlayer.username:'-'}</div><div style={{color:'var(--muted)',fontSize:'0.75rem'}}>Più attivo {topPlayer?.dks?'('+topPlayer.dks+' drink)':''}</div></div>
                  {theme==='halloween' && <div style={{...s.tile,gridColumn:'1 / -1'}}><div style={{fontFamily:'Bebas Neue',fontSize:'1.3rem',color:'var(--accent)'}}>{costume?`🧟 ${costume.username} (${costume.votes} voti)`:'-'}</div><div style={{color:'var(--muted)',fontSize:'0.75rem'}}>Miglior costume (per ora)</div></div>}
                </div>
              </div>
              <div style={s.card()}>
                <h3 style={s.h3('var(--muted)',{fontSize:'1.2rem'})}>CLASSIFICA EVENTO</h3>
                {eventBoard.length===0 && <p style={{color:'var(--faint)',fontSize:'0.85rem'}}>Nessun partecipante</p>}
                {eventBoard.map((p,i)=>(
                  <div key={p.username} style={{display:'flex',alignItems:'center',gap:'1rem',padding:'0.4rem 0',borderBottom:'1px solid var(--surface)'}}>
                    <span style={{fontFamily:'Bebas Neue',color:'var(--faint)',width:20}}>{i+1}</span>
                    <div style={{flex:1,fontFamily:'Bebas Neue',fontSize:'1.1rem'}}>{p.username}</div>
                    <span style={{color:'var(--muted)',fontSize:'0.8rem'}}>{p.dks} drink</span>
                    <span style={{fontFamily:'Bebas Neue',color:'var(--accent)',fontSize:'1.2rem'}}>{p.pts}pt</span>
                  </div>
                ))}
              </div>
            </>
          })() : <p style={{color:'var(--muted)',textAlign:'center',padding:'2rem'}}>Nessun evento attivo</p>}
        </div>
      )}
    </main>
    </>
  )
}
