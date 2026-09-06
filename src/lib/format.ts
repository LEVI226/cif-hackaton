// Utilitaires de formatage et helpers communs

export function formatFCFA(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' FCFA'
}

export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)
}

export function formatCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  if (Math.abs(amount) >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'B'
  if (Math.abs(amount) >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(amount) >= 1_000) return (amount / 1_000).toFixed(0) + 'K'
  return String(amount)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return `il y a ${seconds}s`
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)}min`
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `il y a ${Math.floor(seconds / 86400)}j`
  return formatDate(d)
}

export const RISK_COLORS: Record<string, string> = {
  FAIBLE: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  MOYEN: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  ELEVE: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  PROHIBITIF: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
}

export const SEVERITE_COLORS: Record<string, string> = {
  INFO: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300',
  FAIBLE: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
  MOYENNE: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
  ELEVEE: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
  CRITIQUE: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300',
}

export const STATUT_COLORS: Record<string, string> = {
  ACTIF: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
  BLOQUE: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300',
  SUSPENDU: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
  INACTIF: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
  VALIDEE: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
  BLOQUEE: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300',
  SUSPECTE: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
  EN_ATTENTE: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300',
  REJETEE: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
  OUVERTE: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300',
  EN_COURS: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
  ESCALADEE: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
  CLOTUREE: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
}

export const STATUT_LABELS: Record<string, string> = {
  ACTIF: 'Actif',
  BLOQUE: 'Bloqué',
  SUSPENDU: 'Suspendu',
  INACTIF: 'Inactif',
  VALIDEE: 'Validée',
  BLOQUEE: 'Bloquée',
  SUSPECTE: 'Suspecte',
  EN_ATTENTE: 'En attente',
  REJETEE: 'Rejetée',
  OUVERTE: 'Ouverte',
  EN_COURS: 'En cours',
  ESCALADEE: 'Escaladée',
  CLOTUREE: 'Clôturée',
}

export const RISK_LABELS: Record<string, string> = {
  FAIBLE: 'Faible',
  MOYEN: 'Moyen',
  ELEVE: 'Élevé',
  PROHIBITIF: 'Prohibitif',
}

export const TYPE_TRANSACTION_LABELS: Record<string, string> = {
  DEPOT: 'Dépôt',
  RETRAIT: 'Retrait',
  VIREMENT: 'Virement',
  CHANGE: 'Change',
  TRANSFERT: 'Transfert',
  CREDIT: 'Crédit',
  DEBIT: 'Débit',
}

export const CATEGORIE_ALERTE_LABELS: Record<string, string> = {
  SEUIL: 'Dépassement seuil',
  PPE: 'Personne Politiquement Exposée',
  SANCTIONS: 'Liste de sanctions',
  STRUCTURING: 'Structuration (smurfing)',
  VELOCITY: 'Vélocité anormale',
  PAYS_RISQUE: 'Pays à risque',
  PROFIL_INCOHERENT: 'Profil incohérent',
  DOCUMENT: 'Document manquant',
}
