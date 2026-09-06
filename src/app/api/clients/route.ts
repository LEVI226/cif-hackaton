import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const niveauRisque = searchParams.get('niveauRisque') || ''
    const statut = searchParams.get('statut') || ''
    const estPPE = searchParams.get('estPPE')
    const estOccasionnel = searchParams.get('estOccasionnel')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (q) {
      where.OR = [
        { nom: { contains: q } },
        { prenom: { contains: q } },
        { code: { contains: q } },
        { telephone: { contains: q } },
        { numeroPiece: { contains: q } },
      ]
    }
    if (niveauRisque) where.niveauRisque = niveauRisque
    if (statut) where.statut = statut
    if (estPPE === 'true') where.estPPE = true
    if (estOccasionnel === 'true') where.estOccasionnel = true

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        include: {
          comptes: { select: { solde: true, soldeBloque: true, numero: true, type: true, statut: true } },
          _count: { select: { alertes: true, transactions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.client.count({ where }),
    ])

    const clientsAvecSolde = clients.map(c => {
      const soldeTotal = c.comptes.reduce((s, cp) => s + cp.solde, 0)
      const soldeBloque = c.comptes.reduce((s, cp) => s + cp.soldeBloque, 0)
      const alertesOuvertes = c._count.alertes
      return {
        ...c,
        soldeGlobal: soldeTotal,
        soldeBloque,
        soldeDisponible: soldeTotal - soldeBloque,
        nombreComptes: c.comptes.length,
        nombreTransactions: c._count.transactions,
        nombreAlertes: c._count.alertes,
      }
    })

    return NextResponse.json({ data: clientsAvecSolde, total, page, limit })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const count = await db.client.count()
    const code = body.code || `CLI-${String(count + 1).padStart(6, '0')}`

    const client = await db.client.create({
      data: {
        ...body,
        code,
        niveauRisque: body.niveauRisque || 'FAIBLE',
        scoreRisque: body.scoreRisque || 0,
        statut: body.statut || 'ACTIF',
        estPPE: body.estPPE || false,
        estOccasionnel: body.estOccasionnel || false,
        type: body.type || 'PARTICULIER',
        paysResidence: body.paysResidence || 'Burkina Faso',
        devise: 'XOF',
      } as any,
    })

    await db.kycHistorique.create({
      data: {
        clientId: client.id,
        action: 'CREATION',
        details: `Création du client ${client.nom} ${client.prenom || ''}`,
        operateur: body.operateur || 'Système',
      }
    })

    return NextResponse.json(client, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
