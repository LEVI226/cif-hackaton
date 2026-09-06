import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    if (!q || q.length < 2) {
      return NextResponse.json({ clients: [], transactions: [], alertes: [] })
    }

    const [clients, transactions, alertes] = await Promise.all([
      db.client.findMany({
        where: {
          OR: [
            { nom: { contains: q } },
            { prenom: { contains: q } },
            { code: { contains: q } },
            { telephone: { contains: q } },
            { numeroPiece: { contains: q } },
          ],
        },
        take: 5,
        select: { id: true, nom: true, prenom: true, code: true, niveauRisque: true, statut: true, estPPE: true },
      }),
      db.transaction.findMany({
        where: {
          OR: [
            { reference: { contains: q } },
            { description: { contains: q } },
            { contrepartie: { contains: q } },
          ],
        },
        take: 5,
        include: { client: { select: { nom: true, prenom: true, code: true } } },
      }),
      db.alerte.findMany({
        where: {
          OR: [
            { reference: { contains: q } },
            { titre: { contains: q } },
            { description: { contains: q } },
          ],
        },
        take: 5,
        include: { client: { select: { nom: true, prenom: true } } },
      }),
    ])

    return NextResponse.json({
      clients: clients.map(c => ({ ...c, type: 'client' })),
      transactions: transactions.map(t => ({ ...t, type: 'transaction' })),
      alertes: alertes.map(a => ({ ...a, type: 'alerte' })),
      total: clients.length + transactions.length + alertes.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
