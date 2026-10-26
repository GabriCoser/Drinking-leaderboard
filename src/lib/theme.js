// Temi evento. Il tema lo sceglie l'admin quando crea l'evento;
// senza evento (o per eventi vecchi senza tema) si usa quello di stagione.
export const THEMES = {
  classic: {
    label: '🍺 Classico', logo: '🍺', title: ['DRINKING', 'LEADERBOARD'], subtitle: null,
    medals: ['🥇', '🥈', '🥉'], confetti: ['🎉', '🍺', '🥂', '✨', '🍾', '🎊'],
  },
  halloween: {
    label: '🎃 Halloween', logo: '🎃', title: ['DRINKING', 'LEADERBOARD'], subtitle: '🦇 Halloween Edition 🦇',
    medals: ['🎃', '👻', '🦇'], confetti: ['🎃', '👻', '🦇', '🕷️', '💀', '🍬'],
  },
}
export function isHalloweenSeason(date = new Date()) {
  const m = date.getMonth(), d = date.getDate()
  return (m === 9 && d >= 20) || (m === 10 && d <= 2)
}
export function seasonalTheme(date = new Date()) { return isHalloweenSeason(date) ? 'halloween' : 'classic' }
export function themeOf(session) {
  return session?.theme && THEMES[session.theme] ? session.theme : seasonalTheme()
}
// Mezzanotte-00:13 (ora locale del telefono): l'ora delle streghe
export function isWitchingHour(date = new Date()) { return date.getHours() === 0 && date.getMinutes() < 13 }
