'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Search, ShieldCheck, ShieldAlert, Scan, Database, Globe2,
  CheckCircle2, AlertTriangle, XCircle, FileSearch, Users, Plus
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BatchScreening } from '@/components/shared/batch-screening'

export function ScreeningView() {
  const [tab, setTab] = useState('screening')
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="screening" className="gap-1.5"><Search className="w-3.5 h-3.5" /> Screening</TabsTrigger>
        <TabsTrigger value="batch" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Lot</TabsTrigger>
        <TabsTrigger value="listes" className="gap-1.5"><Database className="w-3.5 h-3.5" /> Listes PPE & Sanctions</TabsTrigger>
        <TabsTrigger value="historique" className="gap-1.5"><FileSearch className="w-3.5 h-3.5" /> Historique</TabsTrigger>
      </TabsList>
      <TabsContent value="screening"><ScreeningForm /></TabsContent>
      <TabsContent value="batch"><BatchScreening /></TabsContent>
      <TabsContent value="listes"><ListesView /></TabsContent>
      <TabsContent value="historique"><HistoriqueView /></TabsContent>
    </Tabs>
  )
}

function ScreeningForm() {
  const qc = useQueryClient()
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [type, setType] = useState('COMPLET')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function handleScreen() {
    if (!nom.trim()) { toast.error('Veuillez saisir un nom'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, prenom, type }),
      })
      const j = await r.json()
      if (r.ok) {
        setResult(j)
        toast.success(j.matches.length > 0 ? `${j.matches.length} match(s) trouvé(s)` : 'Aucun match')
        qc.invalidateQueries({ queryKey: ['screenings'] })
      } else {
        toast.error('Erreur lors du screening')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Scan className="w-5 h-5 text-primary" /> Screening PPE & Sanctions</CardTitle>
          <CardDescription className="text-xs">Vérifiez un nom contre les listes de Personnes Politiquement Exposées et de sanctions (OFAC, ONU, UE, BCEAO, UEMOA)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nom *</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value.toUpperCase())} placeholder="Ex: COMPAORE" className="h-10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prénom</Label>
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex: Blaise" className="h-10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type de screening</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLET">Complet (PPE + Sanctions)</SelectItem>
                  <SelectItem value="PPE">PPE uniquement</SelectItem>
                  <SelectItem value="SANCTIONS">Sanctions uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleScreen} disabled={loading || !nom.trim()} className="w-full gap-2 h-10">
            {loading ? <><Search className="w-4 h-4 animate-spin" /> Screening en cours...</> : <><ShieldCheck className="w-4 h-4" /> Lancer le screening</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="animate-slide-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {result.matches.length === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
              Résultats du screening
            </CardTitle>
            <CardDescription className="text-xs">
              Recherche: {result.screening.nomRecherche} · {result.matches.length} correspondance(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 space-y-2">
            {result.matches.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                <div className="font-medium text-emerald-700 dark:text-emerald-300">Aucune correspondance trouvée</div>
                <div className="text-xs text-muted-foreground mt-1">Le nom ne figure dans aucune liste PPE ou de sanctions</div>
              </div>
            ) : (
              result.matches.map((m: any, i: number) => (
                <div key={i} className={cn('rounded-lg border p-3', m.type === 'PPE' ? 'border-purple-200 bg-purple-50/50 dark:bg-purple-950/20' : 'border-red-200 bg-red-50/50 dark:bg-red-950/20')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {m.type === 'PPE' ? <ShieldAlert className="w-4 h-4 text-purple-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                      <span className="font-semibold text-sm">{m.entree.nom} {m.entree.prenom || ''}</span>
                      <Badge variant="outline" className={cn('text-xs', m.type === 'PPE' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700')}>
                        {m.type}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Score: {Math.round(m.score * 100)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Fonction:</span> {m.entree.fonction || '—'}</div>
                    <div><span className="text-muted-foreground">Pays:</span> {m.entree.pays || '—'}</div>
                    <div><span className="text-muted-foreground">Source:</span> {m.entree.source || '—'}</div>
                    <div><span className="text-muted-foreground">Nationalité:</span> {m.entree.nationalite || '—'}</div>
                  </div>
                  {m.entree.motif && (
                    <div className="mt-2 text-xs text-red-700 dark:text-red-300 bg-red-100/50 dark:bg-red-950/30 p-2 rounded">
                      ⚠ Motif: {m.entree.motif}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ListesView() {
  const [search, setSearch] = useState('')
  const [filtreType, setFiltreType] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const { data } = useQuery({
    queryKey: ['sanctions', search, filtreType],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (filtreType) params.set('type', filtreType)
      const r = await fetch(`/api/sanctions?${params}`)
      return r.json()
    },
  })

  const sanctions = data?.data || []
  const ppe = sanctions.filter((s: any) => s.type === 'PPE')
  const sanc = sanctions.filter((s: any) => s.type === 'SANCTIONS')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-[11px] text-muted-foreground">Total entrées</div><div className="text-xl font-bold">{sanctions.length}</div></Card>
        <Card className="p-4"><div className="text-[11px] text-muted-foreground">PPE</div><div className="text-xl font-bold text-purple-600">{ppe.length}</div></Card>
        <Card className="p-4"><div className="text-[11px] text-muted-foreground">Sanctions</div><div className="text-xl font-bold text-red-600">{sanc.length}</div></Card>
        <Card className="p-4 flex items-center justify-between">
          <div><div className="text-[11px] text-muted-foreground">Sources</div><div className="text-xl font-bold">5</div></div>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Ajouter</Button>
        </Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher dans les listes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={filtreType} onValueChange={setFiltreType}>
          <SelectTrigger className="w-40 h-10"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PPE">PPE</SelectItem>
            <SelectItem value="SANCTIONS">Sanctions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sanctions.map((s: any) => (
          <Card key={s.id} className={cn('p-4', s.type === 'PPE' ? 'border-l-4 border-l-purple-400' : 'border-l-4 border-l-red-400')}>
            <div className="flex items-start gap-3">
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                s.type === 'PPE' ? 'bg-purple-100 dark:bg-purple-950/40' : 'bg-red-100 dark:bg-red-950/40')}>
                {s.type === 'PPE' ? <ShieldAlert className="w-4.5 h-4.5 text-purple-600" /> : <XCircle className="w-4.5 h-4.5 text-red-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{s.nom} {s.prenom || ''}</span>
                  <Badge variant="outline" className="text-[10px]">{s.source}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{s.fonction || '—'} · {s.pays || '—'}</div>
                {s.motif && <div className="text-xs text-red-600 dark:text-red-400 mt-1">⚠ {s.motif}</div>}
                {s.numeroDossier && <div className="text-[10px] text-muted-foreground mt-1">Dossier: {s.numeroDossier}</div>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showAdd && <AddSanctionDialog onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function AddSanctionDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ nom: '', prenom: '', type: 'PPE', fonction: '', pays: '', source: 'UEMOA', motif: '', nationalite: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      const r = await fetch('/api/sanctions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        toast.success('Entrée ajoutée à la liste')
        qc.invalidateQueries({ queryKey: ['sanctions'] })
        onClose()
      }
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajouter une entrée</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1"><Label className="text-xs">Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value.toUpperCase() })} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">Prénom</Label><Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">Type *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="PPE">PPE</SelectItem><SelectItem value="SANCTIONS">Sanctions</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="UEMOA">UEMOA</SelectItem><SelectItem value="BCEAO">BCEAO</SelectItem><SelectItem value="OFAC">OFAC</SelectItem><SelectItem value="ONU">ONU</SelectItem><SelectItem value="UE">UE</SelectItem><SelectItem value="INTERNE">Interne</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Fonction</Label><Input value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">Pays</Label><Input value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })} className="h-9" /></div>
          <div className="col-span-2 space-y-1"><Label className="text-xs">Motif</Label><Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} className="h-9" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.nom}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HistoriqueView() {
  const { data } = useQuery({
    queryKey: ['screenings'],
    queryFn: async () => {
      const r = await fetch('/api/screening')
      return r.json()
    },
  })

  const screenings = data?.data || []

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Historique des screenings ({screenings.length})</CardTitle></CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {screenings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun screening effectué</div>
          ) : screenings.map((s: any) => (
            <div key={s.id} className="rounded-lg border p-3 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                s.statut === 'AUCUN_MATCH' ? 'bg-emerald-100 dark:bg-emerald-950/40' :
                s.statut === 'MATCH_PARTIEL' ? 'bg-amber-100 dark:bg-amber-950/40' : 'bg-red-100 dark:bg-red-950/40')}>
                {s.statut === 'AUCUN_MATCH' ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" /> :
                 s.statut === 'MATCH_PARTIEL' ? <AlertTriangle className="w-4.5 h-4.5 text-amber-600" /> : <XCircle className="w-4.5 h-4.5 text-red-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">{s.nomRecherche}</div>
                <div className="text-xs text-muted-foreground">{s.details}</div>
              </div>
              <div className="text-right shrink-0">
                <Badge variant="outline" className="text-xs">{s.statut.replace(/_/g, ' ')}</Badge>
                <div className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(s.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
