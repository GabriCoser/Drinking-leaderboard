import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDrinksCatalog, addDrinkToCatalog, removeDrinkFromCatalog } from '@/lib/db'
export async function GET() {
  try { return NextResponse.json({ drinks: await getDrinksCatalog() }) }
  catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
export async function POST(request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const drink = await request.json()
    if (!drink.name || !drink.points || !drink.ml || !drink.abv) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
    return NextResponse.json({ drink: await addDrinkToCatalog({ ...drink, points: parseInt(drink.points), ml: parseFloat(drink.ml), abv: parseFloat(drink.abv) }) })
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
