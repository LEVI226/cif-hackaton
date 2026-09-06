'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RiskBadge, StatutBadge, ScoreBar } from '@/components/shared/badges'
import { formatFCFA, formatNumber, formatDate, formatDateTime } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Search, Users, UserPlus, ShieldAlert, CreditCard, Wallet,
  FileText, Ban, AlertTriangle, Phone, Mail, MapPin,
  Briefcase, Calendar, TrendingUp, Eye, Lock, Unlock,
  History, ShieldCheck, FileSearch, ArrowLeftRight, Bell, Globe2
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIAnalyse } from '@/components/shared/ai-analyse'

export function ClientsView() {
  const [search, setSearch] = useState('')
  const [filtreRisque, setFiltreRisque] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtrePPE, setFiltrePPE] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const selectedClientId = useAppStore((s) => s.selectedClientId)
  const setClientId = useAppStore((s) => s.setClientId)
  const setView = useAppStore((s) => s.setView)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, filtreRisque, filtreStatut, filtrePPE],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (filtreRisque) params.set('niveauRisque', filtreRisque)
      if (filtreStatut) params.set('statut', filtreStatut)
      if (filtrePPE) params.set('estPPE', 'true')
      params.set('limit', '100')
      const r = await fetch(`/api/clients?${params}`)
      return r.json()
    },
  })

  const clients = data?.data || []

  if (selectedClientId) {
    return <ClientDetail clientId={selectedClientId} onClose={() => { setClientId(null); setView('clients') }} />
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, code, téléphone, n° pièce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={filtreRisque} onValueChange={setFiltreRisque}>
          <SelectTrigger className="w-full md:w-44 h-10">
            <SelectValue placeholder="Niveau de risque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FAIBLE">Faible</SelectItem>
            <SelectItem value="MOYEN">Moyen</SelectItem>
            <SelectItem value="ELEVE">Élevé</SelectItem>
            <SelectItem value="PROHIBITIF">Prohibitif</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtreStatut} onValueChange={setFiltreStatut}>
          <SelectTrigger className="w-full md:w-40 h-10">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIF">Actif</SelectItem>
            <SelectItem value="BLOQUE">Bloqué</SelectItem>
            <SelectItem value="SUSPENDU">Suspendu</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={filtrePPE ? 'default' : 'outline'}
          onClick={() => setFiltrePPE(!filtrePPE)}
          className="h-10 gap-2"
        >
          <ShieldAlert className="w-4 h-4" /> PPE
        </Button>
        <Button onClick={() => setShowCreate(true)} className="h-10 gap-2">
          <UserPlus className="w-4 h-4" /> Nouveau
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">Total clients</div><div className="text-xl font-bold">{formatNumber(data?.total || 0)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">PPE</div><div className="text-xl font-bold text-purple-600">{clients.filter(c => c.estPPE).length}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">Risque élevé</div><div className="text-xl font-bold text-orange-600">{clients.filter(c => c.niveauRisque === 'ELEVE').length}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-muted-foreground">Bloqués</div><div className="text-xl font-bold text-red-600">{clients.filter(c => c.statut === 'BLOQUE').length}</div></Card>
      </div>

      {/* Liste */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                  <th className="px-4 py-3 font-medium">Risque</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Solde global</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-muted animate-pulse rounded" /></td></tr>
                  ))
                ) : clients.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Aucun client trouvé</td></tr>
                ) : (
                  clients.map((c: any) => (
                    <tr
                      key={c.id}
                      onClick={() => setClientId(c.id)}
                      className="hover:bg-accent/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0',
                            c.estPPE ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                              : c.niveauRisque === 'ELEVE' ? 'bg-gradient-to-br from-orange-500 to-red-500'
                              : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                          )}>
                            {c.nom.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate flex items-center gap-1.5">
                              {c.nom} {c.prenom}
                              {c.estOccasionnel && <Badge variant="outline" className="text-[9px] h-4 px-1">OCC</Badge>}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{c.code} · {c.profession || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs text-muted-foreground">{c.telephone || '—'}</div>
                        <div className="text-[11px] text-muted-foreground/70">{c.ville || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge niveau={c.niveauRisque} score={c.scoreRisque} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="font-semibold tabular-nums">{formatFCFA(c.soldeGlobal)}</div>
                        <div className="text-[10px] text-muted-foreground">{c.nombreComptes} compte(s)</div>
                      </td>
                      <td className="px-4 py-3"><StatutBadge statut={c.statut} /></td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showCreate && <CreateClientDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}

// ===== DÉTAIL CLIENT =====
function ClientDetail({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [showBlock, setShowBlock] = useState(false)
  const [blockAction, setBlockAction] = useState<'bloquer' | 'debloquer'>('bloquer')

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}`)
      return r.json()
    },
  })

  async function handleBlock(action: 'bloquer' | 'debloquer', motif: string) {
    const r = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, motif, operateur: 'Resp. Conformité' }),
    })
    if (r.ok) {
      toast.success(action === 'bloquer' ? 'Client bloqué' : 'Client débloqué')
      qc.invalidateQueries({ queryKey: ['client', clientId] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      setShowBlock(false)
    } else {
      toast.error('Erreur lors de l\'action')
    }
  }

  if (isLoading || !client) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}</div>
  }

  const sg = client.soldeGlobal || {}
  const sr = client.scoreRisqueCalcule || {}

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
          ← Retour
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight">{client.nom} {client.prenom}</h2>
            <RiskBadge niveau={client.niveauRisque} score={client.scoreRisque} />
            <StatutBadge statut={client.statut} />
            {client.estPPE && <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300">PPE</Badge>}
            {client.estOccasionnel && <Badge variant="outline">Occasionnel</Badge>}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {client.code} · {client.profession || '—'} · {client.ville || '—'} · Client depuis {formatDate(client.createdAt)}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {client.statut === 'BLOQUE' ? (
            <Button variant="outline" onClick={() => { setBlockAction('debloquer'); setShowBlock(true) }} className="gap-2">
              <Unlock className="w-4 h-4" /> Débloquer
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => { setBlockAction('bloquer'); setShowBlock(true) }} className="gap-2">
              <Ban className="w-4 h-4" /> Bloquer
            </Button>
          )}
        </div>
      </div>

      {/* KPIs client */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]"><Wallet className="w-3.5 h-3.5" /> Solde global</div>
          <div className="text-xl font-bold mt-1">{formatFCFA(sg.soldeTotal || 0)}</div>
          <div className="text-[10px] text-muted-foreground">{sg.nombreComptes || 0} compte(s)</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]"><Lock className="w-3.5 h-3.5" /> Solde bloqué</div>
          <div className="text-xl font-bold mt-1 text-red-600">{formatFCFA(sg.soldeBloque || 0)}</div>
          <div className="text-[10px] text-muted-foreground">Dispo: {formatFCFA(sg.soldeDisponible || 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]"><TrendingUp className="w-3.5 h-3.5" /> Score risque</div>
          <div className="text-xl font-bold mt-1">{sr.score || 0}/100</div>
          <div className="mt-1"><ScoreBar score={sr.score || 0} /></div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]"><AlertTriangle className="w-3.5 h-3.5" /> Alertes</div>
          <div className="text-xl font-bold mt-1">{client.alertes?.length || 0}</div>
          <div className="text-[10px] text-muted-foreground">{client.transactions?.length || 0} transactions</div>
        </Card>
      </div>

      <Tabs defaultValue="profil" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profil" className="gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Profil & KYC</TabsTrigger>
          <TabsTrigger value="comptes" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Comptes</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1.5"><ArrowLeftRight className="w-3.5 h-3.5" /> Transactions</TabsTrigger>
          <TabsTrigger value="alertes" className="gap-1.5"><Bell className="w-3.5 h-3.5" /> Alertes</TabsTrigger>
          <TabsTrigger value="risque" className="gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Analyse risque</TabsTrigger>
          <TabsTrigger value="historique" className="gap-1.5"><History className="w-3.5 h-3.5" /> Historique KYC</TabsTrigger>
        </TabsList>

        {/* Profil & KYC */}
        <TabsContent value="profil" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Informations personnelles</CardTitle></CardHeader>
              <CardContent className="space-y-2.5 text-sm pt-2">
                <InfoRow icon={CreditCard} label="Type" value={client.type} />
                <InfoRow icon={Calendar} label="Date de naissance" value={formatDate(client.dateNaissance)} />
                <InfoRow icon={MapPin} label="Lieu de naissance" value={client.lieuNaissance || '—'} />
                <InfoRow icon={Globe2} label="Nationalité" value={client.nationalite || '—'} />
                <InfoRow icon={MapPin} label="Adresse" value={client.adresse || '—'} />
                <InfoRow icon={Phone} label="Téléphone" value={client.telephone || '—'} />
                <InfoRow icon={Mail} label="Email" value={client.email || '—'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Activité professionnelle</CardTitle></CardHeader>
              <CardContent className="space-y-2.5 text-sm pt-2">
                <InfoRow icon={Briefcase} label="Profession" value={client.profession || '—'} />
                <InfoRow icon={Briefcase} label="Employeur" value={client.employeur || '—'} />
                <InfoRow icon={TrendingUp} label="Revenu mensuel" value={formatFCFA(client.revenuMensuel)} />
                <InfoRow icon={Wallet} label="Source des fonds" value={client.sourceFonds || '—'} />
                <InfoRow icon={Wallet} label="Origine des fonds" value={client.origineFonds || '—'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pièce d'identité</CardTitle></CardHeader>
              <CardContent className="space-y-2.5 text-sm pt-2">
                <InfoRow icon={CreditCard} label="Type" value={client.typePiece || '—'} />
                <InfoRow icon={CreditCard} label="Numéro" value={client.numeroPiece || '—'} />
                <InfoRow icon={Calendar} label="Délivrée le" value={formatDate(client.dateDelivrance)} />
                <InfoRow icon={Calendar} label="Expire le" value={formatDate(client.dateExpiration)} />
                <InfoRow icon={MapPin} label="Lieu de délivrance" value={client.lieuDelivrance || '—'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Statut PPE & Sanctions</CardTitle></CardHeader>
              <CardContent className="space-y-2.5 text-sm pt-2">
                <InfoRow icon={ShieldAlert} label="Est PPE" value={client.estPPE ? 'Oui' : 'Non'} />
                {client.estPPE && <InfoRow icon={FileText} label="Détails PPE" value={client.detailsPPE || '—'} />}
                <InfoRow icon={FileSearch} label="Screenings" value={`${client.screenings?.length || 0} effectué(s)`} />
                {client.screenings?.[0] && (
                  <div className="pt-2 border-t">
                    <div className="text-[11px] text-muted-foreground">Dernier screening</div>
                    <div className="text-xs">{client.screenings[0].statut} · {formatDateTime(client.screenings[0].createdAt)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comptes */}
        <TabsContent value="comptes">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Comptes du client ({client.comptes?.length || 0})</CardTitle>
                <div className="text-right">
                  <div className="text-[11px] text-muted-foreground">Solde global</div>
                  <div className="font-bold">{formatFCFA(sg.soldeTotal || 0)}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {client.comptes?.map((cp: any) => (
                  <div key={cp.id} className={cn('rounded-xl border p-4', cp.statut === 'BLOQUE' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : 'border-border')}>
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <StatutBadge statut={cp.statut} />
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{cp.numero}</div>
                    <div className="text-sm font-medium mt-1">{cp.libelle || cp.type}</div>
                    <div className="mt-2 text-lg font-bold">{formatFCFA(cp.solde)}</div>
                    {cp.soldeBloque > 0 && <div className="text-[11px] text-red-600">Bloqué: {formatFCFA(cp.soldeBloque)}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">Ouvert le {formatDate(cp.dateOuverture)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Transactions récentes</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left text-[11px] uppercase text-muted-foreground">
                      <th className="px-3 py-2">Réf</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Montant</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Alertes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {client.transactions?.map((t: any) => (
                      <tr key={t.id} className="hover:bg-accent/30">
                        <td className="px-3 py-2 font-mono text-xs">{t.reference}</td>
                        <td className="px-3 py-2 text-xs">{formatDateTime(t.date)}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{t.type}</Badge></td>
                        <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', t.sens === 'ENTREE' ? 'text-emerald-600' : 'text-red-600')}>
                          {t.sens === 'ENTREE' ? '+' : '-'}{formatFCFA(t.montant)}
                        </td>
                        <td className="px-3 py-2"><StatutBadge statut={t.statut} /></td>
                        <td className="px-3 py-2">{t.alertes?.length > 0 ? <Badge variant="outline" className="text-xs bg-red-50 text-red-700">{t.alertes.length}</Badge> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alertes */}
        <TabsContent value="alertes">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Alertes du client</CardTitle></CardHeader>
            <CardContent className="pt-2 space-y-2">
              {client.alertes?.length === 0 && <div className="text-center py-8 text-muted-foreground">Aucune alerte</div>}
              {client.alertes?.map((a: any) => (
                <div key={a.id} className={cn('rounded-lg border p-3', a.type === 'BLOQUANTE' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : 'border-border')}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <TypeBadgeInline type={a.type} />
                      <StatutBadge statut={a.statut} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <div className="font-medium text-sm">{a.titre}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyse risque */}
        <TabsContent value="risque" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Score de risque: {sr.score || 0}/100</CardTitle>
              <CardDescription className="text-xs">Calculé automatiquement par le moteur de règles</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              <ScoreBar score={sr.score || 0} />
              <div className="space-y-2">
                {sr.facteurs?.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                    <div className="text-sm">{f.label}</div>
                    <Badge variant="outline" className="text-orange-700 bg-orange-50 border-orange-200">+{f.points} pts</Badge>
                  </div>
                ))}
                {(!sr.facteurs || sr.facteurs.length === 0) && (
                  <div className="text-center text-sm text-muted-foreground py-4">Aucun facteur de risque détecté</div>
                )}
              </div>
            </CardContent>
          </Card>
          <AIAnalyse type="client" id={client.id} title="Analyse IA du client" description="Analyse approfondie du profil de risque par intelligence artificielle" />
        </TabsContent>

        {/* Historique KYC */}
        <TabsContent value="historique">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Historique KYC</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                {client.kycHistorique?.map((h: any) => (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="text-[11px] text-muted-foreground">{formatDateTime(h.createdAt)} · {h.operateur}</div>
                    <div className="text-sm font-medium">{h.action}</div>
                    <div className="text-xs text-muted-foreground">{h.details}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showBlock && (
        <BlockDialog
          action={blockAction}
          onClose={() => setShowBlock(false)}
          onConfirm={(motif) => handleBlock(blockAction, motif)}
        />
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  )
}

function TypeBadgeInline({ type }: { type: string }) {
  return (
    <Badge variant="outline" className={cn('text-xs', type === 'BLOQUANTE' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-sky-100 text-sky-700 border-sky-200')}>
      {type === 'BLOQUANTE' ? 'Bloquante' : 'Informative'}
    </Badge>
  )
}

function BlockDialog({ action, onClose, onConfirm }: { action: 'bloquer' | 'debloquer'; onClose: () => void; onConfirm: (motif: string) => void }) {
  const [motif, setMotif] = useState('')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'bloquer' ? <><Ban className="w-5 h-5 text-red-500" /> Bloquer le client</> : <><Unlock className="w-5 h-5 text-emerald-500" /> Débloquer le client</>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Motif {action === 'bloquer' ? '(obligatoire)' : ''}</Label>
          <Textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder={action === 'bloquer' ? 'Ex: Activité suspecte détectée, correspondance liste sanctions...' : 'Ex: Vérifications complétées, documents à jour...'}
            rows={4}
          />
          {action === 'bloquer' && (
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg">
              ⚠ Le blocage suspend tous les comptes du client. Cette action sera tracée dans le journal d'audit.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            variant={action === 'bloquer' ? 'destructive' : 'default'}
            onClick={() => onConfirm(motif)}
            disabled={action === 'bloquer' && !motif.trim()}
          >
            {action === 'bloquer' ? 'Confirmer le blocage' : 'Confirmer le déblocage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateClientDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    nom: '', prenom: '', type: 'PARTICULIER', civilite: 'M',
    telephone: '', email: '', ville: 'Ouagadougou', adresse: '',
    profession: '', revenuMensuel: '', nationalite: 'Burkinabè',
    typePiece: 'CNI', numeroPiece: '', dateNaissance: '', lieuNaissance: '',
    sourceFonds: 'Revenus professionnels',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      const r = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          revenuMensuel: form.revenuMensuel ? parseFloat(form.revenuMensuel) : null,
        }),
      })
      if (r.ok) {
        toast.success('Client créé avec succès')
        qc.invalidateQueries({ queryKey: ['clients'] })
        onClose()
      } else {
        toast.error('Erreur lors de la création')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Nouveau client</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Field label="Nom*" value={form.nom} onChange={(v) => setForm({ ...form, nom: v.toUpperCase() })} />
          <Field label="Prénom" value={form.prenom} onChange={(v) => setForm({ ...form, prenom: v })} />
          <Field label="Téléphone" value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Profession" value={form.profession} onChange={(v) => setForm({ ...form, profession: v })} />
          <Field label="Revenu mensuel (FCFA)" value={form.revenuMensuel} onChange={(v) => setForm({ ...form, revenuMensuel: v })} type="number" />
          <Field label="Ville" value={form.ville} onChange={(v) => setForm({ ...form, ville: v })} />
          <Field label="Adresse" value={form.adresse} onChange={(v) => setForm({ ...form, adresse: v })} />
          <Field label="N° pièce" value={form.numeroPiece} onChange={(v) => setForm({ ...form, numeroPiece: v })} />
          <Field label="Date naissance" value={form.dateNaissance} onChange={(v) => setForm({ ...form, dateNaissance: v })} type="date" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.nom}>
            {loading ? 'Création...' : 'Créer le client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} type={type} className="h-9" />
    </div>
  )
}
