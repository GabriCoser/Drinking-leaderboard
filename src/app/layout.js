import './globals.css'

export const metadata = {
  title: '🍺 Drinking Leaderboard',
  description: 'Chi beve di più? Scoprilo qui.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'DrinkBoard', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icon-192.png' },
}

export const viewport = {
  themeColor: '#0d0d0d',
}

// Tema di stagione applicato subito (prima del caricamento dati) per evitare il "lampo" di colori;
// poi l'app usa il tema scelto dall'admin per l'evento attivo.
const SEASON_SCRIPT = `try{var d=new Date(),m=d.getMonth(),g=d.getDate();document.documentElement.dataset.theme=((m===9&&g>=20)||(m===10&&g<=2))?'halloween':'classic'}catch(e){}`

export default function RootLayout({ children }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: SEASON_SCRIPT }} /></head>
      <body>{children}</body>
    </html>
  )
}
