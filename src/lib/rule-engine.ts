// Moteur de règles LBC/FT/FP - CIF Sentinel
// Analyse les transactions et génère des alertes selon les règles de conformité

import { db } from './db'

export interface RegleResultat {
  declenchee: boolean
  type: 'BLOQUANTE' | 'INFORMATIVE'
  categorie: string
  severite: string
  titre: string
  description: string
  scoreRisque: number
}

const PAYS_RISQUE_ELEVE = ['Iran', 'Corée du Nord', 'Syrie', 'Soudan', 'Yémen', 'Somalie', 'Afghanistan']

// Normalisation de texte pour comparaison fuzzy
export function normaliserTexte(s: string): string {
  return (s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Distance de Levenshtein simplifiée pour matching fuzzy
export function similarite(a: string, b: string): number {
  const na = normaliserTexte(a)
  const nb = normaliserTexte(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  // Calcul simple basé sur les caractères communs
  const setA = new Set(na.split(' '))
  const setB = new Set(nb.split(' '))
  let commun = 0
  setA.forEach(w => { if (setB.has(w) && w.length > 2) commun++ })
  const max = Math.max(setA.size, setB.size)
  return max > 0 ? commun / max : 0
}

// Vérifie si un nom correspond aux listes PPE/Sanctions
export async function screenerNom(nom: string, prenom?: string): Promise<{
  match: boolean
  matches: Array<{ entree: any; score: number; type: string }>
}> {
  const liste = await db.listeSanction.findMany({ where: { statut: 'ACTIF' } })
  const recherche = `${nom} ${prenom || ''}`
  const matches: Array<{ entree: any; score: number; type: string }> = []

  for (const entree of liste) {
    const entreeNom = `${entree.nom} ${entree.prenom || ''}`
    const score = similarite(recherche, entreeNom)
    if (score >= 0.7) {
      matches.push({ entree, score, type: entree.type })
    }
  }
  return { match: matches.length > 0, matches }
}

// Calcule le solde global d'un client (tous comptes confondus)
export async function calculerSoldeGlobal(clientId: string): Promise<{
  soldeTotal: number
  soldeBloque: number
  soldeDisponible: number
  nombreComptes: number
}> {
  const comptes = await db.compte.findMany({ where: { clientId } })
  const soldeTotal = comptes.reduce((s, c) => s + (c.solde || 0), 0)
  const soldeBloque = comptes.reduce((s, c) => s + (c.soldeBloque || 0), 0)
  return {
    soldeTotal,
    soldeBloque,
    soldeDisponible: soldeTotal - soldeBloque,
    nombreComptes: comptes.length,
  }
}

// Évalue une transaction contre toutes les règles actives
export async function evaluerTransaction(trx: {
  montant: number
  type: string
  sens: string
  clientId: string
  paysContrepartie?: string | null
  compteId?: string | null
  reference?: string
}): Promise<RegleResultat[]> {
  const resultats: RegleResultat[] = []
  const regles = await db.regleConformite.findMany({ where: { active: true }, orderBy: { priorite: 'desc' } })
  const client = await db.client.findUnique({ where: { id: trx.clientId } })

  if (!client) return resultats

  for (const regle of regles) {
    let params: any = {}
    try { params = JSON.parse(regle.parametres) } catch { /* ignore */ }

    if (regle.code === 'SEUIL_BLOCAGE' && trx.montant >= params.seuil) {
      resultats.push({
        declenchee: true,
        type: 'BLOQUANTE',
        categorie: 'SEUIL',
        severite: 'CRITIQUE',
        titre: `Transaction bloquée - Seuil dépassé (${trx.montant.toLocaleString('fr-FR')} FCFA)`,
        description: `La transaction de ${trx.montant.toLocaleString('fr-FR')} FCFA dépasse le seuil de blocage de ${params.seuil.toLocaleString('fr-FR')} FCFA. Conformément à la règle ${regle.code}, la transaction est automatiquement bloquée et nécessite validation du responsable conformité.`,
        scoreRisque: 90,
      })
    } else if ((regle.code === 'SEUIL_DEPOT' || regle.code === 'SEUIL_RETRAIT') && trx.montant >= params.seuil) {
      resultats.push({
        declenchee: true,
        type: 'INFORMATIVE',
        categorie: 'SEUIL',
        severite: 'MOYENNE',
        titre: `Transaction au-dessus du seuil de déclaration`,
        description: `${trx.type} de ${trx.montant.toLocaleString('fr-FR')} FCFA - dépasse le seuil de déclaration TRA (${params.seuil.toLocaleString('fr-FR')} FCFA). Déclaration à CENTIF requise.`,
        scoreRisque: 55,
      })
    } else if (regle.code === 'PAYS_RISQUE' && trx.paysContrepartie && PAYS_RISQUE_ELEVE.includes(trx.paysContrepartie)) {
      resultats.push({
        declenchee: true,
        type: 'BLOQUANTE',
        categorie: 'PAYS_RISQUE',
        severite: 'CRITIQUE',
        titre: `Transaction avec pays sous embargo: ${trx.paysContrepartie}`,
        description: `Transaction impliquant ${trx.paysContrepartie}, pays figurant sur la liste des juridictions à haut risque / sous embargo. Blocage immédiat et signalement obligatoire.`,
        scoreRisque: 95,
      })
    } else if (regle.code === 'PPE_DETECT' && client.estPPE) {
      resultats.push({
        declenchee: true,
        type: 'INFORMATIVE',
        categorie: 'PPE',
        severite: 'ELEVEE',
        titre: `Transaction client PPE: ${client.nom} ${client.prenom || ''}`,
        description: `Le client ${client.nom} ${client.prenom || ''} est identifié comme Personne Politiquement Exposée (${client.detailsPPE || 'cf. détails'}). Surveillance renforcée requise.`,
        scoreRisque: 70,
      })
    } else if (regle.code === 'PROFIL_INCOHERENT' && client.revenuMensuel && trx.montant > client.revenuMensuel * (params.ratioRevenu || 3)) {
      resultats.push({
        declenchee: true,
        type: 'INFORMATIVE',
        categorie: 'PROFIL_INCOHERENT',
        severite: 'ELEVEE',
        titre: `Transaction incohérente avec revenus déclarés`,
        description: `Montant de ${trx.montant.toLocaleString('fr-FR')} FCFA représente ${(trx.montant / client.revenuMensuel).toFixed(1)}x le revenu mensuel déclaré (${client.revenuMensuel.toLocaleString('fr-FR')} FCFA). Vérification de la source de fonds requise.`,
        scoreRisque: 68,
      })
    } else if (regle.code === 'STRUCTURING') {
      // Détection structuration: transactions < seuilUnitaire en moins de X heures
      const depuis = new Date(Date.now() - (params.periodeHeures || 24) * 3600 * 1000)
      const transactionsRecentes = await db.transaction.findMany({
        where: { clientId: trx.clientId, date: { gte: depuis }, montant: { lt: params.seuilUnitaire || 4000000 } }
      })
      if (transactionsRecentes.length >= (params.nombre || 3)) {
        const total = transactionsRecentes.reduce((s, t) => s + t.montant, 0)
        resultats.push({
          declenchee: true,
          type: 'INFORMATIVE',
          categorie: 'STRUCTURING',
          severite: 'ELEVEE',
          titre: `Structuration suspectée (smurfing)`,
          description: `${transactionsRecentes.length} transactions inférieures à ${params.seuilUnitaire?.toLocaleString('fr-FR')} FCFA en ${params.periodeHeures}h. Total cumulé: ${total.toLocaleString('fr-FR')} FCFA. Possible structuration visant à éviter le seuil de déclaration.`,
          scoreRisque: 75,
        })
      }
    } else if (regle.code === 'VELOCITY') {
      const depuis = new Date(Date.now() - (params.jours || 7) * 86400 * 1000)
      const nb = await db.transaction.count({ where: { clientId: trx.clientId, date: { gte: depuis } } })
      if (nb >= (params.nombre || 15)) {
        resultats.push({
          declenchee: true,
          type: 'INFORMATIVE',
          categorie: 'VELOCITY',
          severite: 'MOYENNE',
          titre: `Vélocité anormale de transactions`,
          description: `${nb} transactions effectuées en ${params.jours} jours par le client ${client.nom}. Volume inhabituel nécessitant une revue.`,
          scoreRisque: 60,
        })
      }
    } else if (regle.code === 'SOLDE_GLOBAL') {
      const sg = await calculerSoldeGlobal(trx.clientId)
      if (sg.soldeTotal >= params.seuil) {
        resultats.push({
          declenchee: true,
          type: 'INFORMATIVE',
          categorie: 'SEUIL',
          severite: 'MOYENNE',
          titre: `Solde global élevé - Revue requise`,
          description: `Solde global du client: ${sg.soldeTotal.toLocaleString('fr-FR')} FCFA sur ${sg.nombreComptes} compte(s). Dépasse le seuil de revue (${params.seuil.toLocaleString('fr-FR')} FCFA). Mise à jour KYC recommandée.`,
          scoreRisque: 50,
        })
      }
    }
  }

  return resultats
}

// Génère les alertes à partir des résultats de règles
export async function genererAlertes(trxId: string, resultats: RegleResultat[]): Promise<string[]> {
  const alerteIds: string[] = []
  const trx = await db.transaction.findUnique({ where: { id: trxId } })
  if (!trx) return alerteIds

  for (const r of resultats) {
    if (!r.declenchee) continue
    const count = await db.alerte.count()
    const alerte = await db.alerte.create({
      data: {
        reference: `ALT-${String(count + 1).padStart(6, '0')}`,
        clientId: trx.clientId,
        transactionId: trx.id,
        type: r.type,
        categorie: r.categorie,
        severite: r.severite,
        titre: r.titre,
        description: r.description,
        montant: trx.montant,
        statut: 'OUVERTE',
      }
    })
    alerteIds.push(alerte.id)
  }
  return alerteIds
}

// Calcule un score de risque client global
export async function calculerScoreRisqueClient(clientId: string): Promise<{
  score: number
  niveau: string
  facteurs: Array<{ label: string; points: number }>
}> {
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: { comptes: true, transactions: true, alertes: true }
  })
  if (!client) return { score: 0, niveau: 'FAIBLE', facteurs: [] }

  const facteurs: Array<{ label: string; points: number }> = []
  let score = 0

  // PPE
  if (client.estPPE) {
    score += 30
    facteurs.push({ label: 'Client identifié PPE', points: 30 })
  }

  // Niveau de risque existant
  if (client.niveauRisque === 'ELEVE') { score += 25; facteurs.push({ label: 'Risque déjà élevé', points: 25 }) }
  else if (client.niveauRisque === 'MOYEN') { score += 10; facteurs.push({ label: 'Risque moyen', points: 10 }) }

  // Alertes ouvertes
  const alertesOuvertes = client.alertes.filter(a => a.statut === 'OUVERTE' || a.statut === 'EN_COURS')
  if (alertesOuvertes.length > 0) {
    const pts = Math.min(alertesOuvertes.length * 8, 25)
    score += pts
    facteurs.push({ label: `${alertesOuvertes.length} alerte(s) ouverte(s)`, points: pts })
  }

  // Transactions suspectes
  const trxsSuspectes = client.transactions.filter(t => t.estSuspecte)
  if (trxsSuspectes.length > 0) {
    const pts = Math.min(trxsSuspectes.length * 6, 20)
    score += pts
    facteurs.push({ label: `${trxsSuspectes.length} transaction(s) suspecte(s)`, points: pts })
  }

  // Solde global élevé
  const soldeTotal = client.comptes.reduce((s, c) => s + c.solde, 0)
  if (soldeTotal > 20000000) {
    score += 10
    facteurs.push({ label: 'Solde global > 20M FCFA', points: 10 })
  }

  // Occasionnel avec gros volumes
  if (client.estOccasionnel && soldeTotal > 5000000) {
    score += 8
    facteurs.push({ label: 'Client occasionnel - volume élevé', points: 8 })
  }

  score = Math.min(score, 100)
  let niveau = 'FAIBLE'
  if (score >= 70) niveau = 'ELEVE'
  else if (score >= 40) niveau = 'MOYEN'
  else if (score >= 25) niveau = 'MOYEN'

  return { score, niveau, facteurs }
}
