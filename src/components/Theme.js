'use client'

import { useEffect } from 'react'
import { isWitchingHour } from '@/lib/theme'

// Applica il tema dell'evento a <html data-theme="...">
export function useApplyTheme(theme) {
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
}

const BATS = [
  { top: '12vh', dur: 22, delay: -4 },
  { top: '28vh', dur: 30, delay: -19 },
  { top: '55vh', dur: 26, delay: -11 },
  { top: '75vh', dur: 34, delay: -27 },
]
// Sfondo animato di Halloween: luna, pipistrelli, ragno e nebbia (non intercetta i tocchi)
export function HalloweenFX({ now = Date.now() }) {
  const witching = isWitchingHour(new Date(now))
  return (
    <div className="hw-fx" aria-hidden="true">
      <div className={'hw-moon' + (witching ? ' blood' : '')} />
      {BATS.map((b, i) => <span key={i} className="hw-bat" style={{ top: b.top, animationDuration: b.dur + 's', animationDelay: b.delay + 's' }}>🦇</span>)}
      <div className="hw-spider"><span style={{ fontSize: '1.3rem' }}>🕷️</span></div>
      <div className="hw-fog" />
    </div>
  )
}
