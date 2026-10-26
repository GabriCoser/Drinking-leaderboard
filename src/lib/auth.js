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
export async function setSessionCookie(res, payload) {
  res.cookies.set('session', await signToken(payload), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/' })
  return res
}
// Nome giocatore: spazi compattati, minuscolo (è la chiave utente), 2-20 caratteri
export function normalizeName(raw) {
  const name = String(raw || '').trim().replace(/\s+/g, ' ').toLowerCase()
  if (name.length < 2 || name.length > 20) return { error: 'Il nome deve avere tra 2 e 20 caratteri' }
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(name)) return { error: 'Usa solo lettere, numeri, spazi e . _ \' -' }
  if (name === 'admin') return { error: 'Nome riservato, scegline un altro' }
  return { name }
}
