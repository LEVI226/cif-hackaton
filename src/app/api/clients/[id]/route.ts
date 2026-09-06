import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculerScoreRisqueClient, calculerSoldeGlobal } from '@/lib/rule-engine'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await db.client.findUnique({
      where: { id },
      include: {
        comptes: { orderBy: { createdAt: 'desc' } },
        transactions: { take: 30, orderBy: { date: 'desc' }, include: { alertes: true } },
        alertes: { take: 20, orderBy: { createdAt: 'desc' } },
        documents: true,
        kycHistorique: { take: 20, orderBy: { createdAt: 'desc' } },
        screenings: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

    const soldeGlobal = await calculerSoldeGlobal(client.id)
    const scoreRisque = await calculerScoreRisqueClient(client.id)

    return NextResponse.json({ ...client, soldeGlobal, scoreRisque })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const ancien = await db.client.findUnique({ where: { id } })
    if (!ancien) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

    const { operateur, ...data } = body
    const client = await db.client.update({ where: { id }, data: data as any })

    // Journaliser les changements importants
    const changements: string[] = []
    if (ancien.niveauRisque !== client.niveauRisque) changements.push(`niveau de risque: ${ancien.niveauRisque} → ${client.niveauRisque}`)
    if (ancien.statut !== client.statut) changements.push(`statut: ${ancien.statut} → ${client.statut}`)
    if (ancien.estPPE !== client.estPPE) changements.push(`statut PPE: ${ancien.estPPE} → ${client.estPPE}`)

    if (changements.length > 0) {
      await db.kycHistorique.create({
        data: {
          clientId: id,
          action: 'MODIFICATION',
          details: changements.join('; '),
          operateur: operateur || 'Système',
        }
      })
    }

    return NextResponse.json(client)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, motif, operateur } = body

    const client = await db.client.findUnique({ where: { id } })
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

    let nouveauStatut = client.statut
    if (action === 'bloquer') nouveauStatut = 'BLOQUE'
    else if (action === 'debloquer') nouveauStatut = 'ACTIF'
    else if (action === 'suspendre') nouveauStatut = 'SUSPENDU'

    const updated = await db.client.update({
      where: { id },
      data: {
        statut: nouveauStatut,
        motifBlocage: action === 'bloquer' ? motif : null,
        dateBlocage: action === 'bloquer' ? new Date().toISOString() : null,
      } as any,
    })

    // Bloquer aussi les comptes
    if (action === 'bloquer' || action === 'suspendre') {
      await db.compte.updateMany({ where: { clientId: id }, data: { statut: 'BLOQUE' } })
    } else if (action === 'debloquer') {
      await db.compte.updateMany({ where: { clientId: id }, data: { statut: 'ACTIF', soldeBloque: 0 } })
    }

    await db.kycHistorique.create({
      data: {
        clientId: id,
        action: action === 'bloquer' ? 'BLOCAGE' : (action === 'debloquer' ? 'DEBLOCAGE' : 'MODIFICATION'),
        details: motif || `${action} client`,
        operateur: operateur || 'Responsable conformité',
      }
    })

    await db.auditLog.create({
      data: {
        action: action === 'bloquer' ? 'BLOCAGE_CLIENT' : 'DEBLOCAGE_CLIENT',
        module: 'CLIENTS',
        entite: 'Client',
        entiteId: id,
        utilisateur: operateur || 'Système',
        details: motif || action,
      }
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
