// Helper condivisi (client + server) per calcolare punti e drink in modo coerente.
// Il log contiene sia drink veri sia voci "bonus" (kind: 'bonus', es. Dolcetto o Scherzetto):
// i bonus contano nei punti ma non come drink.
export const isBonus = e => e?.kind === 'bonus'
export const isAlcoholic = e => !isBonus(e) && Number(e?.abv) > 0
export const sumPoints = log => log.reduce((s, e) => s + (Number(e.points) || 0), 0)
export const countDrinks = log => log.filter(isAlcoholic).length
export const inSession = (log, sessionId) => log.filter(e => String(e.sessionId) === String(sessionId))
// Classifica di un evento (sessionId) o di sempre (sessionId null)
export function standingsFor(players, sess, sessionId, me = null) {
  if (!sessionId) return players.filter(p => p.drinks > 0 || p.points !== 0 || p.username === me).map(p => ({ ...p, pts: p.points, dks: p.drinks, log: p.sessionLog || [] })).sort((a, b) => b.pts - a.pts)
  const inSess = p => sess?.participants ? sess.participants.includes(p.username) : (p.sessionLog || []).some(e => e.sessionId === sessionId)
  return players.filter(inSess).map(p => { const log = inSession(p.sessionLog || [], sessionId); return { ...p, pts: sumPoints(log), dks: countDrinks(log), log } }).sort((a, b) => b.pts - a.pts)
}
// posizione "a pari merito": 1 + quanti hanno strettamente più punti (0 = non in classifica)
export function rankOf(board, username) {
  const me = board.find(p => p.username === username)
  return me ? 1 + board.filter(p => p.pts > me.pts).length : 0
}
export function costumeWinner(costumes, sessionId) {
  const top = Object.entries(costumes?.[sessionId] || {}).sort((a, b) => b[1] - a[1])[0]
  return top ? { username: top[0], votes: top[1] } : null
}
