import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function getUsers() {
  const data = await redis.get('users')
  return data ? JSON.parse(data) : {}
}
export async function getUser(username) { const u = await getUsers(); return u[username] || null }
export async function createUser(username, hashedPassword, role = 'player') {
  const users = await getUsers()
  users[username] = { username, password: hashedPassword, role, drinks: 0, createdAt: Date.now() }
  await redis.set('users', JSON.stringify(users))
  return users[username]
}
export async function updateUserDrinks(username, drinks) {
  const users = await getUsers()
  if (!users[username]) return null
  users[username].drinks = drinks
  await redis.set('users', JSON.stringify(users))
  return users[username]
}
export async function deleteUser(username) { const u = await getUsers(); delete u[username]; await redis.set('users', JSON.stringify(u)) }
export async function resetAllDrinks() { const u = await getUsers(); for (const k in u) u[k].drinks = 0; await redis.set('users', JSON.stringify(u)) }
export async function getLeaderboard() {
  const u = await getUsers()
  return Object.values(u).filter(p => p.role !== 'admin').sort((a, b) => b.drinks - a.drinks)
}
