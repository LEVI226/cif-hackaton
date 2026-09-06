import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { screenerNom } from '@/lib/rule-engine'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { names, type = 'COMPLET' } = body

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ error: 'Liste de noms manquante' }, { status: 400 })
    }

    if (names.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 noms par lot' }, { status: 400 })
    }

    const results = []
    let totalMatches = 0

    for (const entry of names) {
      const nom = typeof entry === 'string' ? entry : entry.nom
      const prenom = typeof entry === 'string' ? '' : entry.prenom || ''

      const resultat = await screenerNom(nom, prenom)
      const statut = resultat.matches.some(m => m.score >= 0.95) ? 'MATCH_EXACT'
        : resultat.matches.some(m => m.score >= 0.7) ? 'MATCH_PARTIEL'
        : 'AUCUN_MATCH'

      if (resultat.matches.length > 0) totalMatches++

      const screening = await db.screening.create({
        data: {
          nomRecherche: `${nom} ${prenom}`.trim(),
          type,
          resultats: JSON.stringify(resultat.matches),
          nombreMatch: resultat.matches.length,
          statut,
          details: resultat.matches.length > 0
            ? resultat.matches.map((m: any) => `${m.entree.nom} ${m.entree.prenom || ''} (${m.type}, ${Math.round(m.score * 100)}%)`).join('; ')
            : 'Aucun match trouvé',
          operateur: 'Batch screening',
        } as any,
      })

      results.push({
        id: screening.id,
        nom,
        prenom,
        statut,
        nombreMatch: resultat.matches.length,
        matches: resultat.matches.map((m: any) => ({
          nom: m.entree.nom,
          prenom: m.entree.prenom,
          type: m.entree.type,
          score: Math.round(m.score * 100),
          fonction: m.entree.fonction,
          pays: m.entree.pays,
          source: m.entree.source,
          motif: m.entree.motif,
        })),
      })
    }

    // Log in audit
    await db.auditLog.create({
      data: {
        action: 'BATCH_SCREENING',
        module: 'SCREENING',
        entite: 'Batch',
        utilisateur: 'Système',
        details: `Screening en lot de ${names.length} nom(s) - ${totalMatches} match(s)`,
      },
    })

    return NextResponse.json({
      results,
      total: names.length,
      matches: totalMatches,
      clean: names.length - totalMatches,
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (e: any) {
    console.error('Batch screening error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
