// Contenuti e regole dei giochi di Halloween (usati dall'API /api/halloween)
export const KNOCK_COOLDOWN_MS = 30 * 60 * 1000
export const POINTS = { treat: 2, dare: 3, bite: 2, spared: 1 }
export const TREATS = [
  '🍬 Caramella stregata!', '🍫 Cioccolatino maledetto!', '🍭 Lecca-lecca del cimitero!',
  '🧁 Muffin della nonna strega!', '🍪 Biscotto a forma di teschio!', '🍯 Miele di pipistrello (non chiedere)!',
]
// Scherzetti: piccole prove sceme, nessuna obbliga a bere alcol
export const DARES = [
  'Fai la tua miglior risata da strega per 10 secondi 🧙',
  'Parla come Dracula fino al tuo prossimo drink 🧛',
  'Cammina come uno zombie fino al bancone e ritorno 🧟',
  'Racconta una storia di paura in 30 secondi 👻',
  'Ulula alla luna come un lupo mannaro 🐺',
  'Fai uno spavento (gentile!) a qualcuno del gruppo 😱',
  'Scatta un selfie con la faccia più mostruosa e caricalo nelle foto 📸',
  'Inventa un nome da mostro per ogni persona vicino a te 👹',
  'Imita un fantasma che ha perso le chiavi di casa 🗝️',
  'Balla Thriller di Michael Jackson per 15 secondi 🕺',
  "Per i prossimi 5 minuti rispondi solo con 'Muahahah' 😈",
  'Fai un complimento terrificante a chi ha il costume migliore 🎃',
  "Bevi un bicchiere d'acqua: anche i vampiri si idratano 💧",
  'Scambia un accessorio del costume con la persona alla tua destra 🎭',
  'Fai il verso di un pipistrello ogni volta che qualcuno dice "Halloween" per 5 minuti 🦇',
  'Mima un film horror: gli altri devono indovinarlo 🎬',
]
export const pick = list => list[Math.floor(Math.random() * list.length)]
