import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'drinking-secret-2024')
export async function signToken(payload) {
  return await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(SECRET)
}
export async function verifyToken(token) {
  try { const { payload } = await jwtVerify(token, SECRET); return payload } catch { return null }
}
export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return await verifyToken(token)
}
