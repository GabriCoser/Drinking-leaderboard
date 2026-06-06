import './globals.css'

export const metadata = {
  title: '🍺 Drinking Leaderboard',
  description: 'Chi beve di più? Scoprilo qui.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
