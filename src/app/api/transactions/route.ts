import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { evaluerTransaction, genererAlertes } from '@/lib/rule-engine'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const statut = searchParams.get('statut') || ''
    const type = searchParams.get('type') || ''
    const clientId = searchParams.get('clientId') || ''
    const estSuspecte = searchParams.get('estSuspecte')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (q) {
      where.OR = [
        { reference: { contains: q } },
        { description: { contains: q } },
        { contrepartie: { contains: q } },
        { client: { nom: { contains: q } } },
      ]
    }
    if (statut) where.statut = statut
    if (type) where.type = type
    if (clientId) where.clientId = clientId
    if (estSuspecte === 'true') where.estSuspecte = true

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          client: { select: { nom: true, prenom: true, code: true, niveauRisque: true, estPPE: true } },
          compte: { select: { numero: true, type: true } },
          _count: { select: { alertes: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.transaction.count({ where }),
    ])

    return NextResponse.json({ data: transactions, total, page, limit })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const count = await db.transaction.count()
    const reference = body.reference || `TRX-${String(count + 1).padStart(7, '0')}`

    // Évaluer la transaction contre les règles
    const resultats = await evaluerTransaction({
      montant: body.montant,
      type: body.type,
      sens: body.sens,
      clientId: body.clientId,
      paysContrepartie: body.paysContrepartie,
      compteId: body.compteId,
      reference,
    })

    const bloquante = resultats.some(r => r.type === 'BLOQUANTE')
    const scoreRisque = resultats.reduce((max, r) => Math.max(max, r.scoreRisque), 0)

    const transaction = await db.transaction.create({
      data: {
        ...body,
        reference,
        date: body.date ? new Date(body.date) : new Date(),
        statut: bloquante ? 'BLOQUEE' : 'VALIDEE',
        motifBlocage: bloquante ? resultats.find(r => r.type === 'BLOQUANTE')?.titre : null,
        estSuspecte: resultats.length > 0,
        motifSuspicion: resultats.length > 0 ? resultats.map(r => r.titre).join('; ') : null,
        scoreRisque,
      } as any,
    })

    // Générer les alertes
    const alerteIds = await genererAlertes(transaction.id, resultats)

    return NextResponse.json({
      transaction,
      alertesGenerees: alerteIds.length,
      resultats,
      bloquee: bloquante,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
