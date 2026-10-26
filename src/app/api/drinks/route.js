import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDrinksCatalog, addDrinkToCatalog, removeDrinkFromCatalog } from '@/lib/db'
import { CATEGORIES } from '@/lib/drinks'
export async function GET() {
  try { return NextResponse.json({ drinks: await getDrinksCatalog() }) }
  catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function POST(request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { name, desc, emoji, ml, abv, category } = await request.json()
    const mlN = parseFloat(ml), abvN = parseFloat(abv)
    if (!name?.trim() || !(mlN > 0) || !(abvN >= 0) || abvN > 100) return NextResponse.json({ error: 'Dati mancanti o non validi' }, { status: 400 })
    // i punti si calcolano dalla formula (vedi lib/drinks.js) per restare bilanciati
    const drink = await addDrinkToCatalog({ name: name.trim(), ...(desc?.trim() ? { desc: String(desc).trim().slice(0, 80) } : {}), emoji: emoji || '🍹', ml: mlN, abv: abvN, category: CATEGORIES.some(([k]) => k === category) ? category : 'altro' })
    return NextResponse.json({ drink })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function DELETE(request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const { drinkId } = await request.json()
    await removeDrinkFromCatalog(drinkId)
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
