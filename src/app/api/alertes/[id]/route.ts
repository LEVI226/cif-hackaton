import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const alerte = await db.alerte.findUnique({
      where: { id },
      include: { client: true, transaction: { include: { compte: true } } },
    })
    if (!alerte) return NextResponse.json({ error: 'Alerte non trouvée' }, { status: 404 })
    return NextResponse.json(alerte)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, commentaire, motifCloture, traitePar, assigneeA } = body

    const alerte = await db.alerte.findUnique({ where: { id } })
    if (!alerte) return NextResponse.json({ error: 'Alerte non trouvée' }, { status: 404 })

    let nouveauStatut = alerte.statut
    if (action === 'prendre') nouveauStatut = 'EN_COURS'
    else if (action === 'escalader') nouveauStatut = 'ESCALADEE'
    else if (action === 'cloturer') nouveauStatut = 'CLOTUREE'
    else if (action === 'rejeter') nouveauStatut = 'REJETEE'

    const updated = await db.alerte.update({
      where: { id },
      data: {
        statut: nouveauStatut,
        commentaire: commentaire || alerte.commentaire,
        motifCloture: motifCloture || alerte.motifCloture,
        traiteePar: traitePar || alerte.traiteePar,
        assigneeA: assigneeA || alerte.assigneeA,
        dateTraitement: ['CLOTUREE', 'REJETEE'].includes(nouveauStatut) ? new Date().toISOString() : alerte.dateTraitement,
      } as any,
    })

    // Si on clôture une alerte bloquante, on peut débloquer la transaction associée
    if (action === 'cloturer' && alerte.transactionId && alerte.type === 'BLOQUANTE') {
      await db.transaction.update({
        where: { id: alerte.transactionId },
        data: { statut: 'VALIDEE', motifBlocage: null } as any,
      }).catch(() => {})
    }

    await db.auditLog.create({
      data: {
        action: `ALERTE_${action.toUpperCase()}`,
        module: 'ALERTES',
        entite: 'Alerte',
        entiteId: id,
        utilisateur: traitePar || 'Système',
        details: commentaire || motifCloture || action,
      }
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
