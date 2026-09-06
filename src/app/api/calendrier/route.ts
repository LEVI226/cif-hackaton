import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Obligations réglementaires récurrentes pour les IMF de l'UEMOA
const OBLIGATIONS_RECURRENTES = [
  {
    type: 'TRA_MENSUELLE',
    titre: 'Déclaration TRA mensuelle',
    description: 'Déclaration des Transactions Requérant une Attention particulière à la CENTIF',
    periodicite: 'MENSUEL',
    echeance: 10, // 10 du mois suivant
    categorie: 'BCEAO',
    severite: 'CRITIQUE',
  },
  {
    type: 'RAPPORT_TRIMESTRIEL',
    titre: 'Rapport trimestriel de conformité',
    description: 'Rapport synthétique des actions LBC/FT/FP du trimestre',
    periodicite: 'TRIMESTRIEL',
    echeance: 15,
    categorie: 'INTERNE',
    severite: 'ELEVEE',
  },
  {
    type: 'AUDIT_ANNUEL',
    titre: 'Audit annuel de conformité',
    description: 'Audit complet du dispositif LBC/FT/FP par un commissaire aux comptes',
    periodicite: 'ANNUEL',
    echeance: 31,
    categorie: 'EXTERNE',
    severite: 'CRITIQUE',
  },
  {
    type: 'FORMATION_ANNUELLE',
    titre: 'Formation annuelle du personnel',
    description: 'Formation LBC/FT/FP obligatoire pour tout le personnel en contact avec la clientèle',
    periodicite: 'ANNUEL',
    echeance: 31,
    categorie: 'FORMATION',
    severite: 'ELEVEE',
  },
  {
    type: 'MISE_A_JOUR_LISTE_SANCTIONS',
    titre: 'Mise à jour des listes de sanctions',
    description: 'Vérification et mise à jour des listes PPE et sanctions (OFAC, ONU, UE, BCEAO)',
    periodicite: 'MENSUEL',
    echeance: 5,
    categorie: 'BCEAO',
    severite: 'CRITIQUE',
  },
  {
    type: 'REVISION_KYC',
    titre: 'Révision KYC clients à risque élevé',
    description: 'Revue périodique des dossiers KYC des clients à risque élevé et PPE',
    periodicite: 'TRIMESTRIEL',
    echeance: 15,
    categorie: 'INTERNE',
    severite: 'ELEVEE',
  },
  {
    type: 'RAPPORT_SEMESTRIEL_GIABA',
    titre: 'Rapport semestriel GIABA',
    description: 'Rapport semestriel au Groupe d\'Action Financière (GIABA) sur l\'application des recommandations',
    periodicite: 'SEMESTRIEL',
    echeance: 30,
    categorie: 'GIABA',
    severite: 'CRITIQUE',
  },
]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mois = searchParams.get('mois') // Format: YYYY-MM
    const now = new Date()
    const annee = mois ? parseInt(mois.split('-')[0]) : now.getFullYear()
    const moisNum = mois ? parseInt(mois.split('-')[1]) : now.getMonth() + 1

    // Generate deadlines for the specified month
    const echeances: Array<any> = []

    for (const obl of OBLIGATIONS_RECURRENTES) {
      let dateEcheance: Date

      if (obl.periodicite === 'MENSUEL') {
        // Every month on the specified day
        dateEcheance = new Date(annee, moisNum - 1, obl.echeance)
      } else if (obl.periodicite === 'TRIMESTRIEL') {
        // Jan, Apr, Jul, Oct
        const trimestres = [0, 3, 6, 9]
        if (trimestres.includes(moisNum - 1)) {
          dateEcheance = new Date(annee, moisNum - 1, obl.echeance)
        } else continue
      } else if (obl.periodicite === 'SEMESTRIEL') {
        // Jan and Jul
        if (moisNum === 1 || moisNum === 7) {
          dateEcheance = new Date(annee, moisNum - 1, obl.echeance)
        } else continue
      } else if (obl.periodicite === 'ANNUEL') {
        // December
        if (moisNum === 12) {
          dateEcheance = new Date(annee, moisNum - 1, obl.echeance)
        } else continue
      } else continue

      const isPassee = dateEcheance < now
      const joursRestants = Math.ceil((dateEcheance.getTime() - now.getTime()) / 86400000)

      let statut = 'A_VENIR'
      if (isPassee) statut = 'EN_RETARD'
      else if (joursRestants <= 3) statut = 'URGENT'
      else if (joursRestants <= 7) statut = 'PROCHE'

      echeances.push({
        id: `${obl.type}-${dateEcheance.toISOString().slice(0, 10)}`,
        type: obl.type,
        titre: obl.titre,
        description: obl.description,
        dateEcheance: dateEcheance.toISOString(),
        periodicite: obl.periodicite,
        categorie: obl.categorie,
        severite: obl.severite,
        statut,
        joursRestants,
      })
    }

    // Sort by date
    echeances.sort((a, b) => new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime())

    // Also get the full 12-month calendar
    const calendrierAnnuel: Array<any> = []
    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(annee, m, 1)
      const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'long' })
      let count = 0
      for (const obl of OBLIGATIONS_RECURRENTES) {
        if (obl.periodicite === 'MENSUEL') count++
        else if (obl.periodicite === 'TRIMESTRIEL' && [0, 3, 6, 9].includes(m)) count++
        else if (obl.periodicite === 'SEMESTRIEL' && (m === 0 || m === 6)) count++
        else if (obl.periodicite === 'ANNUEL' && m === 11) count++
      }
      calendrierAnnuel.push({
        mois: m + 1,
        nom: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        nbEcheances: count,
        isCurrent: m === moisNum - 1,
      })
    }

    return NextResponse.json({
      echeances,
      calendrierAnnuel,
      mois: `${annee}-${String(moisNum).padStart(2, '0')}`,
      total: echeances.length,
      urgents: echeances.filter(e => e.statut === 'URGENT').length,
      enRetard: echeances.filter(e => e.statut === 'EN_RETARD').length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
