import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculerScoreRisqueClient, calculerSoldeGlobal } from '@/lib/rule-engine'

export async function POST(req: NextRequest) {
  try {
    const { type, clientId, alerteId } = await req.json()

    let prompt = ''
    let systemPrompt = `Vous êtes un analyste expert en conformité LBC/FT/FP (Lutte contre le Blanchiment de Capitaux, Financement du Terrorisme et Prolifération des armes de destruction massive) pour les Institutions de Microfinance (IMF) de l'espace UEMOA (Afrique de l'Ouest). Vous analysez des données financières pour identifier des patterns suspects et fournir des recommandations actionnables. Répondez en français, de manière structurée et professionnelle. Utilisez le format Markdown.`

    if (type === 'client' && clientId) {
      const client = await db.client.findUnique({
        where: { id: clientId },
        include: {
          comptes: true,
          transactions: { take: 30, orderBy: { date: 'desc' } },
          alertes: { take: 20, orderBy: { createdAt: 'desc' } },
          screenings: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      })
      if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

      const solde = await calculerSoldeGlobal(clientId)
      const score = await calculerScoreRisqueClient(clientId)

      const dataSummary = {
        client: {
          code: client.code, nom: client.nom, prenom: client.prenom,
          type: client.type, profession: client.profession,
          revenuMensuel: client.revenuMensuel, nationalite: client.nationalite,
          estPPE: client.estPPE, detailsPPE: client.detailsPPE,
          niveauRisque: client.niveauRisque, statut: client.statut,
          estOccasionnel: client.estOccasionnel, sourceFonds: client.sourceFonds,
        },
        soldeGlobal: solde,
        scoreRisque: score,
        transactions: client.transactions.map(t => ({
          reference: t.reference, type: t.type, sens: t.sens,
          montant: t.montant, date: t.date, statut: t.statut,
          paysContrepartie: t.paysContrepartie, canal: t.canal,
          estSuspecte: t.estSuspecte, motifSuspicion: t.motifSuspicion,
        })),
        alertes: client.alertes.map(a => ({
          reference: a.reference, type: a.type, categorie: a.categorie,
          severite: a.severite, titre: a.titre, statut: a.statut,
        })),
      }

      prompt = `Analysez le profil de conformité LBC/FT/FP du client suivant et fournissez:

1. **Résumé du profil de risque** - Synthèse du niveau de risque global
2. **Patterns suspects identifiés** - Analyse des transactions et comportements inhabituels
3. **Facteurs de risque aggravants** - Éléments qui augmentent le risque
4. **Recommandations d'action** - Mesures concrètes à prendre (déclaration TRA, SAR, surveillance renforcée, etc.)
5. **Prochaines étapes** - Actions prioritaires pour l'officier de conformité

Données du client:
${JSON.stringify(dataSummary, null, 2)}

Format de réponse: Markdown structuré avec titres et listes à puces. Soyez précis et citez les montants et références spécifiques.`
    } else if (type === 'alerte' && alerteId) {
      const alerte = await db.alerte.findUnique({
        where: { id: alerteId },
        include: { client: true, transaction: true },
      })
      if (!alerte) return NextResponse.json({ error: 'Alerte non trouvée' }, { status: 404 })

      prompt = `En tant qu'analyste conformité LBC/FT/FP, analysez cette alerte et fournissez:

1. **Évaluation de l'alerte** - Gravité et pertinence
2. **Analyse contextuelle** - Facteurs atténuants ou aggravants
3. **Recommandation de traitement** - Clôturer, escalader ou rejeter?
4. **Actions recommandées** - Mesures spécifiques à prendre
5. **Justification** - Argumentaire pour la décision

Données de l'alerte:
${JSON.stringify({
  alerte: {
    reference: alerte.reference, type: alerte.type, categorie: alerte.categorie,
    severite: alerte.severite, titre: alerte.titre, description: alerte.description,
    montant: alerte.montant, statut: alerte.statut,
  },
  client: alerte.client ? {
    nom: alerte.client.nom, prenom: alerte.client.prenom,
    niveauRisque: alerte.client.niveauRisque, estPPE: alerte.client.estPPE,
    profession: alerte.client.profession, revenuMensuel: alerte.client.revenuMensuel,
  } : null,
  transaction: alerte.transaction ? {
    reference: alerte.transaction.reference, type: alerte.transaction.type,
    montant: alerte.transaction.montant, paysContrepartie: alerte.transaction.paysContrepartie,
    canal: alerte.transaction.canal,
  } : null,
}, null, 2)}

Format: Markdown structuré. Soyez concret et décisionnel.`
    } else if (type === 'rapport') {
      const now = new Date()
      const ilY30j = new Date(now.getTime() - 30 * 86400000)
      const [clients, transactions, alertes] = await Promise.all([
        db.client.count(),
        db.transaction.findMany({ where: { date: { gte: ilY30j } }, take: 50, orderBy: { date: 'desc' } }),
        db.alerte.findMany({ where: { createdAt: { gte: ilY30j } }, take: 30, orderBy: { createdAt: 'desc' } }),
      ])

      prompt = `Générez un rapport de synthèse de conformité LBC/FT/FP pour les 30 derniers jours. Incluez:

1. **Vue d'ensemble** - Statistiques clés et tendances
2. **Analyse des risques** - Patterns émergents et zones de préoccupation
3. **Alertes significatives** - Cas les plus critiques à traiter
4. **Recommandations stratégiques** - Améliorations du dispositif de conformité
5. **Conclusion** - Évaluation globale du niveau de risque

Données:
- Total clients: ${clients}
- Transactions 30j: ${transactions.length}
- Alertes 30j: ${alertes.length}
- Top alertes: ${JSON.stringify(alertes.slice(0, 10).map(a => ({ type: a.type, categorie: a.categorie, severite: a.severite, titre: a.titre })))}
- Transactions suspectes: ${JSON.stringify(transactions.filter(t => t.estSuspecte).slice(0, 10).map(t => ({ type: t.type, montant: t.montant, motif: t.motifSuspicion })))}

Format: Markdown professionnel, structuré pour un rapport institutionnel destiné à la direction.`
    } else {
      return NextResponse.json({ error: 'Type ou ID manquant' }, { status: 400 })
    }

    // Use z-ai-web-dev-sdk for AI analysis
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
    })

    const analysis = completion.choices[0]?.message?.content || ''

    // Log the AI analysis in audit
    await db.auditLog.create({
      data: {
        action: 'ANALYSE_IA',
        module: type === 'client' ? 'CLIENTS' : type === 'alerte' ? 'ALERTES' : 'RAPPORTS',
        entite: type,
        entiteId: clientId || alerteId || null,
        utilisateur: 'Système IA',
        details: `Analyse IA ${type} générée`,
      },
    })

    return NextResponse.json({ analysis, type, timestamp: new Date().toISOString() })
  } catch (e: any) {
    console.error('AI analyse error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
