'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatutBadge, RiskBadge } from '@/components/shared/badges'
import { formatFCFA, formatNumber, formatDateTime, timeAgo, TYPE_TRANSACTION_LABELS } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Search, ArrowLeftRight, ArrowUpRight, ArrowDownRight, Filter, Pause, Play,
  AlertTriangle, Ban, CheckCircle2, Radio, Plus, X, Eye, Globe2, Zap, Download
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function TransactionsView() {
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreType, setFiltreType] = useState('')
  const [filtreSuspecte, setFiltreSuspecte] = useState(false)
  const [live, setLive] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const setTransactionId = useAppStore((s) => s.setTransactionId)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', search, filtreStatut, filtreType, filtreSuspecte],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (search) params.set('q', search)
      if (filtreStatut) params.set('statut', filtreStatut)
      if (filtreType) params.set('type', filtreType)
      if (filtreSuspecte) params.set('estSuspecte', 'true')
      const r = await fetch(`/api/transactions?${params}`)
      return r.json()
    },
    refetchInterval: live ? 8000 : false,
  })

  const transactions = data?.data || []

  // Stats
  const totalMontant = transactions.reduce((s: number, t: any) => s + t.montant, 0)
  const nbBloquees = transactions.filter((t: any) => t.statut === 'BLOQUEE').length
  const nbSuspectes = transactions.filter((t: any) => t.estSuspecte).length

  return (
    <div className="space-y-4">
      {/* Bandeau live */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold',
            live ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground')}>
            <span className={cn('w-2 h-2 rounded-full', live ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400')} />
            {live ? 'Monitoring en direct' : 'Monitoring en pause'}
          </div>
          <span className="text-xs text-muted-foreground">Actualisation toutes les 8s</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setLive(!live)} className="gap-2">
            {live ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Reprendre</>}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nouvelle transaction
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><ArrowLeftRight className="w-3.5 h-3.5" /> Transactions</div>
          <div className="text-xl font-bold mt-1">{formatNumber(data?.total || 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Zap className="w-3.5 h-3.5" /> Volume total</div>
          <div className="text-xl font-bold mt-1">{formatFCFA(totalMontant)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Ban className="w-3.5 h-3.5" /> Bloquées</div>
          <div className="text-xl font-bold mt-1 text-red-600">{nbBloquees}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><AlertTriangle className="w-3.5 h-3.5" /> Suspectes</div>
          <div className="text-xl font-bold mt-1 text-amber-600">{nbSuspectes}</div>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par référence, client, contrepartie..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={filtreStatut} onValueChange={setFiltreStatut}>
          <SelectTrigger className="w-full md:w-40 h-10"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="VALIDEE">Validée</SelectItem>
            <SelectItem value="BLOQUEE">Bloquée</SelectItem>
            <SelectItem value="SUSPECTE">Suspecte</SelectItem>
            <SelectItem value="EN_ATTENTE">En attente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtreType} onValueChange={setFiltreType}>
          <SelectTrigger className="w-full md:w-40 h-10"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="DEPOT">Dépôt</SelectItem>
            <SelectItem value="RETRAIT">Retrait</SelectItem>
            <SelectItem value="VIREMENT">Virement</SelectItem>
            <SelectItem value="CHANGE">Change</SelectItem>
            <SelectItem value="TRANSFERT">Transfert</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={filtreSuspecte ? 'default' : 'outline'} onClick={() => setFiltreSuspecte(!filtreSuspecte)} className="h-10 gap-2">
          <AlertTriangle className="w-4 h-4" /> Suspectes
        </Button>
        <Button variant="outline" onClick={() => window.open('/api/export?type=transactions', '_blank')} className="h-10 gap-2">
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Transaction</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Client</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Montant</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Canal</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Alertes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 skeleton-shimmer rounded" /></td></tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Aucune transaction</td></tr>
                ) : (
                  transactions.map((t: any) => (
                    <tr
                      key={t.id}
                      onClick={() => setTransactionId(t.id)}
                      className={cn('hover:bg-accent/30 transition-colors cursor-pointer group', t.estSuspecte && 'bg-amber-50/40 dark:bg-amber-950/10')}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-medium">{t.reference}</div>
                        <div className="text-[11px] text-muted-foreground">{formatDateTime(t.date)}</div>
                        {t.paysContrepartie && (
                          <div className="text-[10px] flex items-center gap-1 text-muted-foreground mt-0.5">
                            <Globe2 className="w-3 h-3" /> {t.paysContrepartie}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="font-medium text-xs">{t.client?.nom} {t.client?.prenom}</div>
                        <div className="text-[11px] text-muted-foreground">{t.client?.code}</div>
                        {t.client?.estPPE && <Badge variant="outline" className="text-[9px] h-4 px-1 mt-0.5 bg-purple-50 text-purple-700">PPE</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {t.sens === 'ENTREE' ? <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />}
                          <Badge variant="outline" className="text-xs">{TYPE_TRANSACTION_LABELS[t.type] || t.type}</Badge>
                        </div>
                      </td>
                      <td className={cn('px-4 py-3 text-right font-semibold tabular-nums', t.sens === 'ENTREE' ? 'text-emerald-600' : 'text-red-600')}>
                        {t.sens === 'ENTREE' ? '+' : '-'}{formatFCFA(t.montant)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell"><span className="text-xs text-muted-foreground">{t.canal}</span></td>
                      <td className="px-4 py-3"><StatutBadge statut={t.statut} /></td>
                      <td className="px-4 py-3 text-right">
                        {t._count?.alertes > 0 ? (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300">
                            {t._count.alertes} alerte(s)
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showCreate && <CreateTransactionDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function CreateTransactionDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({
    clientId: '', type: 'DEPOT', sens: 'ENTREE', montant: '',
    paysContrepartie: '', canal: 'AGENCE', contrepartie: '', description: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    fetch('/api/clients?limit=100').then(r => r.json()).then(d => setClients(d.data || []))
  }, [])

  async function handleSubmit() {
    setLoading(true)
    try {
      const r = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          montant: parseFloat(form.montant),
        }),
      })
      const j = await r.json()
      if (r.ok) {
        setResult(j)
        toast.success(j.bloquee ? 'Transaction bloquée par les règles' : 'Transaction validée')
        qc.invalidateQueries({ queryKey: ['transactions'] })
      } else {
        toast.error(j.error || 'Erreur')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Nouvelle transaction</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="space-y-3 py-2">
            <div className={cn('rounded-lg p-4 border', result.bloquee ? 'border-red-200 bg-red-50 dark:bg-red-950/30' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30')}>
              <div className="flex items-center gap-2 mb-2">
                {result.bloquee ? <Ban className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                <span className="font-semibold">{result.bloquee ? 'Transaction BLOQUÉE' : 'Transaction VALIDÉE'}</span>
              </div>
              <div className="text-sm space-y-1">
                <div>Référence: <span className="font-mono">{result.transaction.reference}</span></div>
                <div>Montant: <span className="font-semibold">{formatFCFA(result.transaction.montant)}</span></div>
                <div>Score de risque: <span className="font-semibold">{result.transaction.scoreRisque}/100</span></div>
                <div>Alertes générées: <span className="font-semibold">{result.alertesGenerees}</span></div>
              </div>
            </div>
            {result.resultats?.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Règles déclenchées:</div>
                {result.resultats.map((r: any, i: number) => (
                  <div key={i} className={cn('rounded-lg border p-2.5 text-xs', r.type === 'BLOQUANTE' ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50')}>
                    <div className="font-medium">{r.titre}</div>
                    <div className="text-muted-foreground mt-0.5">{r.description}</div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={onClose}>Fermer</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Client *</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} · {c.nom} {c.prenom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOT">Dépôt</SelectItem>
                    <SelectItem value="RETRAIT">Retrait</SelectItem>
                    <SelectItem value="VIREMENT">Virement</SelectItem>
                    <SelectItem value="CHANGE">Change</SelectItem>
                    <SelectItem value="TRANSFERT">Transfert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sens *</Label>
                <Select value={form.sens} onValueChange={(v) => setForm({ ...form, sens: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTREE">Entrée</SelectItem>
                    <SelectItem value="SORTIE">Sortie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Montant (FCFA) *</Label>
                <Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} className="h-9" placeholder="Ex: 5000000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Canal</Label>
                <Select value={form.canal} onValueChange={(v) => setForm({ ...form, canal: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENCE">Agence</SelectItem>
                    <SelectItem value="MOBILE">Mobile</SelectItem>
                    <SelectItem value="INTERNET">Internet</SelectItem>
                    <SelectItem value="ATM">ATM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pays contrepartie</Label>
                <Input value={form.paysContrepartie} onChange={(e) => setForm({ ...form, paysContrepartie: e.target.value })} className="h-9" placeholder="Ex: Mali" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-9" />
              </div>
              <div className="col-span-2 text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg">
                ℹ La transaction sera automatiquement évaluée par le moteur de règles LBC/FT/FP. Les alertes appropriées seront générées.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={loading || !form.clientId || !form.montant}>
                {loading ? 'Traitement...' : 'Soumettre'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
