import Redis from 'ioredis'
import { DEFAULT_DRINKS } from './drinks.js'
let _client = null
function getRedis() {
  if (!_client) {
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL environment variable is not set')
    _client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 3, connectTimeout: 5000 })
    _client.on('error', (err) => console.error('[Redis] connection error:', err.message))
  }
  return _client
}
const redis = { get: (...a) => getRedis().get(...a), set: (...a) => getRedis().set(...a) }
export async function getUsers() { const d = await redis.get('users'); return d ? JSON.parse(d) : {} }
export async function getUser(username) { const u = await getUsers(); return u[username] || null }
export async function createUser(username, hashedPassword, role = 'player') {
  const users = await getUsers()
  users[username] = { username, password: hashedPassword, role, bac_info: null, createdAt: Date.now() }
  await redis.set('users', JSON.stringify(users)); return users[username]
}
export async function updateBacInfo(username, bacInfo) {
  const users = await getUsers(); if (!users[username]) return null
  users[username].bac_info = bacInfo; await redis.set('users', JSON.stringify(users)); return users[username]
}
export async function deleteUser(username) { const u = await getUsers(); delete u[username]; await redis.set('users', JSON.stringify(u)) }
export async function updateUserAvatar(username, url) {
  const users = await getUsers(); if (!users[username]) return null
  users[username].avatar = url; await redis.set('users', JSON.stringify(users)); return users[username]
}
export async function addSessionPhoto(sessionId, photo) {
  const d = await redis.get('session_photos')
  const photos = d ? JSON.parse(d) : {}
  if (!photos[sessionId]) photos[sessionId] = []
  photos[sessionId].push(photo)
  await redis.set('session_photos', JSON.stringify(photos))
}
export async function getSessions() { const d = await redis.get('sessions'); return d ? JSON.parse(d) : [] }
export async function getActiveSession() {
  const sessions = await getSessions()
  const active = sessions.find(x => x.active) || null
  if (active && active.autoCloseAt && Date.now() > active.autoCloseAt) {
    active.active = false; active.closedAt = active.autoCloseAt
    await redis.set('sessions', JSON.stringify(sessions))
    return null
  }
  return active
}
export async function createSession(name, autoCloseAt = null) {
  const sessions = await getSessions()
  sessions.forEach(s => { if(s.active) { s.active = false; s.closedAt = Date.now(); } })
  const session = { id: Date.now(), name, active: true, createdAt: Date.now(), closedAt: null, autoCloseAt, participants: [] }
  sessions.push(session); await redis.set('sessions', JSON.stringify(sessions)); return session
}
export async function setSessionParticipation(sessionId, username, join) {
  const sessions = await getSessions()
  const s = sessions.find(x => x.id === sessionId && x.active)
  if (!s) return null
  s.participants = s.participants || []
  if (join && !s.participants.includes(username)) s.participants.push(username)
  if (!join) s.participants = s.participants.filter(u => u !== username)
  await redis.set('sessions', JSON.stringify(sessions))
  return s
}
export async function closeSession(sessionId) {
  const sessions = await getSessions()
  const s = sessions.find(x => x.id === sessionId)
  if (s) { s.active = false; s.closedAt = Date.now() }
  await redis.set('sessions', JSON.stringify(sessions))
}
export async function getDrinkLog() { const d = await redis.get('drinklog'); return d ? JSON.parse(d) : [] }
export async function addDrinkEntry(username, drink, sessionId, foodContext = null, note = null) {
  const log = await getDrinkLog()
  const entry = { id: Date.now(), username, sessionId, drinkId: drink.id, name: drink.name, emoji: drink.emoji, points: drink.points, ml: drink.ml, abv: drink.abv, foodContext, note, timestamp: Date.now() }
  log.push(entry); await redis.set('drinklog', JSON.stringify(log)); return entry
}
export async function updateDrinkNote(entryId, username, note) {
  const log = await getDrinkLog()
  const e = log.find(x => x.id === entryId && x.username === username)
  if (!e) return null
  e.note = note; await redis.set('drinklog', JSON.stringify(log)); return e
}
export async function removeDrinkEntry(entryId, username) {
  const log = await getDrinkLog()
  await redis.set('drinklog', JSON.stringify(log.filter(e => !(e.id === entryId && e.username === username))))
}
const CATALOG_VERSION = 2
export async function getDrinksCatalog() {
  const v = parseInt(await redis.get('drinks_catalog_version') || '0', 10)
  if (v < CATALOG_VERSION) {
    // reseed mantenendo i drink custom aggiunti dall'admin
    const d = await redis.get('drinks_catalog')
    const existing = d ? JSON.parse(d) : []
    const custom = existing.filter(x => String(x.id).startsWith('custom_'))
    const merged = [...DEFAULT_DRINKS, ...custom]
    await redis.set('drinks_catalog', JSON.stringify(merged))
    await redis.set('drinks_catalog_version', String(CATALOG_VERSION))
    return merged
  }
  const d = await redis.get('drinks_catalog')
  if (!d) { await redis.set('drinks_catalog', JSON.stringify(DEFAULT_DRINKS)); return DEFAULT_DRINKS }
  return JSON.parse(d)
}
export async function addDrinkToCatalog(drink) {
  const catalog = await getDrinksCatalog()
  const newDrink = { ...drink, id: 'custom_' + Date.now() }
  catalog.push(newDrink); await redis.set('drinks_catalog', JSON.stringify(catalog)); return newDrink
}
export async function removeDrinkFromCatalog(drinkId) {
  const catalog = await getDrinksCatalog()
  await redis.set('drinks_catalog', JSON.stringify(catalog.filter(d => d.id !== drinkId)))
}
export async function getLeaderboard(sessionId = null) {
  const users = await getUsers(); const log = await getDrinkLog()
  const players = Object.values(users).filter(u => u.role !== 'admin')
  return players.map(u => {
    const userLog = sessionId ? log.filter(e => e.username === u.username && e.sessionId === sessionId) : log.filter(e => e.username === u.username)
    const points = userLog.reduce((sum, e) => sum + e.points, 0)
    return { username: u.username, points, drinks: userLog.length, bac_info: u.bac_info, avatar: u.avatar || null, sessionLog: log.filter(e => e.username === u.username) }
  }).sort((a, b) => b.points - a.points)
}
export async function deleteSession(sessionId) {
  const sessions = await getSessions()
  const filtered = sessions.filter(s => s.id !== sessionId)
  await redis.set('sessions', JSON.stringify(filtered))
  const log = await getDrinkLog()
  await redis.set('drinklog', JSON.stringify(log.filter(e => e.sessionId !== sessionId)))
}
export async function resetAllDrinks() {
  await redis.set('drinklog', JSON.stringify([]))
}
export async function updateUserDrinks(username, drinks) {
  const log = await getDrinkLog()
  const others = log.filter(e => e.username !== username)
  const kept = log.filter(e => e.username === username).slice(-Math.max(0, drinks))
  await redis.set('drinklog', JSON.stringify([...others, ...kept]))
}
export async function toggleFavorite(username, drinkId) {
  const users = await getUsers()
  const u = users[username]; if (!u) return []
  u.favorites = u.favorites || []
  u.favorites = u.favorites.includes(drinkId) ? u.favorites.filter(d => d !== drinkId) : [...u.favorites, drinkId]
  await redis.set('users', JSON.stringify(users)); return u.favorites
}
export async function getFavorites(username) {
  const u = await getUser(username); return u?.favorites || []
}
export async function getSessionPhotosMap() { const d = await redis.get('session_photos'); return d ? JSON.parse(d) : {} }
export async function setSessionPhotosMap(map) { await redis.set('session_photos', JSON.stringify(map)) }
export async function togglePhotoReaction(sessionId, url, username, emoji) {
  const map = await getSessionPhotosMap()
  const photo = (map[sessionId] || []).find(p => p.url === url)
  if (!photo) return null
  photo.reactions = photo.reactions || {}
  if (photo.reactions[username] === emoji) delete photo.reactions[username]
  else photo.reactions[username] = emoji
  await setSessionPhotosMap(map); return photo
}
export async function getChallenges() {
  // finalizza le sfide accettate la cui scadenza è passata
  const d = await redis.get('challenges')
  const all = d ? JSON.parse(d) : []
  const log = await getDrinkLog()
  let changed = false
  for (const c of all) {
    const expired = Date.now() > c.deadline
    if (c.status === 'pending' && expired) { c.status = 'declined'; changed = true }
    if (c.status === 'accepted' && expired) {
      const pts = u => log.filter(e => e.username === u && e.sessionId === c.sessionId).reduce((s, e) => s + e.points, 0)
      c.result = { challenger: pts(c.challenger), challenged: pts(c.challenged) }
      c.status = c.result.challenged >= c.result.challenger ? 'completed' : 'failed'
      changed = true
    }
  }
  if (changed) await redis.set('challenges', JSON.stringify(all))
  return all
}
export async function createChallenge(challenger, challenged, sessionId, deadline) {
  const all = await getChallenges()
  const dup = all.find(c => c.sessionId === sessionId && c.challenger === challenger && c.challenged === challenged && ['pending', 'accepted'].includes(c.status))
  if (dup) return dup
  const challenge = { id: Date.now(), challenger, challenged, sessionId, deadline, status: 'pending', createdAt: Date.now() }
  all.push(challenge)
  await redis.set('challenges', JSON.stringify(all))
  return challenge
}
export async function respondChallenge(id, username, accept) {
  const all = await getChallenges()
  const c = all.find(x => x.id === id && x.challenged === username && x.status === 'pending')
  if (!c) return null
  c.status = accept ? 'accepted' : 'declined'
  await redis.set('challenges', JSON.stringify(all))
  return c
}
