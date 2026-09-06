import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const statut = searchParams.get('statut') || ''
    const type = searchParams.get('type') || ''
    const severite = searchParams.get('severite') || ''
    const categorie = searchParams.get('categorie') || ''
    const clientId = searchParams.get('clientId') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (statut) where.statut = statut
    if (type) where.type = type
    if (severite) where.severite = severite
    if (categorie) where.categorie = categorie
    if (clientId) where.clientId = clientId

    const [alertes, total] = await Promise.all([
      db.alerte.findMany({
        where,
        include: {
          client: { select: { nom: true, prenom: true, code: true, niveauRisque: true } },
          transaction: { select: { reference: true, montant: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.alerte.count({ where }),
    ])

    return NextResponse.json({ data: alertes, total, page, limit })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const count = await db.alerte.count()
    const reference = `ALT-${String(count + 1).padStart(6, '0')}`

    const alerte = await db.alerte.create({
      data: {
        ...body,
        reference,
        statut: body.statut || 'OUVERTE',
        type: body.type || 'INFORMATIVE',
        severite: body.severite || 'MOYENNE',
      } as any,
    })

    return NextResponse.json(alerte, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
