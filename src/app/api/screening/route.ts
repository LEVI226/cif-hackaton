import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { screenerNom } from '@/lib/rule-engine'

export async function GET(_req: NextRequest) {
  try {
    const screenings = await db.screening.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { nom: true, prenom: true, code: true } } },
    })
    return NextResponse.json({ data: screenings })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nom, prenom, clientId, type, operateur } = body

    const resultat = await screenerNom(nom, prenom)
    const statut = resultat.matches.some(m => m.score >= 0.95) ? 'MATCH_EXACT'
      : resultat.matches.some(m => m.score >= 0.7) ? 'MATCH_PARTIEL'
      : 'AUCUN_MATCH'

    const screening = await db.screening.create({
      data: {
        clientId: clientId || null,
        nomRecherche: `${nom} ${prenom || ''}`.trim(),
        type: type || 'COMPLET',
        resultats: JSON.stringify(resultat.matches),
        nombreMatch: resultat.matches.length,
        statut,
        details: resultat.matches.length > 0
          ? resultat.matches.map((m: any) => `${m.entree.nom} ${m.entree.prenom || ''} (${m.type}, score: ${Math.round(m.score * 100)}%)`).join('; ')
          : 'Aucun match trouvé dans les listes PPE/Sanctions',
        operateur: operateur || 'Agent conformité',
      } as any,
    })

    // Si match et client existe, créer une alerte
    if (resultat.matches.length > 0 && clientId) {
      const bestMatch = resultat.matches[0]
      await db.alerte.create({
        data: {
          reference: `ALT-SCR-${Date.now()}`,
          clientId,
          type: bestMatch.entree.type === 'PPE' ? 'INFORMATIVE' : 'BLOQUANTE',
          categorie: bestMatch.entree.type === 'PPE' ? 'PPE' : 'SANCTIONS',
          severite: bestMatch.entree.type === 'PPE' ? 'ELEVEE' : 'CRITIQUE',
          titre: `Match ${bestMatch.entree.type}: ${bestMatch.entree.nom} ${bestMatch.entree.prenom || ''}`,
          description: `Screening automatique - Correspondance ${Math.round(bestMatch.score * 100)}% avec ${bestMatch.entree.nom} ${bestMatch.entree.prenom || ''} (${bestMatch.entree.fonction || 'N/A'}, ${bestMatch.entree.pays || 'N/A'}). ${bestMatch.entree.motif ? 'Motif: ' + bestMatch.entree.motif : ''}`,
          statut: 'OUVERTE',
        } as any,
      })
    }

    return NextResponse.json({ screening, matches: resultat.matches }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
