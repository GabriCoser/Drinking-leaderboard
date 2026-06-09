import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
function getSecret() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET non configurato in produzione')
  }
  return new TextEncoder().encode(process.env.JWT_SECRET || 'drinking-secret-2024')
}
export async function signToken(payload) {
  return await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(getSecret())
}
export async function verifyToken(token) {
  try { const { payload } = await jwtVerify(token, getSecret()); return payload } catch { return null }
}
export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return await verifyToken(token)
}
