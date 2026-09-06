import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Gather recent activities from multiple sources
    const now = new Date()
    const ilY24h = new Date(now.getTime() - 24 * 86400000)

    const [alertes, transactions, screenings, auditLogs, clients] = await Promise.all([
      db.alerte.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        where: { createdAt: { gte: ilY24h } },
        include: { client: { select: { nom: true, prenom: true, code: true } } },
      }),
      db.transaction.findMany({
        take: 15,
        orderBy: { date: 'desc' },
        where: { date: { gte: ilY24h }, OR: [{ estSuspecte: true }, { statut: 'BLOQUEE' }] },
        include: { client: { select: { nom: true, prenom: true, code: true } } },
      }),
      db.screening.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: { createdAt: { gte: ilY24h } },
        include: { client: { select: { nom: true, prenom: true, code: true } } },
      }),
      db.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: { createdAt: { gte: ilY24h } },
      }),
      db.client.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { createdAt: { gte: ilY24h } },
        select: { id: true, nom: true, prenom: true, code: true, niveauRisque: true, createdAt: true },
      }),
    ])

    // Combine and sort all activities
    const activities: Array<{
      id: string
      type: string
      titre: string
      description: string
      timestamp: string
      icon: string
      color: string
      clientId?: string
      metadata?: any
    }> = []

    for (const a of alertes) {
      activities.push({
        id: `alerte-${a.id}`,
        type: 'ALERTE',
        titre: a.titre,
        description: a.client ? `${a.client.nom} ${a.client.prenom}` : a.description?.slice(0, 80) || '',
        timestamp: a.createdAt.toISOString(),
        icon: a.type === 'BLOQUANTE' ? 'Ban' : 'Bell',
        color: a.type === 'BLOQUANTE' ? 'red' : a.severite === 'CRITIQUE' ? 'orange' : 'amber',
        clientId: a.clientId || undefined,
        metadata: { reference: a.reference, severite: a.severite, montant: a.montant },
      })
    }

    for (const t of transactions) {
      activities.push({
        id: `trx-${t.id}`,
        type: 'TRANSACTION',
        titre: `Transaction ${t.statut === 'BLOQUEE' ? 'bloquée' : 'suspecte'}`,
        description: `${t.client?.nom || ''} ${t.client?.prenom || ''} · ${t.montant.toLocaleString('fr-FR')} FCFA`,
        timestamp: t.date.toISOString(),
        icon: 'ArrowLeftRight',
        color: t.statut === 'BLOQUEE' ? 'red' : 'amber',
        clientId: t.clientId,
        metadata: { reference: t.reference, montant: t.montant, type: t.type },
      })
    }

    for (const s of screenings) {
      activities.push({
        id: `screening-${s.id}`,
        type: 'SCREENING',
        titre: `Screening ${s.statut === 'AUCUN_MATCH' ? ' négatif' : s.statut === 'MATCH_EXACT' ? ' match exact' : ' match partiel'}`,
        description: s.nomRecherche,
        timestamp: s.createdAt.toISOString(),
        icon: 'Search',
        color: s.statut === 'AUCUN_MATCH' ? 'emerald' : 'red',
        clientId: s.clientId || undefined,
        metadata: { nombreMatch: s.nombreMatch, type: s.type },
      })
    }

    for (const c of clients) {
      activities.push({
        id: `client-${c.id}`,
        type: 'CLIENT',
        titre: 'Nouveau client',
        description: `${c.nom} ${c.prenom} · ${c.code}`,
        timestamp: c.createdAt.toISOString(),
        icon: 'UserPlus',
        color: 'emerald',
        clientId: c.id,
        metadata: { niveauRisque: c.niveauRisque },
      })
    }

    for (const log of auditLogs) {
      const actionLabels: Record<string, string> = {
        CONNEXION: 'Connexion',
        CREATION_CLIENT: 'Création client',
        BLOCAGE_CLIENT: 'Blocage client',
        DEBLOCAGE_CLIENT: 'Déblocage client',
        TRAITEMENT_ALERTE: 'Traitement alerte',
        SCREENING: 'Screening',
        GENERATION_RAPPORT: 'Génération rapport',
        ANALYSE_IA: 'Analyse IA',
      }
      activities.push({
        id: `audit-${log.id}`,
        type: 'AUDIT',
        titre: actionLabels[log.action] || log.action.replace(/_/g, ' '),
        description: log.utilisateur || 'Système',
        timestamp: log.createdAt.toISOString(),
        icon: 'History',
        color: 'sky',
        metadata: { module: log.module, details: log.details },
      })
    }

    // Sort by timestamp descending and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const limited = activities.slice(0, limit)

    return NextResponse.json({
      activities: limited,
      total: activities.length,
      last24h: activities.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
