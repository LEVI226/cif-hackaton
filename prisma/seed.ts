/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '../src/lib/db'

// Générateur de données seed pour CIF Sentinel - Système LBC/FT/FP

const nomsBurkinabe = [
  'OUEDRAOGO', 'SAWADOGO', 'KABORE', 'TRAORE', 'COMPAORE', 'ZONGO', 'YAMEOGO',
  'NACOULMA', 'BONKOUNGOU', 'TAPSOBA', 'KONE', 'DIALLO', 'SANOU', 'OUATTARA',
  'BAMOGO', 'SANKARA', 'GNOUMOU', 'SOME', 'BESSA', 'KOURAOGO', 'KINDA',
  'BOUDO', 'ZOUNGRANA', 'PARÉ', 'DAO', 'GUEYE', 'DIOP', 'FAYE', 'NDIAYE'
]

const prenomsM = ['Ibrahim', 'Moussa', 'Karim', 'Adama', 'Salif', 'Boukary', 'Issa', 'Hamado', 'Ousseni', 'Rasmane', 'Mamadou', 'Seydou', 'Bakary', 'Lassina', 'Drissa', 'Cheick', 'Oumar', 'Lassane', 'Aboubacar', 'Boubakary']
const prenomsF = ['Aminata', 'Fatimata', 'Rasmata', 'Mariam', 'Aïssata', 'Salimata', 'Kadiatou', 'Hawa', 'Bintou', 'Awa', 'Rokia', 'Kadidja', 'Nana', 'Aïcha', 'Hadjara', 'Maimouna', 'Assetou', 'Rachida', 'Bassiratou', 'Alimata']

const villes = ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 'Banfora', 'Kaya', 'Tenkodogo', 'Fada N\'Gourma', 'Dédougou', 'Dori']
const professions = ['Commerçant', 'Agriculteur', 'Enseignant', 'Comptable', 'Médecin', 'Infirmier', 'Étudiant', 'Chauffeur', 'Mécanicien', 'Couturier', 'Menuisier', 'Maçon', 'Électricien', 'Restaurateur', 'Fonctionnaire', 'Pharmacien', 'Juriste', 'Ingénieur', 'Journaliste', 'Éleveur']

function randomChoice<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randomFloat(min: number, max: number): number { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }

// Listes de sanctions/PPE réalistes
const listePPE = [
  { nom: 'COMPAORE', prenom: 'Blaise', fonction: 'Ancien Président', pays: 'Burkina Faso', nationalite: 'Burkinabè', type: 'PPE', source: 'UEMOA' },
  { nom: 'DIAKITE', prenom: 'Mamadou', fonction: 'Ministre des Finances', pays: 'Mali', nationalite: 'Malienne', type: 'PPE', source: 'UEMOA' },
  { nom: 'TALL', prenom: 'Alassane', fonction: 'Député', pays: 'Côte d\'Ivoire', nationalite: 'Ivoirienne', type: 'PPE', source: 'UEMOA' },
  { nom: 'GUEYE', prenom: 'Ousmane', fonction: 'Maire de Commune', pays: 'Sénégal', nationalite: 'Sénégalaise', type: 'PPE', source: 'UEMOA' },
  { nom: 'ADJADJI', prenom: 'Kossi', fonction: 'Directeur Génénaire Trésor', pays: 'Togo', nationalite: 'Togolaise', type: 'PPE', source: 'UEMOA' },
  { nom: 'DOSSOU', prenom: 'Martin', fonction: 'Président de Cour', pays: 'Bénin', nationalite: 'Béninoise', type: 'PPE', source: 'UEMOA' },
  { nom: 'KANTE', prenom: 'Ibrahima', fonction: 'Ambassadeur', pays: 'Mali', nationalite: 'Malienne', type: 'PPE', source: 'ONU' },
  { nom: 'NIANG', prenom: 'Fatou', fonction: 'Directrice Centrale Banque', pays: 'Sénégal', nationalite: 'Sénégalaise', type: 'PPE', source: 'BCEAO' },
]

const listeSanctions = [
  { nom: 'TOURE', prenom: 'Ahmed', fonction: 'Commerçant suspect', pays: 'Mali', source: 'UE', type: 'SANCTIONS', motif: 'Blanchiment de capitaux présumé', numeroDossier: 'UE-2024-0156' },
  { nom: 'DIARRA', prenom: 'Souleymane', fonction: 'Opérateur change', pays: 'Burkina Faso', source: 'BCEAO', type: 'SANCTIONS', motif: 'Financement terrorisme présumé', numeroDossier: 'BCEAO-2023-0789' },
  { nom: 'IBRAHIM', prenom: 'Mahamadou', fonction: 'Transporteur', pays: 'Niger', source: 'OFAC', type: 'SANCTIONS', motif: 'Réseau de financement illicite', numeroDossier: 'OFAC-SDN-0456' },
  { nom: 'SANI', prenom: 'Abdou', fonction: 'Importateur', pays: 'Nigeria', source: 'ONU', type: 'SANCTIONS', motif: 'Prolifération armes', numeroDossier: 'UN-SC-1234' },
  { nom: 'BOUBACAR', prenom: 'Hamidou', fonction: 'Ong suspecte', pays: 'Mali', source: 'INTERNE', type: 'SANCTIONS', motif: 'Transactions structurées répétées', numeroDossier: 'CIF-2025-0012' },
]

const paysRisqueEleve = ['Iran', 'Corée du Nord', 'Syrie', 'Soudan', 'Yémen', 'Somalie', 'Afghanistan']
const paysInterface = ['France', 'Belgique', 'États-Unis', 'Chine', 'Émirats Arabes Unis', 'Maroc', 'Turquie']

const reglesInitiales = [
  { code: 'SEUIL_DEPOT', nom: 'Seuil déclaration dépôt', description: 'Dépôt supérieur à 5 000 000 FCFA déclenche une alerte informative', categorie: 'SEUIL', type: 'ALERTE', parametres: JSON.stringify({ seuil: 5000000, devise: 'XOF' }), priorite: 1 },
  { code: 'SEUIL_RETRAIT', nom: 'Seuil déclaration retrait', description: 'Retrait supérieur à 5 000 000 FCFA déclenche une alerte informative', categorie: 'SEUIL', type: 'ALERTE', parametres: JSON.stringify({ seuil: 5000000, devise: 'XOF' }), priorite: 1 },
  { code: 'SEUIL_BLOCAGE', nom: 'Seuil blocage transaction', description: 'Transaction supérieure à 10 000 000 FCFA bloque la transaction', categorie: 'SEUIL', type: 'BLOCAGE', parametres: JSON.stringify({ seuil: 10000000, devise: 'XOF' }), priorite: 5 },
  { code: 'STRUCTURING', nom: 'Structuration (smurfing)', description: 'Plusieurs transactions < seuil en 24h par même client', categorie: 'STRUCTURING', type: 'ALERTE', parametres: JSON.stringify({ nombre: 3, seuilUnitaire: 4000000, periheures: 24 }), priorite: 4 },
  { code: 'VELOCITY', nom: 'Vélocité transactions', description: 'Volume inhabituel de transactions en 7 jours', categorie: 'VELOCITY', type: 'ALERTE', parametres: JSON.stringify({ nombre: 15, jours: 7 }), priorite: 3 },
  { code: 'PAYS_RISQUE', nom: 'Transaction pays à risque', description: 'Transaction vers/depuis pays sous embargo', categorie: 'PAYS', type: 'BLOCAGE', parametres: JSON.stringify({ pays: paysRisqueEleve }), priorite: 5 },
  { code: 'PPE_DETECT', nom: 'Détection PPE', description: 'Client identifié comme Personne Politiquement Exposée', categorie: 'PPE', type: 'ALERTE', parametres: JSON.stringify({ action: 'VERIFICATION_OBLIGATOIRE' }), priorite: 4 },
  { code: 'PROFIL_INCOHERENT', nom: 'Profil incohérent', description: 'Transaction incohérente avec revenus déclarés', categorie: 'PROFIL', type: 'ALERTE', parametres: JSON.stringify({ ratioRevenu: 3 }), priorite: 3 },
  { code: 'SOLDE_GLOBAL', nom: 'Contrôle solde global', description: 'Solde global > 20 000 000 FCFA déclenche revue', categorie: 'SEUIL', type: 'ALERTE', parametres: JSON.stringify({ seuil: 20000000 }), priorite: 2 },
]

async function main() {
  console.log('🌱 Début du seed CIF Sentinel...')

  // 1. Règles de conformité
  console.log('📋 Création des règles de conformité...')
  await db.regleConformite.deleteMany()
  for (const regle of reglesInitiales) {
    await db.regleConformite.create({ data: regle as any })
  }

  // 2. Listes de sanctions / PPE
  console.log('📋 Création des listes PPE et Sanctions...')
  await db.listeSanction.deleteMany()
  for (const ppe of listePPE) {
    await db.listeSanction.create({ data: ppe as any })
  }
  for (const san of listeSanctions) {
    await db.listeSanction.create({ data: san as any })
  }

  // 3. Clients
  console.log('👥 Création des clients...')
  await db.client.deleteMany()
  const clientsCrees: any[] = []

  // Quelques clients PPE / à risque pour rendre les données vivantes
  const clientsSpeciaux = [
    { code: 'CLI-000001', nom: 'COMPAORE', prenom: 'Salif', profession: 'Commerçant', revenuMensuel: 850000, estPPE: true, detailsPPE: 'Parent proche d\'ancien président', niveauRisque: 'ELEVE', scoreRisque: 72 },
    { code: 'CLI-000002', nom: 'TOURE', prenom: 'Amadou', profession: 'Importateur', revenuMensuel: 1500000, estPPE: false, niveauRisque: 'ELEVE', scoreRisque: 85, sourceFonds: 'Commerce import' },
    { code: 'CLI-000003', nom: 'DIARRA', prenom: 'Aminata', profession: 'Restauratrice', revenuMensuel: 600000, estPPE: false, niveauRisque: 'MOYEN', scoreRisque: 48 },
    { code: 'CLI-000004', nom: 'KABORE', prenom: 'Issa', profession: 'Fonctionnaire', revenuMensuel: 320000, estPPE: false, niveauRisque: 'FAIBLE', scoreRisque: 12 },
    { code: 'CLI-000005', nom: 'GUEYE', prenom: 'Mariam', profession: 'Pharmacienne', revenuMensuel: 1200000, estPPE: true, detailsPPE: 'Épouse d\'un député sénégalais', niveauRisque: 'MOYEN', scoreRisque: 55 },
  ]

  for (const cs of clientsSpeciaux) {
    const client = await db.client.create({
      data: {
        ...cs,
        type: cs.nom === 'TOURE' ? 'HABITUEL' : 'PARTICULIER',
        civilite: cs.prenom === 'Aminata' || cs.prenom === 'Mariam' ? 'MME' : 'M',
        nationalite: 'Burkinabè',
        paysResidence: 'Burkina Faso',
        ville: 'Ouagadougou',
        adresse: `Secteur ${randomInt(1, 55)}, Ouagadougou`,
        telephone: `+226 6${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
        email: `${cs.prenom.toLowerCase()}.${cs.nom.toLowerCase()}@email.bf`,
        typePiece: 'CNI',
        numeroPiece: `B${randomInt(1000000, 9999999)}`,
        dateNaissance: `${randomInt(1965, 1995)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
        lieuNaissance: randomChoice(villes),
        dateDelivrance: '2022-03-15',
        dateExpiration: '2032-03-15',
        lieuDelivrance: 'Ouagadougou',
        sourceFonds: cs.sourceFonds || 'Activité professionnelle',
        origineFonds: 'Revenus professionnels',
        statut: 'ACTIF',
      } as any
    })
    clientsCrees.push(client)
  }

  // Clients générés aléatoirement
  for (let i = 6; i <= 48; i++) {
    const isM = Math.random() > 0.5
    const nom = randomChoice(nomsBurkinabe)
    const prenom = isM ? randomChoice(prenomsM) : randomChoice(prenomsF)
    const profession = randomChoice(professions)
    const revenu = randomFloat(80000, 2500000)
    const isOccasionnel = Math.random() < 0.15
    const scoreRisque = isOccasionnel ? randomInt(30, 80) : randomInt(5, 45)
    let niveauRisque = 'FAIBLE'
    if (scoreRisque >= 70) niveauRisque = 'ELEVE'
    else if (scoreRisque >= 40) niveauRisque = 'MOYEN'

    const client = await db.client.create({
      data: {
        code: `CLI-${String(i).padStart(6, '0')}`,
        type: isOccasionnel ? 'OCCASIONNEL' : 'PARTICULIER',
        civilite: isM ? 'M' : 'MME',
        nom,
        prenom,
        dateNaissance: `${randomInt(1965, 2005)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
        lieuNaissance: randomChoice(villes),
        nationalite: 'Burkinabè',
        paysResidence: 'Burkina Faso',
        ville: randomChoice(villes),
        adresse: `Secteur ${randomInt(1, 55)}, ${randomChoice(villes)}`,
        telephone: `+226 6${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
        email: `${prenom.toLowerCase()}.${nom.toLowerCase()}${i}@email.bf`,
        profession,
        employeur: Math.random() > 0.5 ? randomChoice(['Société Générale', 'ONATEL', 'SONABEL', 'Indépendant', 'Faso Métier']) : null,
        revenuMensuel: revenu,
        typePiece: randomChoice(['CNI', 'PASSEPORT', 'ATTESTATION']),
        numeroPiece: `${randomChoice(['B', 'P'])}${randomInt(1000000, 9999999)}`,
        dateDelivrance: `${randomInt(2018, 2024)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
        dateExpiration: `${randomInt(2026, 2034)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
        lieuDelivrance: 'Ouagadougou',
        estPPE: false,
        niveauRisque,
        scoreRisque,
        sourceFonds: 'Revenus professionnels',
        origineFonds: 'Activité salariée',
        statut: Math.random() < 0.05 ? 'BLOQUE' : 'ACTIF',
        estOccasionnel: isOccasionnel,
        occCategorie: isOccasionnel ? randomChoice(['VIREMENT', 'CHANGE', 'TRANSFERT']) : null,
      } as any
    })
    clientsCrees.push(client)
  }

  console.log(`✅ ${clientsCrees.length} clients créés`)

  // 4. Comptes
  console.log('💳 Création des comptes...')
  await db.compte.deleteMany()
  const comptesCrees: any[] = []
  for (const client of clientsCrees) {
    const nbComptes = client.type === 'OCCASIONNEL' ? 1 : randomInt(1, 3)
    for (let j = 0; j < nbComptes; j++) {
      const type = randomChoice(['EPARGNE', 'COURANT', 'DEPOT_TERME'])
      const solde = randomFloat(50000, 8500000)
      const compte = await db.compte.create({
        data: {
          numero: `CPT-${String(comptesCrees.length + 1).padStart(7, '0')}`,
          clientId: client.id,
          type,
          libelle: `${type === 'EPARGNE' ? 'Compte Épargne' : type === 'COURANT' ? 'Compte Courant' : 'Dépôt à Terme'} ${client.nom}`,
          solde,
          soldeBloque: client.statut === 'BLOQUE' ? solde : 0,
          devise: 'XOF',
          dateOuverture: `${randomInt(2019, 2025)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
          statut: client.statut === 'BLOQUE' ? 'BLOQUE' : 'ACTIF',
        } as any
      })
      comptesCrees.push(compte)
    }
  }
  console.log(`✅ ${comptesCrees.length} comptes créés`)

  // 5. Transactions
  console.log('💸 Création des transactions...')
  await db.transaction.deleteMany()
  const transactionsCrees: any[] = []
  const now = new Date()
  for (let i = 0; i < 220; i++) {
    const client = randomChoice(clientsCrees)
    const comptesClient = comptesCrees.filter(c => c.clientId === client.id)
    const compte = comptesClient.length > 0 ? randomChoice(comptesClient) : null
    const type = randomChoice(['DEPOT', 'RETRAIT', 'VIREMENT', 'CHANGE', 'TRANSFERT'])
    const sens = type === 'DEPOT' || type === 'VIREMENT' ? (Math.random() > 0.5 ? 'ENTREE' : 'SORTIE') : (type === 'RETRAIT' ? 'SORTIE' : 'ENTREE')

    // Montant: majorité normale, quelques importantes
    let montant: number
    const rand = Math.random()
    if (rand < 0.7) montant = randomFloat(5000, 2500000)
    else if (rand < 0.92) montant = randomFloat(2500000, 6000000)
    else montant = randomFloat(6000000, 15000000)

    const joursPasse = randomInt(0, 30)
    const date = new Date(now.getTime() - joursPasse * 86400000 - randomInt(0, 86400000))

    let statut = 'VALIDEE'
    let estSuspecte = false
    let motifSuspicion: string | null = null
    let scoreRisque = 0

    if (montant > 10000000) {
      statut = 'BLOQUEE'
      estSuspecte = true
      motifSuspicion = 'Dépassement seuil de blocage (10M FCFA)'
      scoreRisque = 90
    } else if (montant > 5000000) {
      statut = Math.random() < 0.3 ? 'SUSPECTE' : 'VALIDEE'
      if (statut === 'SUSPECTE') {
        estSuspecte = true
        motifSuspicion = 'Transaction au-dessus du seuil de déclaration'
        scoreRisque = 65
      }
    }

    const paysContre = Math.random() < 0.15 ? randomChoice(paysRisqueEleve) : (Math.random() < 0.3 ? randomChoice(paysInterface) : null)

    const transaction = await db.transaction.create({
      data: {
        reference: `TRX-${String(i + 1).padStart(7, '0')}`,
        clientId: client.id,
        compteId: compte?.id || null,
        type,
        sens,
        montant,
        devise: 'XOF',
        frais: montant * 0.001,
        date,
        statut,
        motifBlocage: statut === 'BLOQUEE' ? 'Dépassement seuil LBC' : null,
        contrepartie: type === 'VIREMENT' || type === 'TRANSFERT' ? randomChoice(nomsBurkinabe) + ' ' + randomChoice(prenomsM) : null,
        compteContre: type === 'VIREMENT' ? `CPT-${String(randomInt(1, 9999999)).padStart(7, '0')}` : null,
        paysContrepartie: paysContre,
        canal: randomChoice(['AGENCE', 'MOBILE', 'INTERNET', 'ATM']),
        agentId: `AGT-${randomInt(1, 12)}`,
        description: `${type} ${sens} - ${client.nom} ${client.prenom || ''}`,
        estSuspecte,
        motifSuspicion,
        scoreRisque,
      } as any
    })
    transactionsCrees.push(transaction)
  }
  console.log(`✅ ${transactionsCrees.length} transactions créées`)

  // 6. Alertes
  console.log('🚨 Création des alertes...')
  await db.alerte.deleteMany()
  const alertesCrees: any[] = []
  const transactionsSuspectes = transactionsCrees.filter(t => t.estSuspecte || t.statut === 'BLOQUEE' || t.statut === 'SUSPECTE')
  for (const trx of transactionsSuspectes) {
    const isBloquante = trx.statut === 'BLOQUEE'
    const categorie = trx.montant > 10000000 ? 'SEUIL' : (trx.paysContrepartie && paysRisqueEleve.includes(trx.paysContrepartie) ? 'PAYS_RISQUE' : 'PROFIL_INCOHERENT')
    const severite = trx.montant > 10000000 ? 'CRITIQUE' : (trx.montant > 7000000 ? 'ELEVEE' : 'MOYENNE')
    const alerte = await db.alerte.create({
      data: {
        reference: `ALT-${String(alertesCrees.length + 1).padStart(6, '0')}`,
        clientId: trx.clientId,
        transactionId: trx.id,
        type: isBloquante ? 'BLOQUANTE' : 'INFORMATIVE',
        categorie,
        severite,
        titre: isBloquante ? `Transaction bloquée - ${trx.reference}` : `Transaction suspecte - ${trx.reference}`,
        description: trx.motifSuspicion || `Montant ${trx.montant.toLocaleString('fr-FR')} FCFA sur transaction ${trx.type}`,
        montant: trx.montant,
        statut: randomChoice(['OUVERTE', 'OUVERTE', 'OUVERTE', 'EN_COURS', 'CLOTUREE']),
        assigneeA: Math.random() > 0.5 ? `Conformité ${randomInt(1, 3)}` : null,
        createdAt: trx.date,
      } as any
    })
    alertesCrees.push(alerte)
  }

  // Quelques alertes structuring / velocity
  for (let i = 0; i < 8; i++) {
    const client = randomChoice(clientsCrees)
    const alerte = await db.alerte.create({
      data: {
        reference: `ALT-${String(alertesCrees.length + 1).padStart(6, '0')}`,
        clientId: client.id,
        type: 'INFORMATIVE',
        categorie: randomChoice(['STRUCTURING', 'VELOCITY', 'PROFIL_INCOHERENT']),
        severite: randomChoice(['MOYENNE', 'ELEVEE']),
        titre: i % 2 === 0 ? 'Structuration suspectée (smurfing)' : 'Vélocité anormale de transactions',
        description: i % 2 === 0 ? `Client ${client.nom}: 4 dépôts < 4M FCFA en 24h` : `Client ${client.nom}: 18 transactions en 7 jours`,
        montant: randomFloat(12000000, 18000000),
        statut: randomChoice(['OUVERTE', 'EN_COURS', 'CLOTUREE']),
        assigneeA: 'Conformité 2',
        createdAt: new Date(now.getTime() - randomInt(1, 15) * 86400000),
      } as any
    })
    alertesCrees.push(alerte)
  }
  console.log(`✅ ${alertesCrees.length} alertes créées`)

  // 7. Screenings
  console.log('🔍 Création des screenings...')
  await db.screening.deleteMany()
  for (const client of clientsCrees.slice(0, 20)) {
    await db.screening.create({
      data: {
        clientId: client.id,
        nomRecherche: `${client.nom} ${client.prenom || ''}`,
        type: 'COMPLET',
        resultats: JSON.stringify({ matches: [] }),
        nombreMatch: client.estPPE ? 1 : 0,
        statut: client.estPPE ? 'MATCH_PARTIEL' : 'AUCUN_MATCH',
        details: client.estPPE ? `Match PPE: ${client.detailsPPE}` : 'Aucun match trouvé',
        operateur: 'Système automatique',
        createdAt: new Date(now.getTime() - randomInt(1, 60) * 86400000),
      } as any
    })
  }

  // 8. Paramètres système
  console.log('⚙️ Création des paramètres système...')
  await db.parametre.deleteMany()
  const params = [
    { cle: 'SEUIL_DECLARATION_TRA', valeur: '5000000', description: 'Seuil de déclaration de transaction (FCFA)' },
    { cle: 'SEUIL_BLOCAGE', valeur: '10000000', description: 'Seuil de blocage automatique (FCFA)' },
    { cle: 'SEUIL_SOLDE_GLOBAL', valeur: '20000000', description: 'Seuil revue solde global (FCFA)' },
    { cle: 'PERIODE_STRUCTURE', valeur: '24', description: 'Période détection structuration (heures)' },
    { cle: 'NOMBRE_MAX_TRANSACTIONS_JOUR', valeur: '5', description: 'Nombre max transactions par jour avant alerte' },
    { cle: 'INSTITUTION_NOM', valeur: 'CIF - COOP-CA', description: 'Nom de l\'institution' },
    { cle: 'INSTITUTION_IFU', valeur: '00019733Z', description: 'Numéro IFU institution' },
    { cle: 'DEVISE', valeur: 'XOF', description: 'Devise principale (FCFA)' },
  ]
  for (const p of params) {
    await db.parametre.create({ data: p })
  }

  // 9. Audit logs initiaux
  console.log('📝 Création des logs d\'audit...')
  await db.auditLog.deleteMany()
  const actions = ['CONNEXION', 'CREATION_CLIENT', 'MODIFICATION_CLIENT', 'TRAITEMENT_ALERTE', 'SCREENING', 'GENERATION_RAPPORT', 'BLOCAGE_CLIENT']
  for (let i = 0; i < 30; i++) {
    await db.auditLog.create({
      data: {
        action: randomChoice(actions),
        module: randomChoice(['CLIENTS', 'TRANSACTIONS', 'ALERTES', 'SCREENING', 'RAPPORTS']),
        entite: randomChoice(['Client', 'Transaction', 'Alerte']),
        entiteId: randomChoice(clientsCrees).id,
        utilisateur: randomChoice(['admin@cif.bf', 'conformite1@cif.bf', 'conformite2@cif.bf', 'agent3@cif.bf']),
        details: 'Action système',
        ip: `192.168.1.${randomInt(1, 254)}`,
        createdAt: new Date(now.getTime() - randomInt(1, 7) * 86400000),
      }
    })
  }

  console.log('\n🎉 Seed terminé avec succès!')
  console.log(`   - ${clientsCrees.length} clients`)
  console.log(`   - ${comptesCrees.length} comptes`)
  console.log(`   - ${transactionsCrees.length} transactions`)
  console.log(`   - ${alertesCrees.length} alertes`)
  console.log(`   - ${listePPE.length + listeSanctions.length} entrées sanctions/PPE`)
  console.log(`   - ${reglesInitiales.length} règles de conformité`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
