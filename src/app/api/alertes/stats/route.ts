import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const now = new Date()
    const ilY7j = new Date(now.getTime() - 7 * 86400000)
    const ilY30j = new Date(now.getTime() - 30 * 86400000)

    // 1. Evolution sur 7 jours (par jour)
    const evolution: Array<{ date: string; ouvertes: number; cloturees: number; bloquantes: number }> = []
    for (let i = 6; i >= 0; i--) {
      const debut = new Date(now.getTime() - i * 86400000)
      debut.setHours(0, 0, 0, 0)
      const fin = new Date(debut.getTime() + 86400000)
      const [ouvertes, cloturees, bloquantes] = await Promise.all([
        db.alerte.count({ where: { createdAt: { gte: debut, lt: fin } } }),
        db.alerte.count({ where: { statut: 'CLOTUREE', dateTraitement: { gte: debut.toISOString(), lt: fin.toISOString() } } }),
        db.alerte.count({ where: { type: 'BLOQUANTE', createdAt: { gte: debut, lt: fin } } }),
      ])
      evolution.push({ date: debut.toISOString().slice(0, 10), ouvertes, cloturees, bloquantes })
    }

    // 2. Répartition par catégorie
    const parCategorieRaw = await db.alerte.groupBy({
      by: ['categorie'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })
    const parCategorie = parCategorieRaw.map(c => ({ categorie: c.categorie, count: c._count.id }))

    // 3. Répartition par sévérité
    const parSeveriteRaw = await db.alerte.groupBy({
      by: ['severite'],
      _count: { id: true },
    })
    const parSeverite = parSeveriteRaw.map(s => ({ severite: s.severite, count: s._count.id }))

    // 4. Répartition par statut
    const parStatutRaw = await db.alerte.groupBy({
      by: ['statut'],
      _count: { id: true },
    })
    const parStatut = parStatutRaw.map(s => ({ statut: s.statut, count: s._count.id }))

    // 5. Temps de traitement moyen (en heures)
    const alertesTraitees = await db.alerte.findMany({
      where: { statut: 'CLOTUREE', dateTraitement: { not: null } },
      select: { createdAt: true, dateTraitement: true },
      take: 100,
    })
    const tempsTraitement = alertesTraitees
      .filter(a => a.dateTraitement)
      .map(a => {
        const created = new Date(a.createdAt).getTime()
        const treated = new Date(a.dateTraitement!).getTime()
        return (treated - created) / 3600000 // hours
      })
    const tempsMoyen = tempsTraitement.length > 0
      ? tempsTraitement.reduce((s, t) => s + t, 0) / tempsTraitement.length
      : 0

    // 6. Top 5 clients avec le plus d'alertes
    const topClientsRaw = await db.alerte.groupBy({
      by: ['clientId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    })
    const topClientsDetails = await Promise.all(
      topClientsRaw.filter(c => c.clientId).map(async c => {
        const client = await db.client.findUnique({
          where: { id: c.clientId! },
          select: { nom: true, prenom: true, code: true, niveauRisque: true },
        })
        return {
          ...client,
          count: c._count.id,
        }
      })
    )

    return NextResponse.json({
      evolution,
      parCategorie,
      parSeverite,
      parStatut,
      tempsMoyenTraitement: Math.round(tempsMoyen * 10) / 10,
      totalTraitees: alertesTraitees.length,
      topClients: topClientsDetails,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
