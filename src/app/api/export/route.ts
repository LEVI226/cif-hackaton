import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function toCSV(data: any[], columns: Array<{ key: string; label: string; format?: (v: any, row: any) => string }>): string {
  const header = columns.map(c => `"${c.label}"`).join(';')
  const rows = data.map(row =>
    columns.map(c => {
      const val = c.format ? c.format(row[c.key], row) : row[c.key]
      const str = val === null || val === undefined ? '' : String(val).replace(/"/g, '""')
      return `"${str}"`
    }).join(';')
  )
  return [header, ...rows].join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'clients'

    let csv = ''
    let filename = ''

    if (type === 'clients') {
      const clients = await db.client.findMany({
        include: { comptes: true, _count: { select: { alertes: true, transactions: true } } },
        orderBy: { createdAt: 'desc' },
      })
      csv = toCSV(clients, [
        { key: 'code', label: 'Code Client' },
        { key: 'nom', label: 'Nom' },
        { key: 'prenom', label: 'Prénom' },
        { key: 'type', label: 'Type' },
        { key: 'profession', label: 'Profession' },
        { key: 'telephone', label: 'Téléphone' },
        { key: 'email', label: 'Email' },
        { key: 'ville', label: 'Ville' },
        { key: 'nationalite', label: 'Nationalité' },
        { key: 'niveauRisque', label: 'Niveau Risque' },
        { key: 'scoreRisque', label: 'Score Risque' },
        { key: 'estPPE', label: 'PPE', format: (v) => v ? 'Oui' : 'Non' },
        { key: 'estOccasionnel', label: 'Occasionnel', format: (v) => v ? 'Oui' : 'Non' },
        { key: 'statut', label: 'Statut' },
        { key: 'solde', label: 'Solde Global', format: (_, row) => String(row.comptes?.reduce((s, c) => s + c.solde, 0) || 0) },
        { key: 'comptes', label: 'Nb Comptes', format: (_, row) => String(row.comptes?.length || 0) },
        { key: '_count', label: 'Nb Transactions', format: (_, row) => String(row._count?.transactions || 0) },
        { key: '_count', label: 'Nb Alertes', format: (_, row) => String(row._count?.alertes || 0) },
        { key: 'createdAt', label: 'Date création', format: (v) => new Date(v).toLocaleDateString('fr-FR') },
      ])
      filename = `clients_cif_${new Date().toISOString().slice(0, 10)}.csv`
    } else if (type === 'transactions') {
      const transactions = await db.transaction.findMany({
        include: { client: { select: { nom: true, prenom: true, code: true } } },
        orderBy: { date: 'desc' },
        take: 500,
      })
      csv = toCSV(transactions, [
        { key: 'reference', label: 'Référence' },
        { key: 'date', label: 'Date', format: (v) => new Date(v).toLocaleString('fr-FR') },
        { key: 'type', label: 'Type' },
        { key: 'sens', label: 'Sens' },
        { key: 'montant', label: 'Montant (FCFA)' },
        { key: 'frais', label: 'Frais (FCFA)' },
        { key: 'statut', label: 'Statut' },
        { key: 'estSuspecte', label: 'Suspecte', format: (v) => v ? 'Oui' : 'Non' },
        { key: 'motifSuspicion', label: 'Motif Suspicion' },
        { key: 'paysContrepartie', label: 'Pays Contrepartie' },
        { key: 'canal', label: 'Canal' },
        { key: 'client', label: 'Client', format: (_, row) => `${row.client?.nom || ''} ${row.client?.prenom || ''}` },
        { key: 'client', label: 'Code Client', format: (_, row) => row.client?.code || '' },
        { key: 'scoreRisque', label: 'Score Risque' },
      ])
      filename = `transactions_cif_${new Date().toISOString().slice(0, 10)}.csv`
    } else if (type === 'alertes') {
      const alertes = await db.alerte.findMany({
        include: { client: { select: { nom: true, prenom: true, code: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      csv = toCSV(alertes, [
        { key: 'reference', label: 'Référence' },
        { key: 'createdAt', label: 'Date', format: (v) => new Date(v).toLocaleString('fr-FR') },
        { key: 'type', label: 'Type' },
        { key: 'categorie', label: 'Catégorie' },
        { key: 'severite', label: 'Sévérité' },
        { key: 'titre', label: 'Titre' },
        { key: 'description', label: 'Description' },
        { key: 'montant', label: 'Montant' },
        { key: 'statut', label: 'Statut' },
        { key: 'assigneeA', label: 'Assignée à' },
        { key: 'traiteePar', label: 'Traité par' },
        { key: 'dateTraitement', label: 'Date traitement', format: (v) => v ? new Date(v).toLocaleString('fr-FR') : '' },
        { key: 'motifCloture', label: 'Motif clôture' },
        { key: 'client', label: 'Client', format: (_, row) => `${row.client?.nom || ''} ${row.client?.prenom || ''}` },
      ])
      filename = `alertes_cif_${new Date().toISOString().slice(0, 10)}.csv`
    } else if (type === 'screenings') {
      const screenings = await db.screening.findMany({
        include: { client: { select: { nom: true, prenom: true, code: true } } },
        orderBy: { createdAt: 'desc' },
      })
      csv = toCSV(screenings, [
        { key: 'createdAt', label: 'Date', format: (v) => new Date(v).toLocaleString('fr-FR') },
        { key: 'nomRecherche', label: 'Nom recherché' },
        { key: 'type', label: 'Type screening' },
        { key: 'nombreMatch', label: 'Nombre de matchs' },
        { key: 'statut', label: 'Résultat' },
        { key: 'details', label: 'Détails' },
        { key: 'operateur', label: 'Opérateur' },
        { key: 'client', label: 'Code Client', format: (_, row) => row.client?.code || '' },
      ])
      filename = `screenings_cif_${new Date().toISOString().slice(0, 10)}.csv`
    } else if (type === 'audit') {
      const logs = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })
      csv = toCSV(logs, [
        { key: 'createdAt', label: 'Date', format: (v) => new Date(v).toLocaleString('fr-FR') },
        { key: 'action', label: 'Action' },
        { key: 'module', label: 'Module' },
        { key: 'entite', label: 'Entité' },
        { key: 'entiteId', label: 'ID Entité' },
        { key: 'utilisateur', label: 'Utilisateur' },
        { key: 'details', label: 'Détails' },
        { key: 'ip', label: 'IP' },
      ])
      filename = `audit_cif_${new Date().toISOString().slice(0, 10)}.csv`
    }

    return new NextResponse('\ufeff' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
