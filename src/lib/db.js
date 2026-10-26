import Redis from 'ioredis'
import { DEFAULT_DRINKS, pointsFor } from './drinks.js'
import { sumPoints, countDrinks, inSession } from './score.js'

// ---------- storage ----------
// In produzione serve REDIS_URL. In sviluppo, senza REDIS_URL, si usa un archivio in memoria
// (si azzera al riavvio del server) così l'app si prova in locale senza Redis.
let _client = null
function getRedis() {
  if (!_client) {
    const isTLS = process.env.REDIS_URL.startsWith('rediss://')
    _client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 3, connectTimeout: 5000, ...(isTLS ? { tls: { rejectUnauthorized: false } } : {}) })
    _client.on('error', (err) => console.error('[Redis] connection error:', err.message))
  }
  return _client
}
const RELEASE_LUA = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end"
const redisKV = {
  get: k => getRedis().get(k),
  set: k_v => getRedis().set(...k_v),
  acquire: async (k, token, ttl) => (await getRedis().set(k, token, 'PX', ttl, 'NX')) === 'OK',
  release: async (k, token) => {
    try { await getRedis().eval(RELEASE_LUA, 1, k, token) }
    catch { if (await getRedis().get(k) === token) await getRedis().del(k) }
  },
}
function memoryKV() {
  const m = globalThis.__drinkboardMem || (globalThis.__drinkboardMem = new Map())
  const live = k => { const v = m.get(k); if (v && v.exp && v.exp < Date.now()) { m.delete(k); return undefined } return v }
  return {
    get: async k => live(k)?.val ?? null,
    set: async ([k, val]) => { m.set(k, { val }) },
    acquire: async (k, token, ttl) => { if (live(k)) return false; m.set(k, { val: token, exp: Date.now() + ttl }); return true },
    release: async (k, token) => { if (live(k)?.val === token) m.delete(k) },
  }
}
let _kv = null
function kv() {
  if (_kv) return _kv
  if (process.env.REDIS_URL) return (_kv = redisKV)
  if (process.env.NODE_ENV === 'production') throw new Error('REDIS_URL environment variable is not set')
  console.warn('[db] REDIS_URL non impostato: uso un archivio in memoria (solo sviluppo)')
  return (_kv = memoryKV())
}
async function read(key, fallback) { const d = await kv().get(key); return d ? JSON.parse(d) : fallback }
async function write(key, data) { await kv().set([key, JSON.stringify(data)]) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
// Read-modify-write atomico: un lock per chiave evita che due richieste contemporanee
// (es. due persone che aggiungono un drink nello stesso istante) si sovrascrivano a vicenda.
// fn riceve il valore attuale e restituisce quello nuovo da salvare.
async function mutate(key, fallback, fn) {
  const lockKey = 'lock:' + key
  const token = Math.random().toString(36).slice(2) + Date.now()
  const start = Date.now()
  while (!(await kv().acquire(lockKey, token, 5000))) {
    if (Date.now() - start > 8000) throw new Error('Database occupato, riprova')
    await sleep(20 + Math.random() * 40)
  }
  try {
    const next = await fn(await read(key, fallback))
    await write(key, next)
    return next
  } finally { await kv().release(lockKey, token) }
}
// id numerici univoci anche per inserimenti nello stesso millisecondo
export function uid() { return Date.now() * 1000 + Math.floor(Math.random() * 1000) }

// ---------- utenti ----------
export async function getUsers() { return read('users', {}) }
export async function getUser(username) { const u = await getUsers(); return u[username] || null }
// Accesso solo col nome: se il giocatore non esiste lo crea
export async function ensurePlayer(username) {
  let user
  await mutate('users', {}, users => {
    if (!users[username]) users[username] = { username, role: 'player', bac_info: null, createdAt: Date.now() }
    user = users[username]
    return users
  })
  return user
}
export async function createAdmin(hashedPassword) {
  let created = false
  await mutate('users', {}, users => {
    if (!users.admin) { users.admin = { username: 'admin', password: hashedPassword, role: 'admin', createdAt: Date.now() }; created = true }
    return users
  })
  return created
}
async function updateUser(username, fn) {
  let user = null
  await mutate('users', {}, users => { if (users[username]) { fn(users[username]); user = users[username] } return users })
  return user
}
export async function updateBacInfo(username, bacInfo) { return updateUser(username, u => { u.bac_info = bacInfo }) }
export async function updateUserAvatar(username, url) { return updateUser(username, u => { u.avatar = url }) }
export async function deleteUser(username) { await mutate('users', {}, u => { delete u[username]; return u }) }
export async function toggleFavorite(username, drinkId) {
  const u = await updateUser(username, u => {
    const f = u.favorites || []
    u.favorites = f.includes(drinkId) ? f.filter(d => d !== drinkId) : [...f, drinkId]
  })
  return u?.favorites || []
}
export async function getFavorites(username) { const u = await getUser(username); return u?.favorites || [] }

// ---------- eventi (sessions) ----------
export async function getSessions() { return read('sessions', []) }
export async function getActiveSession() {
  const active = (await getSessions()).find(x => x.active) || null
  if (active && active.autoCloseAt && Date.now() > active.autoCloseAt) {
    await mutate('sessions', [], sessions => {
      const s = sessions.find(x => x.id === active.id)
      if (s && s.active) { s.active = false; s.closedAt = s.autoCloseAt }
      return sessions
    })
    return null
  }
  return active
}
export async function createSession(name, autoCloseAt = null, theme = 'classic') {
  const session = { id: Date.now(), name, theme, active: true, createdAt: Date.now(), closedAt: null, autoCloseAt, participants: [] }
  await mutate('sessions', [], sessions => {
    sessions.forEach(s => { if (s.active) { s.active = false; s.closedAt = Date.now() } })
    sessions.push(session)
    return sessions
  })
  return session
}
export async function setSessionParticipation(sessionId, username, join) {
  let updated = null
  await mutate('sessions', [], sessions => {
    const s = sessions.find(x => x.id === sessionId && x.active)
    if (!s) return sessions
    s.participants = s.participants || []
    if (join && !s.participants.includes(username)) s.participants.push(username)
    if (!join) s.participants = s.participants.filter(u => u !== username)
    updated = s
    return sessions
  })
  return updated
}
export async function closeSession(sessionId) {
  await mutate('sessions', [], sessions => {
    const s = sessions.find(x => x.id === sessionId)
    if (s && s.active) { s.active = false; s.closedAt = Date.now() }
    return sessions
  })
}
export async function deleteSession(sessionId) {
  await mutate('sessions', [], sessions => sessions.filter(s => s.id !== sessionId))
  await mutate('drinklog', [], log => log.filter(e => e.sessionId !== sessionId))
  await mutate('challenges', [], all => all.filter(c => c.sessionId !== sessionId))
  await mutate('session_photos', {}, map => { delete map[sessionId]; return map })
  await mutate('halloween', {}, map => { delete map[sessionId]; return map })
}
// "Azzera storico": cancella eventi, drink, sfide, foto e stato Halloween. Restano giocatori e catalogo.
export async function wipeHistory() {
  await mutate('sessions', [], () => [])
  await mutate('drinklog', [], () => [])
  await mutate('challenges', [], () => [])
  await mutate('session_photos', {}, () => ({}))
  await mutate('halloween', {}, () => ({}))
}

// ---------- log drink ----------
export async function getDrinkLog() { return read('drinklog', []) }
export async function addDrinkEntry(username, drink, sessionId, foodContext = null, note = null) {
  const entry = { id: uid(), username, sessionId, drinkId: drink.id, name: drink.name, emoji: drink.emoji, category: drink.category || 'altro', points: drink.points, ml: drink.ml, abv: drink.abv, foodContext, note, timestamp: Date.now() }
  await mutate('drinklog', [], log => { log.push(entry); return log })
  return entry
}
// Voci bonus (Halloween): contano nei punti, non come drink, e non si possono cancellare
export async function addBonusEntries(items) {
  const entries = items.map(it => ({ id: uid(), kind: 'bonus', username: it.username, sessionId: it.sessionId, bonusType: it.bonusType, name: it.name, emoji: it.emoji, points: it.points, ml: 0, abv: 0, timestamp: Date.now() }))
  await mutate('drinklog', [], log => { log.push(...entries); return log })
  return entries
}
export async function updateDrinkNote(entryId, username, note) {
  let entry = null
  await mutate('drinklog', [], log => {
    const e = log.find(x => x.id === entryId && x.username === username && x.kind !== 'bonus')
    if (e) { e.note = note; entry = e }
    return log
  })
  return entry
}
export async function removeDrinkEntry(entryId, username) {
  await mutate('drinklog', [], log => log.filter(e => !(e.id === entryId && e.username === username && e.kind !== 'bonus')))
}

// ---------- catalogo ----------
// Aumentare CATALOG_VERSION per ricaricare i drink di default (quelli custom dell'admin restano)
const CATALOG_VERSION = 4
export async function getDrinksCatalog() {
  const v = parseInt(await kv().get('drinks_catalog_version') || '0', 10)
  if (v >= CATALOG_VERSION) {
    const d = await read('drinks_catalog', null)
    if (d) return d
  }
  const merged = await mutate('drinks_catalog', [], existing => {
    // anche i drink custom vengono ricalcolati con la formula, così i punteggi restano bilanciati
    const custom = existing.filter(x => String(x.id).startsWith('custom_')).map(x => ({ ...x, points: pointsFor(x.ml, x.abv) }))
    return [...DEFAULT_DRINKS, ...custom]
  })
  await kv().set(['drinks_catalog_version', String(CATALOG_VERSION)])
  return merged
}
export async function addDrinkToCatalog(drink) {
  await getDrinksCatalog()
  const newDrink = { ...drink, id: 'custom_' + Date.now(), points: pointsFor(drink.ml, drink.abv) }
  await mutate('drinks_catalog', [], catalog => { catalog.push(newDrink); return catalog })
  return newDrink
}
export async function removeDrinkFromCatalog(drinkId) {
  await getDrinksCatalog()
  await mutate('drinks_catalog', [], catalog => catalog.filter(d => d.id !== drinkId))
}

// ---------- classifica ----------
export async function getLeaderboard(sessionId = null) {
  const [users, log] = await Promise.all([getUsers(), getDrinkLog()])
  const byUser = {}
  for (const e of log) (byUser[e.username] = byUser[e.username] || []).push(e)
  return Object.values(users).filter(u => u.role !== 'admin').map(u => {
    const all = byUser[u.username] || []
    const scoped = sessionId ? inSession(all, sessionId) : all
    return { username: u.username, points: sumPoints(scoped), drinks: countDrinks(scoped), bac_info: u.bac_info, avatar: u.avatar || null, sessionLog: all }
  }).sort((a, b) => b.points - a.points)
}

// ---------- foto ----------
export async function getSessionPhotosMap() { return read('session_photos', {}) }
export async function addSessionPhoto(sessionId, photo) {
  await mutate('session_photos', {}, map => { (map[sessionId] = map[sessionId] || []).push(photo); return map })
}
export async function removeSessionPhoto(sessionId, url, username, isAdmin) {
  let removed = null
  await mutate('session_photos', {}, map => {
    const photo = (map[sessionId] || []).find(p => p.url === url)
    if (photo && (photo.username === username || isAdmin)) { map[sessionId] = map[sessionId].filter(p => p.url !== url); removed = photo }
    return map
  })
  return removed
}
export async function togglePhotoReaction(sessionId, url, username, emoji) {
  let photo = null
  await mutate('session_photos', {}, map => {
    photo = (map[sessionId] || []).find(p => p.url === url) || null
    if (photo) {
      photo.reactions = photo.reactions || {}
      if (photo.reactions[username] === emoji) delete photo.reactions[username]
      else photo.reactions[username] = emoji
    }
    return map
  })
  return photo
}

// ---------- sfide ----------
function finalizeChallenges(all, log) {
  let changed = false
  for (const c of all) {
    const expired = Date.now() > c.deadline
    if (c.status === 'pending' && expired) { c.status = 'declined'; changed = true }
    if (c.status === 'accepted' && expired) {
      const pts = u => sumPoints(inSession(log.filter(e => e.username === u), c.sessionId))
      c.result = { challenger: pts(c.challenger), challenged: pts(c.challenged) }
      c.status = c.result.challenged >= c.result.challenger ? 'completed' : 'failed'
      changed = true
    }
  }
  return changed
}
export async function getChallenges() {
  const all = await read('challenges', [])
  // finalizza (con lock) solo se c'è davvero qualche sfida scaduta
  if (!all.some(c => ['pending', 'accepted'].includes(c.status) && Date.now() > c.deadline)) return all
  const log = await getDrinkLog()
  return mutate('challenges', [], fresh => { finalizeChallenges(fresh, log); return fresh })
}
export async function createChallenge(challenger, challenged, sessionId, deadline) {
  await getChallenges()
  let challenge
  await mutate('challenges', [], all => {
    challenge = all.find(c => c.sessionId === sessionId && c.challenger === challenger && c.challenged === challenged && ['pending', 'accepted'].includes(c.status))
    if (!challenge) { challenge = { id: uid(), challenger, challenged, sessionId, deadline, status: 'pending', createdAt: Date.now() }; all.push(challenge) }
    return all
  })
  return challenge
}
export async function respondChallenge(id, username, accept) {
  await getChallenges()
  let challenge = null
  await mutate('challenges', [], all => {
    const c = all.find(x => x.id === id && x.challenged === username && x.status === 'pending')
    if (c) { c.status = accept ? 'accepted' : 'declined'; challenge = c }
    return all
  })
  return challenge
}

// ---------- Halloween ----------
// Stato per evento: { knocks: {user: ts}, dares: {user: {text, at}}, votes: {votante: candidato} }
const emptyHalloween = () => ({ knocks: {}, dares: {}, votes: {} })
export async function getHalloweenMap() { return read('halloween', {}) }
export async function getHalloweenState(sessionId) { return { ...emptyHalloween(), ...((await getHalloweenMap())[sessionId] || {}) } }
// fn riceve lo stato dell'evento (modificabile) e restituisce un risultato
export async function updateHalloween(sessionId, fn) {
  let result
  await mutate('halloween', {}, async map => {
    const st = { ...emptyHalloween(), ...(map[sessionId] || {}) }
    result = await fn(st)
    map[sessionId] = st
    return map
  })
  return result
}
