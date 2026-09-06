'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SeveriteBadge, StatutBadge, TypeBadge } from '@/components/shared/badges'
import { formatFCFA, formatNumber, formatDateTime, timeAgo, CATEGORIE_ALERTE_LABELS } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Search, Bell, Filter, AlertTriangle, Ban, CheckCircle2, Clock,
  X, ChevronRight, Eye, ShieldAlert, ShieldX, Zap, TrendingUp,
  FileText, MessageSquare, ArrowUpCircle
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIAnalyse } from '@/components/shared/ai-analyse'

export function AlertesView() {
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('OUVERTE')
  const [filtreType, setFiltreType] = useState('')
  const [filtreSeverite, setFiltreSeverite] = useState('')
  const selectedAlerteId = useAppStore((s) => s.selectedAlerteId)
  const setAlerteId = useAppStore((s) => s.setAlerteId)

  const { data, isLoading } = useQuery({
    queryKey: ['alertes', search, filtreStatut, filtreType, filtreSeverite],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (search) params.set('q', search)
      if (filtreStatut) params.set('statut', filtreStatut)
      if (filtreType) params.set('type', filtreType)
      if (filtreSeverite) params.set('severite', filtreSeverite)
      const r = await fetch(`/api/alertes?${params}`)
      return r.json()
    },
    refetchInterval: 20_000,
  })

  const alertes = data?.data || []
  const nbBloquantes = alertes.filter((a: any) => a.type === 'BLOQUANTE').length
  const nbCritiques = alertes.filter((a: any) => a.severite === 'CRITIQUE').length

  if (selectedAlerteId) {
    return <AlerteDetail alerteId={selectedAlerteId} onClose={() => setAlerteId(null)} />
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Bell className="w-3.5 h-3.5" /> Total</div>
          <div className="text-xl font-bold mt-1">{formatNumber(data?.total || 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Ban className="w-3.5 h-3.5" /> Bloquantes</div>
          <div className="text-xl font-bold mt-1 text-red-600">{nbBloquantes}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldAlert className="w-3.5 h-3.5" /> Critiques</div>
          <div className="text-xl font-bold mt-1 text-orange-600">{nbCritiques}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Clock className="w-3.5 h-3.5" /> En attente</div>
          <div className="text-xl font-bold mt-1 text-amber-600">{alertes.filter((a: any) => a.statut === 'OUVERTE').length}</div>
        </Card>
      </div>

      {/* Onglets statut */}
      <Tabs value={filtreStatut} onValueChange={setFiltreStatut}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="OUVERTE" className="gap-1.5"><Bell className="w-3.5 h-3.5" /> Ouvertes</TabsTrigger>
          <TabsTrigger value="EN_COURS" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> En cours</TabsTrigger>
          <TabsTrigger value="ESCALADEE" className="gap-1.5"><ArrowUpCircle className="w-3.5 h-3.5" /> Escaladées</TabsTrigger>
          <TabsTrigger value="CLOTUREE" className="gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Clôturées</TabsTrigger>
          <TabsTrigger value="" className="gap-1.5">Toutes</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par titre, client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={filtreType} onValueChange={setFiltreType}>
          <SelectTrigger className="w-full md:w-44 h-10"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="BLOQUANTE">Bloquante</SelectItem>
            <SelectItem value="INFORMATIVE">Informative</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtreSeverite} onValueChange={setFiltreSeverite}>
          <SelectTrigger className="w-full md:w-44 h-10"><SelectValue placeholder="Sévérité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="INFO">Info</SelectItem>
            <SelectItem value="FAIBLE">Faible</SelectItem>
            <SelectItem value="MOYENNE">Moyenne</SelectItem>
            <SelectItem value="ELEVEE">Élevée</SelectItem>
            <SelectItem value="CRITIQUE">Critique</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)
        ) : alertes.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
            <div className="font-medium">Aucune alerte dans cette catégorie</div>
          </CardContent></Card>
        ) : (
          alertes.map((a: any) => (
            <Card
              key={a.id}
              onClick={() => setAlerteId(a.id)}
              className={cn(
                'cursor-pointer hover:shadow-md transition-all group',
                a.type === 'BLOQUANTE' && a.statut === 'OUVERTE' && 'border-red-300 dark:border-red-800',
                a.severite === 'CRITIQUE' && a.statut === 'OUVERTE' && 'pulse-alert'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    a.type === 'BLOQUANTE' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-sky-100 dark:bg-sky-950/40'
                  )}>
                    {a.type === 'BLOQUANTE' ? <Ban className="w-5 h-5 text-red-600" /> : <Bell className="w-5 h-5 text-sky-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <TypeBadge type={a.type} />
                      <SeveriteBadge severite={a.severite} />
                      <StatutBadge statut={a.statut} />
                      <Badge variant="outline" className="text-[10px]">{CATEGORIE_ALERTE_LABELS[a.categorie] || a.categorie}</Badge>
                      <span className="text-[11px] text-muted-foreground ml-auto">{timeAgo(a.createdAt)}</span>
                    </div>
                    <div className="font-semibold text-sm line-clamp-1">{a.titre}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.description}</div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      {a.client && <span>👤 {a.client.nom} {a.client.prenom}</span>}
                      {a.transaction && <span>💱 {a.transaction.reference}</span>}
                      {a.montant && <span className="font-semibold text-foreground">{formatFCFA(a.montant)}</span>}
                      {a.assigneeA && <span>👤 {a.assigneeA}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function AlerteDetail({ alerteId, onClose }: { alerteId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [showTreat, setShowTreat] = useState(false)
  const [action, setAction] = useState<'prendre' | 'escalader' | 'cloturer' | 'rejeter'>('cloturer')

  const { data: alerte, isLoading } = useQuery({
    queryKey: ['alerte', alerteId],
    queryFn: async () => {
      const r = await fetch(`/api/alertes/${alerteId}`)
      return r.json()
    },
  })

  async function handleTreat(action: string, commentaire: string, motifCloture: string) {
    const r = await fetch(`/api/alertes/${alerteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, commentaire, motifCloture, traitePar: 'Resp. Conformité' }),
    })
    if (r.ok) {
      toast.success('Alerte traitée avec succès')
      qc.invalidateQueries({ queryKey: ['alerte', alerteId] })
      qc.invalidateQueries({ queryKey: ['alertes'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setShowTreat(false)
    }
  }

  if (isLoading || !alerte) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}</div>
  }

  const trx = alerte.transaction
  const client = alerte.client

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>← Retour</Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={alerte.type} />
            <SeveriteBadge severite={alerte.severite} />
            <StatutBadge statut={alerte.statut} />
            <Badge variant="outline" className="text-xs">{CATEGORIE_ALERTE_LABELS[alerte.categorie] || alerte.categorie}</Badge>
            <span className="font-mono text-xs text-muted-foreground ml-auto">{alerte.reference}</span>
          </div>
          <h2 className="text-xl font-bold mt-2">{alerte.titre}</h2>
          <p className="text-sm text-muted-foreground mt-1">{alerte.description}</p>
        </div>
      </div>

      {/* Détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Détails de l'alerte</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm pt-2">
            <Row label="Référence" value={alerte.reference} />
            <Row label="Type" value={alerte.type === 'BLOQUANTE' ? 'Bloquante' : 'Informative'} />
            <Row label="Catégorie" value={CATEGORIE_ALERTE_LABELS[alerte.categorie] || alerte.categorie} />
            <Row label="Sévérité" value={alerte.severite} />
            <Row label="Montant" value={alerte.montant ? formatFCFA(alerte.montant) : '—'} />
            <Row label="Créée le" value={formatDateTime(alerte.createdAt)} />
            <Row label="Assignée à" value={alerte.assigneeA || 'Non assignée'} />
            <Row label="Traité par" value={alerte.traiteePar || '—'} />
            {alerte.dateTraitement && <Row label="Date traitement" value={formatDateTime(alerte.dateTraitement)} />}
          </CardContent>
        </Card>

        {client && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4" /> Client concerné</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm pt-2">
              <Row label="Nom" value={`${client.nom} ${client.prenom || ''}`} />
              <Row label="Code" value={client.code} />
              <Row label="Niveau risque" value={client.niveauRisque} />
              <Row label="PPE" value={client.estPPE ? 'Oui' : 'Non'} />
              <Row label="Téléphone" value={client.telephone || '—'} />
              <Row label="Ville" value={client.ville || '—'} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction associée */}
      {trx && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4" /> Transaction associée</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm pt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Row label="Référence" value={trx.reference} />
              <Row label="Type" value={trx.type} />
              <Row label="Montant" value={formatFCFA(trx.montant)} />
              <Row label="Statut" value={trx.statut} />
              <Row label="Canal" value={trx.canal} />
              <Row label="Sens" value={trx.sens} />
              {trx.paysContrepartie && <Row label="Pays contrepartie" value={trx.paysContrepartie} />}
              <Row label="Date" value={formatDateTime(trx.date)} />
            </div>
            {trx.motifBlocage && (
              <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300">
                <Ban className="w-3.5 h-3.5 inline mr-1" /> Motif du blocage: {trx.motifBlocage}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      <AIAnalyse type="alerte" id={alerte.id} title="Analyse IA de l'alerte" description="Recommandation de traitement par intelligence artificielle" />

      {/* Actions */}
      {alerte.statut !== 'CLOTUREE' && alerte.statut !== 'REJETEE' && (
        <div className="flex flex-wrap gap-2">
          {alerte.statut === 'OUVERTE' && (
            <Button variant="outline" onClick={() => { setAction('prendre'); setShowTreat(true) }} className="gap-2">
              <Clock className="w-4 h-4" /> Prendre en charge
            </Button>
          )}
          <Button variant="outline" onClick={() => { setAction('escalader'); setShowTreat(true) }} className="gap-2">
            <ArrowUpCircle className="w-4 h-4" /> Escalader
          </Button>
          <Button variant="destructive" onClick={() => { setAction('rejeter'); setShowTreat(true) }} className="gap-2">
            <X className="w-4 h-4" /> Rejeter
          </Button>
          <Button onClick={() => { setAction('cloturer'); setShowTreat(true) }} className="gap-2">
            <CheckCircle2 className="w-4 h-4" /> Clôturer
          </Button>
        </div>
      )}

      {showTreat && (
        <TreatDialog action={action} onClose={() => setShowTreat(false)} onConfirm={(c, m) => handleTreat(action, c, m)} />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-sm text-right">{value}</span>
    </div>
  )
}

function TreatDialog({ action, onClose, onConfirm }: {
  action: 'prendre' | 'escalader' | 'cloturer' | 'rejeter'
  onClose: () => void
  onConfirm: (commentaire: string, motifCloture: string) => void
}) {
  const [commentaire, setCommentaire] = useState('')
  const [motif, setMotif] = useState('')
  const labels = {
    prendre: { title: 'Prendre en charge', icon: Clock, color: 'default' },
    escalader: { title: 'Escalader l\'alerte', icon: ArrowUpCircle, color: 'outline' },
    cloturer: { title: 'Clôturer l\'alerte', icon: CheckCircle2, color: 'default' },
    rejeter: { title: 'Rejeter l\'alerte', icon: X, color: 'destructive' },
  }
  const l = labels[action]
  const Icon = l.icon
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Icon className="w-5 h-5" /> {l.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Commentaire</Label>
            <Textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Décrivez votre analyse et votre décision..."
              rows={4}
            />
          </div>
          {(action === 'cloturer' || action === 'rejeter') && (
            <div className="space-y-1">
              <Label>Motif {action === 'cloturer' ? 'de clôture' : 'de rejet'}</Label>
              <Textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder={action === 'cloturer' ? 'Ex: Faux positif confirmé, documents vérifiés...' : 'Ex: Alerte sans fondement, erreur système...'}
                rows={2}
              />
            </div>
          )}
          {action === 'cloturer' && (
            <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg">
              ✓ La clôture d'une alerte bloquante débloquera automatiquement la transaction associée.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant={l.color as any} onClick={() => onConfirm(commentaire, motif)}>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
