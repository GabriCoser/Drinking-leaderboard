import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { updateBacInfo } from '@/lib/db'
export async function POST(request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const b = await request.json()
    const weight = parseFloat(b.weight), height = parseFloat(b.height), age = parseInt(b.age)
    if (!(weight >= 30 && weight <= 300) || !(height >= 100 && height <= 250) || !(age >= 14 && age <= 120) || !['M', 'F'].includes(b.sex)) {
      return NextResponse.json({ error: 'Valori non validi' }, { status: 400 })
    }
    await updateBacInfo(session.username, { weight, height, age, sex: b.sex })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Errore server' }, { status: 500 }) }
}
