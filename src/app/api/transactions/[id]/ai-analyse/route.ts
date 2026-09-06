import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        client: { select: { nom: true, prenom: true, code: true, niveauRisque: true, estPPE: true, profession: true, revenuMensuel: true } },
        compte: { select: { numero: true, type: true, solde: true } },
        alertes: { select: { type: true, categorie: true, severite: true, titre: true, description: true } },
      },
    })
    if (!transaction) return NextResponse.json({ error: 'Transaction non trouvée' }, { status: 404 })

    const systemPrompt = `Vous êtes un analyste expert en conformité LBC/FT/FP pour les Institutions de Microfinance de l'UEMOA. Vous analysez des transactions financières individuelles pour détecter des patterns de blanchiment de capitaux, de financement du terrorisme ou de structuration. Répondez en français au format Markdown.`

    const prompt = `Analysez cette transaction financière sous l'angle de la conformité LBC/FT/FP:

1. **Évaluation de la transaction** - Caractéristiques et contexte
2. **Signaux d'alerte détectés** - Patterns suspects (seuil, structuration, vélocité, pays à risque, etc.)
3. **Analyse du profil client** - Cohérence avec revenus et activité déclarée
4. **Niveau de risque** - Évaluation sur 100 avec justification
5. **Recommandation** - Valider / Surveiller / Bloquer / Signaler (TRA/SAR)
6. **Justification réglementaire** - Référence aux normes BCEAO/GIABA/GAFI applicables

Données de la transaction:
${JSON.stringify({
  reference: transaction.reference,
  type: transaction.type,
  sens: transaction.sens,
  montant: transaction.montant,
  date: transaction.date,
  statut: transaction.statut,
  paysContrepartie: transaction.paysContrepartie,
  canal: transaction.canal,
  contrepartie: transaction.contrepartie,
  estSuspecte: transaction.estSuspecte,
  motifSuspicion: transaction.motifSuspicion,
  scoreRisque: transaction.scoreRisque,
  client: transaction.client,
  compte: transaction.compte,
  alertes: transaction.alertes,
}, null, 2)}

Format: Markdown structuré et concis. Soyez décisionnel.`

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

    await db.auditLog.create({
      data: {
        action: 'ANALYSE_IA_TRANSACTION',
        module: 'TRANSACTIONS',
        entite: 'Transaction',
        entiteId: id,
        utilisateur: 'Système IA',
        details: `Analyse IA transaction ${transaction.reference}`,
      },
    })

    return NextResponse.json({ analysis, transactionId: id, reference: transaction.reference })
  } catch (e: any) {
    console.error('Transaction AI analyse error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
