import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function getUsers() {
  const data = await redis.get('users')
  return data ? JSON.parse(data) : {}
}
export async function getUser(username) { const u = await getUsers(); return u[username] || null }
export async function createUser(username, hashedPassword, role = 'player') {
  const users = await getUsers()
  users[username] = { username, password: hashedPassword, role, drinks: [], points: 0, bac_info: null, createdAt: Date.now() }
  await redis.set('users', JSON.stringify(users))
  return users[username]
}
export async function getUserProfile(username) {
  const user = await getUser(username)
  if (!user) return null
  return { username: user.username, role: user.role, points: user.points || 0, drinks: user.drinks || [], bac_info: user.bac_info || null }
}
export async function addDrink(username, drink) {
  const users = await getUsers()
  if (!users[username]) return null
  if (!users[username].drinks) users[username].drinks = []
  if (!users[username].points) users[username].points = 0
  const entry = { ...drink, id: Date.now(), timestamp: Date.now() }
  users[username].drinks.unshift(entry)
  users[username].points += drink.points
  await redis.set('users', JSON.stringify(users))
  return users[username]
}
export async function removeDrink(username, drinkId) {
  const users = await getUsers()
  if (!users[username]) return null
  const drink = users[username].drinks.find(d => d.id === drinkId)
  if (drink) {
    users[username].drinks = users[username].drinks.filter(d => d.id !== drinkId)
    users[username].points = Math.max(0, (users[username].points || 0) - drink.points)
  }
  await redis.set('users', JSON.stringify(users))
  return users[username]
}
export async function updateBacInfo(username, bacInfo) {
  const users = await getUsers()
  if (!users[username]) return null
  users[username].bac_info = bacInfo
  await redis.set('users', JSON.stringify(users))
  return users[username]
}
export async function updateUserDrinks(username, points) {
  const users = await getUsers()
  if (!users[username]) return null
  users[username].points = points
  await redis.set('users', JSON.stringify(users))
  return users[username]
}
export async function deleteUser(username) { const u = await getUsers(); delete u[username]; await redis.set('users', JSON.stringify(u)) }
export async function resetAllDrinks() {
  const u = await getUsers()
  for (const k in u) { u[k].drinks = []; u[k].points = 0 }
  await redis.set('users', JSON.stringify(u))
}
export async function getLeaderboard() {
  const u = await getUsers()
  return Object.values(u).filter(p => p.role !== 'admin').sort((a, b) => (b.points || 0) - (a.points || 0))
}
