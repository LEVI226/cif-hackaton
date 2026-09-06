import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculerScoreRisqueClient } from '@/lib/rule-engine'

export async function GET(req: NextRequest) {
  try {
    const now = new Date()
    const ilY30j = new Date(now.getTime() - 30 * 86400000)
    const ilY7j = new Date(now.getTime() - 7 * 86400000)
    const aujourdhui = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      totalClients,
      clientsBloques,
      clientsPPE,
      totalComptes,
      totalTransactions,
      transactions30j,
      transactionsBloquees,
      transactionsSuspectes,
      alertesOuvertes,
      alertesCritiques,
      alertes7j,
      alertesCloturees,
      totalSanctions,
      screenings7j,
    ] = await Promise.all([
      db.client.count(),
      db.client.count({ where: { statut: 'BLOQUE' } }),
      db.client.count({ where: { estPPE: true } }),
      db.compte.count(),
      db.transaction.count(),
      db.transaction.count({ where: { date: { gte: ilY30j } } }),
      db.transaction.count({ where: { statut: 'BLOQUEE' } }),
      db.transaction.count({ where: { estSuspecte: true } }),
      db.alerte.count({ where: { statut: { in: ['OUVERTE', 'EN_COURS'] } } }),
      db.alerte.count({ where: { severite: 'CRITIQUE', statut: { in: ['OUVERTE', 'EN_COURS'] } } }),
      db.alerte.count({ where: { createdAt: { gte: ilY7j } } }),
      db.alerte.count({ where: { statut: 'CLOTUREE' } }),
      db.listeSanction.count(),
      db.screening.count({ where: { createdAt: { gte: ilY7j } } }),
    ])

    const trxs30 = await db.transaction.findMany({
      where: { date: { gte: ilY30j } },
      select: { montant: true, date: true, type: true }
    })
    const volume30j = trxs30.reduce((s, t) => s + t.montant, 0)

    const parType: Record<string, number> = {}
    trxs30.forEach(t => { parType[t.type] = (parType[t.type] || 0) + 1 })

    const evolution: Array<{ date: string; montant: number; nombre: number }> = []
    for (let i = 6; i >= 0; i--) {
      const debut = new Date(now.getTime() - i * 86400000)
      debut.setHours(0, 0, 0, 0)
      const fin = new Date(debut.getTime() + 86400000)
      const trxs = await db.transaction.findMany({
        where: { date: { gte: debut, lt: fin } },
        select: { montant: true }
      })
      evolution.push({
        date: debut.toISOString().slice(0, 10),
        montant: trxs.reduce((s, t) => s + t.montant, 0),
        nombre: trxs.length,
      })
    }

    const clientsRisque = await db.client.findMany({
      where: { OR: [{ niveauRisque: 'ELEVE' }, { estPPE: true }] },
      include: { comptes: true, alertes: true },
      take: 5,
    })
    const topRisque = await Promise.all(
      clientsRisque.map(async c => {
        const sr = await calculerScoreRisqueClient(c.id)
        const solde = c.comptes.reduce((s, cp) => s + cp.solde, 0)
        return {
          id: c.id,
          code: c.code,
          nom: c.nom,
          prenom: c.prenom,
          niveauRisque: c.niveauRisque,
          estPPE: c.estPPE,
          scoreRisque: sr.score,
          solde,
          alertesOuvertes: c.alertes.filter(a => a.statut !== 'CLOTUREE' && a.statut !== 'REJETEE').length,
        }
      })
    )
    topRisque.sort((a, b) => b.scoreRisque - a.scoreRisque)

    const alertesRecentes = await db.alerte.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { client: true, transaction: true },
    })

    const risqueFaible = await db.client.count({ where: { niveauRisque: 'FAIBLE' } })
    const risqueMoyen = await db.client.count({ where: { niveauRisque: 'MOYEN' } })
    const risqueEleve = await db.client.count({ where: { niveauRisque: 'ELEVE' } })
    const risqueProhibitif = await db.client.count({ where: { niveauRisque: 'PROHIBITIF' } })

    const trxsJour = await db.transaction.findMany({
      where: { date: { gte: aujourdhui } },
      select: { montant: true, statut: true }
    })
    const volumeJour = trxsJour.reduce((s, t) => s + t.montant, 0)
    const trxJourBloquees = trxsJour.filter(t => t.statut === 'BLOQUEE').length

    return NextResponse.json({
      kpis: {
        totalClients,
        clientsBloques,
        clientsPPE,
        totalComptes,
        totalTransactions,
        transactions30j,
        transactionsBloquees,
        transactionsSuspectes,
        alertesOuvertes,
        alertesCritiques,
        alertes7j,
        alertesCloturees,
        totalSanctions,
        screenings7j,
        volume30j,
        volumeJour,
        trxJourBloquees,
      },
      evolution,
      parType,
      topRisque,
      alertesRecentes,
      repartitionRisque: { faible: risqueFaible, moyen: risqueMoyen, eleve: risqueEleve, prohibitif: risqueProhibitif },
    })
  } catch (e: any) {
    console.error('Dashboard error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
