import Redis from 'ioredis'
import { DEFAULT_DRINKS } from './drinks.js'
if (!process.env.REDIS_URL) throw new Error('REDIS_URL environment variable is not set')
const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 3, connectTimeout: 5000 })
redis.on('error', (err) => console.error('[Redis] connection error:', err.message))
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
export async function getSessions() { const d = await redis.get('sessions'); return d ? JSON.parse(d) : [] }
export async function getActiveSession() { const s = await getSessions(); return s.find(x => x.active) || null }
export async function createSession(name) {
  const sessions = await getSessions()
  sessions.forEach(s => { if(s.active) { s.active = false; s.closedAt = Date.now(); } })
  const session = { id: Date.now(), name, active: true, createdAt: Date.now(), closedAt: null }
  sessions.push(session); await redis.set('sessions', JSON.stringify(sessions)); return session
}
export async function closeSession(sessionId) {
  const sessions = await getSessions()
  const s = sessions.find(x => x.id === sessionId)
  if (s) { s.active = false; s.closedAt = Date.now() }
  await redis.set('sessions', JSON.stringify(sessions))
}
export async function getDrinkLog() { const d = await redis.get('drinklog'); return d ? JSON.parse(d) : [] }
export async function addDrinkEntry(username, drink, sessionId, foodContext = null) {
  const log = await getDrinkLog()
  const entry = { id: Date.now(), username, sessionId, drinkId: drink.id, name: drink.name, emoji: drink.emoji, points: drink.points, ml: drink.ml, abv: drink.abv, foodContext, timestamp: Date.now() }
  log.push(entry); await redis.set('drinklog', JSON.stringify(log)); return entry
}
export async function removeDrinkEntry(entryId, username) {
  const log = await getDrinkLog()
  await redis.set('drinklog', JSON.stringify(log.filter(e => !(e.id === entryId && e.username === username))))
}
export async function getDrinksCatalog() {
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
    return { username: u.username, points, drinks: userLog.length, bac_info: u.bac_info, sessionLog: log.filter(e => e.username === u.username) }
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
