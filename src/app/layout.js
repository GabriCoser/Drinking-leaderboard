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

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
