import { kv } from '@vercel/kv'
export async function getUsers() { return (await kv.get('users')) || {} }
export async function getUser(username) { const u = await getUsers(); return u[username] || null }
export async function createUser(username, hashedPassword, role = 'player') {
  const users = await getUsers()
  users[username] = { username, password: hashedPassword, role, drinks: 0, createdAt: Date.now() }
  await kv.set('users', users)
  return users[username]
}
export async function updateUserDrinks(username, drinks) {
  const users = await getUsers()
  if (!users[username]) return null
  users[username].drinks = drinks
  await kv.set('users', users)
  return users[username]
}
export async function deleteUser(username) { const u = await getUsers(); delete u[username]; await kv.set('users', u) }
export async function resetAllDrinks() { const u = await getUsers(); for (const k in u) u[k].drinks = 0; await kv.set('users', u) }
export async function getLeaderboard() {
  const u = await getUsers()
  return Object.values(u).filter(p => p.role !== 'admin').sort((a, b) => b.drinks - a.drinks)
}
