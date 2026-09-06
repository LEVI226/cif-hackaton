'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatFCFA, formatNumber, formatDate, formatDateTime } from '@/lib/format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  FileText, Download, Plus, Eye, BarChart3, TrendingUp, ShieldAlert,
  Users, ArrowLeftRight, CheckCircle2, FileBarChart
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AIAnalyse } from '@/components/shared/ai-analyse'

export function RapportsView() {
  const [tab, setTab] = useState('liste')
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="liste" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Rapports</TabsTrigger>
        <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Statistiques</TabsTrigger>
      </TabsList>
      <TabsContent value="liste"><RapportsListe /></TabsContent>
      <TabsContent value="stats"><StatistiquesView /></TabsContent>
    </Tabs>
  )
}

function RapportsListe() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const { data } = useQuery({
    queryKey: ['rapports'],
    queryFn: async () => {
      const r = await fetch('/api/rapports')
      return r.json()
    },
  })

  const rapports = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{rapports.length} rapport(s) généré(s)</div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> Générer un rapport</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rapports.length === 0 ? (
          <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div className="font-medium">Aucun rapport généré</div>
            <div className="text-xs mt-1">Cliquez sur "Générer un rapport" pour créer votre premier rapport de conformité</div>
          </CardContent></Card>
        ) : rapports.map((r: any) => (
          <Card key={r.id} className="hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  r.type === 'SAR' ? 'bg-red-100 dark:bg-red-950/40' :
                  r.type === 'DECLARATION' ? 'bg-amber-100 dark:bg-amber-950/40' : 'bg-emerald-100 dark:bg-emerald-950/40')}>
                  <FileText className={cn('w-5 h-5', r.type === 'SAR' ? 'text-red-600' : r.type === 'DECLARATION' ? 'text-amber-600' : 'text-emerald-600')} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm line-clamp-1">{r.titre}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{r.reference}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                    <Badge variant="outline" className={cn('text-[10px]',
                      r.statut === 'BROUILLON' ? 'bg-gray-100 text-gray-600' :
                      r.statut === 'SOUMIS' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                      {r.statut}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">{formatDateTime(r.createdAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreate && <CreateRapportDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function CreateRapportDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: 'SAR', titre: '', periode: '', contenu: '', dateDebut: '', dateFin: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      const r = await fetch('/api/rapports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        toast.success('Rapport créé')
        qc.invalidateQueries({ queryKey: ['rapports'] })
        onClose()
      }
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Générer un rapport de conformité</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Type de rapport</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR - Signalement d'Activité Suspecte</SelectItem>
                  <SelectItem value="DECLARATION">Déclaration TRA</SelectItem>
                  <SelectItem value="STATISTIQUE">Rapport statistique</SelectItem>
                  <SelectItem value="AUDIT">Rapport d'audit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Période</Label><Input value={form.periode} onChange={(e) => setForm({ ...form, periode: e.target.value })} placeholder="Ex: Octobre 2026" className="h-9" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Titre *</Label><Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} className="h-9" placeholder="Ex: SAR - M. COMPAORE Salif" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Date début</Label><Input type="date" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Date fin</Label><Input type="date" value={form.dateFin} onChange={(e) => setForm({ ...form, dateFin: e.target.value })} className="h-9" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Contenu / Narratif</Label><Textarea value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} rows={6} placeholder="Décrivez les faits, les analyses, les décisions..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.titre}>Générer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatistiquesView() {
  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const r = await fetch('/api/dashboard')
      return r.json()
    },
  })

  const k = dash?.kpis || {}

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Clients actifs" value={formatNumber((k.totalClients || 0) - (k.clientsBloques || 0))} sub={`${k.clientsBloques} bloqués`} color="emerald" />
        <StatCard icon={ArrowLeftRight} label="Volume 30j" value={formatFCFA(k.volume30j || 0)} sub={`${k.transactions30j} transactions`} color="sky" />
        <StatCard icon={ShieldAlert} label="Alertes traitées" value={formatNumber(k.alertesCloturees || 0)} sub={`${k.alertesOuvertes} ouvertes`} color="amber" />
        <StatCard icon={CheckCircle2} label="Taux conformité" value={`${k.transactionsBloquees ? Math.round(((k.transactions30j - k.transactionsBloquees) / k.transactions30j) * 100) : 100}%`} sub={`${k.transactionsBloquees} bloquées`} color="emerald" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileBarChart className="w-4 h-4" /> Synthèse de conformité LBC/FT/FP</CardTitle></CardHeader>
        <CardContent className="pt-2 space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-medium text-xs uppercase text-muted-foreground">Indicateurs clés</div>
              <StatRow label="Total clients" value={formatNumber(k.totalClients)} />
              <StatRow label="Clients PPE" value={formatNumber(k.clientsPPE)} />
              <StatRow label="Comptes surveillés" value={formatNumber(k.totalComptes)} />
              <StatRow label="Transactions (30j)" value={formatNumber(k.transactions30j)} />
              <StatRow label="Transactions suspectes" value={formatNumber(k.transactionsSuspectes)} />
              <StatRow label="Transactions bloquées" value={formatNumber(k.transactionsBloquees)} />
            </div>
            <div className="space-y-2">
              <div className="font-medium text-xs uppercase text-muted-foreground">Alertes & Screening</div>
              <StatRow label="Alertes ouvertes" value={formatNumber(k.alertesOuvertes)} />
              <StatRow label="Alertes critiques" value={formatNumber(k.alertesCritiques)} />
              <StatRow label="Alertes clôturées" value={formatNumber(k.alertesCloturees)} />
              <StatRow label="Screenings (7j)" value={formatNumber(k.screenings7j)} />
              <StatRow label="Entrées sanctions" value={formatNumber(k.totalSanctions)} />
              <StatRow label="Volume du jour" value={formatFCFA(k.volumeJour)} />
            </div>
          </div>
          <div className="pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              Rapport généré le {formatDateTime(new Date())} · CIF Sentinel v1.0 · Conformément aux exigences BCEAO / GIABA / GAFI
            </div>
          </div>
        </CardContent>
      </Card>
      <AIAnalyse type="rapport" title="Rapport IA de synthèse" description="Génération automatique d'un rapport de synthèse de conformité par intelligence artificielle" />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600',
    sky: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600',
  }
  return (
    <Card className="p-4">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', colors[color])}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </Card>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}
