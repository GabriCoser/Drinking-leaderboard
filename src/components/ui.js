'use client'

// Stili e helper condivisi fra vista giocatore, admin e TV. I colori sono variabili CSS del tema (globals.css).
export const s = {
  btn: (bg, color = '#fff', extra = {}) => ({ background: bg, color, border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.05em', ...extra }),
  input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem 1rem', color: 'var(--text)', fontSize: '1rem', outline: 'none' },
  card: (gold = false, extra = {}) => ({ background: gold ? 'linear-gradient(135deg, var(--hl-a), var(--hl-b))' : 'var(--surface)', border: `1px solid ${gold ? 'var(--accent-dim)' : 'var(--border)'}`, borderRadius: '14px', padding: '1rem 1.25rem', ...extra }),
  label: { color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' },
  h3: (color = 'var(--accent)', extra = {}) => ({ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color, marginBottom: '0.75rem', ...extra }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal: (border = 'var(--accent)') => ({ background: 'var(--surface)', border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', maxWidth: 340, width: '100%', textAlign: 'center' }),
  tile: { background: 'var(--bg)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' },
}
export async function api(url, method = 'GET', body) {
  const res = await fetch(url, body === undefined ? { method } : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}
export function calcBAC(log, info, now = Date.now()) {
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
export function bacStatus(b) {
  if (b < 0.02) return { label: 'Sobrio', color: '#3ce08a' }
  if (b < 0.05) return { label: 'Leggero', color: '#F5C518' }
  if (b < 0.08) return { label: 'Moderato', color: '#ff9500' }
  if (b < 0.15) return { label: 'Alterato', color: '#e03c3c' }
  return { label: 'Molto alterato', color: '#9b0000' }
}
export async function compressAndUpload(file, type, sessionId = null) {
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
export function fmtTime(ts) { return new Date(ts).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) }
export function fmtDate(ts) { return new Date(ts).toLocaleDateString('it-IT',{day:'2-digit',month:'short'}) }
export function fmtAgo(ts, now = Date.now()) { const m = Math.floor((now-ts)/60000); return m<1?'adesso':m<60?m+' min fa':Math.floor(m/60)+'h fa' }
// punti delle voci bonus col segno (+2 / -2)
export function fmtBonus(p) { return (p > 0 ? '+' : '') + p }
const AVATAR_COLORS = ['#e03c3c','#3ce08a','#4a9eff','#ff9500','#b84aff','#F5C518']
function avColor(name) { let h=0; for (const c of name) h=(h*31+c.charCodeAt(0))>>>0; return AVATAR_COLORS[h%AVATAR_COLORS.length] }
export function Avatar({ url, name, size=36 }) {
  if (url) return <span style={{width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,display:'block'}}><img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /></span>
  return <span style={{width:size,height:size,borderRadius:'50%',background:avColor(name)+'33',color:avColor(name),display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Bebas Neue',fontSize:size*0.45,flexShrink:0}}>{name[0].toUpperCase()}</span>
}
export function Confirm({ message, onConfirm, onCancel, danger = true }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal(danger ? 'var(--danger)' : 'var(--accent)')}>
        <p style={{color:'var(--text)',marginBottom:'1.5rem',fontSize:'1rem',lineHeight:1.4}}>{message}</p>
        <div style={{display:'flex',gap:'0.75rem'}}>
          <button onClick={onCancel} style={s.btn('var(--border)','var(--muted)',{flex:1,padding:'0.8rem',fontSize:'1.2rem'})}>Annulla</button>
          <button onClick={onConfirm} style={s.btn(danger?'var(--danger)':'var(--accent)',danger?'#fff':'var(--accent-ink)',{flex:1,padding:'0.8rem',fontSize:'1.2rem'})}>Conferma</button>
        </div>
      </div>
    </div>
  )
}
