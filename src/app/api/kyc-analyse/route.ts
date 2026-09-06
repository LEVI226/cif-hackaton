import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, type, clientId, mimeType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image manquante' }, { status: 400 })
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const docType = type || 'CNI'
    const prompts: Record<string, string> = {
      CNI: `Analysez cette pièce d'identité (CNI ou passeport) et extrayez les informations suivantes au format JSON:
{
  "type_piece": "CNI ou PASSEPORT",
  "numero_piece": "numéro du document",
  "nom": "nom de famille",
  "prenom": "prénom(s)",
  "date_naissance": "AAAA-MM-JJ",
  "lieu_naissance": "lieu de naissance",
  "date_delivrance": "AAAA-MM-JJ",
  "date_expiration": "AAAA-MM-JJ",
  "sexe": "M ou F",
  "nationalite": "nationalité",
  "qualite_image": "BONNE, MOYENNE, MAUVAISE",
  "elements_securite_visibles": "liste des éléments de sécurité",
  "anomalies_detectees": "liste d'anomalies ou null"
}
Répondez uniquement avec le JSON, sans texte supplémentaire.`,
      JUSTIFICATIF_DOMICILE: `Analysez ce justificatif de domicile et extrayez les informations au format JSON:
{
  "type_document": "FACTURE, BAIL, ATTESTATION, etc.",
  "adresse_complete": "adresse détectée",
  "nom_titulaire": "nom sur le document",
  "date_document": "AAAA-MM-JJ",
  "qualite_image": "BONNE, MOYENNE, MAUVAISE",
  "coherence_adresse": "OUI ou NON",
  "anomalies_detectees": "liste ou null"
}
Répondez uniquement avec le JSON.`,
      FACTURE: `Analysez cette facture et extrayez les informations au format JSON:
{
  "type_facture": "EAU, ELECTRICITE, TELEPHONE, etc.",
  "fournisseur": "nom du fournisseur",
  "nom_client": "nom du client",
  "adresse": "adresse",
  "montant": "montant ou null",
  "date_facture": "AAAA-MM-JJ",
  "numero_facture": "numéro",
  "qualite_image": "BONNE, MOYENNE, MAUVAISE"
}
Répondez uniquement avec le JSON.`,
      AUTRE: `Analysez ce document et fournissez une description structurée au format JSON:
{
  "type_document": "type détecté",
  "description": "description du contenu",
  "informations_cles": "informations importantes extraites",
  "qualite_image": "BONNE, MOYENNE, MAUVAISE",
  "anomalies_detectees": "liste ou null"
}
Répondez uniquement avec le JSON.`,
    }

    const prompt = prompts[docType] || prompts.AUTRE
    const dataUri = mimeType ? `data:${mimeType};base64,${imageBase64}` : `data:image/jpeg;base64,${imageBase64}`

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const analysisText = response.choices[0]?.message?.content || ''
    let analysis: any = {}
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: analysisText }
    } catch {
      analysis = { raw: analysisText }
    }

    // Log in audit
    await db.auditLog.create({
      data: {
        action: 'ANALYSE_VLM_DOCUMENT',
        module: 'CLIENTS',
        entite: 'Document',
        entiteId: clientId || null,
        utilisateur: 'Système VLM',
        details: `Analyse VLM document ${docType}`,
      },
    })

    return NextResponse.json({
      analysis,
      type: docType,
      rawText: analysisText,
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('KYC VLM error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
