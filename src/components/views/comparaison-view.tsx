'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RiskBadge, StatutBadge, ScoreBar } from '@/components/shared/badges'
import { formatFCFA, formatNumber, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  Search, GitCompare, X, User, Wallet, TrendingUp, AlertTriangle,
  Bell, ArrowLeftRight, ShieldAlert, CheckCircle2, ArrowRight, Trophy
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

export function ComparaisonView() {
  const [clientAId, setClientAId] = useState('')
  const [clientBId, setClientBId] = useState('')
  const [search, setSearch] = useState('')

  const { data: clientsData } = useQuery({
    queryKey: ['clients-compare'],
    queryFn: async () => {
      const r = await fetch('/api/clients?limit=100')
      return r.json()
    },
  })
  const clients = clientsData?.data || []

  const { data: clientA, isLoading: loadingA } = useQuery({
    queryKey: ['client', clientAId],
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientAId}`)
      return r.json()
    },
    enabled: !!clientAId,
  })

  const { data: clientB, isLoading: loadingB } = useQuery({
    queryKey: ['client', clientBId],
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientBId}`)
      return r.json()
    },
    enabled: !!clientBId,
  })

  function pickRandom() {
    const shuffled = [...clients].sort(() => Math.random() - 0.5)
    if (shuffled.length >= 2) {
      setClientAId(shuffled[0].id)
      setClientBId(shuffled[1].id)
    }
  }

  function getWinner(a: any, b: any, field: string, higher = false) {
    if (!a || !b) return null
    const valA = a[field] ?? 0
    const valB = b[field] ?? 0
    if (valA === valB) return 'tie'
    return higher ? (valA > valB ? 'A' : 'B') : (valA < valB ? 'A' : 'B')
  }

  return (
    <div className="space-y-4">
      {/* Sélecteurs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            Comparaison de clients
          </CardTitle>
          <CardDescription className="text-xs">
            Comparez les profils de risque de deux clients côte à côte
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Client A</label>
              <Select value={clientAId} onValueChange={setClientAId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner le client A" /></SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.id !== clientBId).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} · {c.nom} {c.prenom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Client B</label>
              <Select value={clientBId} onValueChange={setClientBId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner le client B" /></SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.id !== clientAId).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} · {c.nom} {c.prenom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {clientAId && clientBId ? 'Comparaison en cours' : 'Sélectionnez deux clients à comparer'}
            </p>
            <Button variant="outline" size="sm" onClick={pickRandom} className="gap-1.5">
              <GitCompare className="w-3.5 h-3.5" /> Comparaison aléatoire
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      {clientAId && clientBId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          {/* Client A */}
          <ClientCompareCard client={clientA} loading={loadingA} label="A" winner={null} />
          {/* Client B */}
          <ClientCompareCard client={clientB} loading={loadingB} label="B" winner={null} />

          {/* Comparison metrics */}
          {clientA && clientB && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Analyse comparative
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2">
                  <CompareRow
                    label="Score de risque"
                    valueA={clientA.scoreRisqueCalcule?.score || 0}
                    valueB={clientB.scoreRisqueCalcule?.score || 0}
                    suffix="/100"
                    higherIsWorse
                    icon={ShieldAlert}
                  />
                  <CompareRow
                    label="Solde global"
                    valueA={clientA.soldeGlobal?.soldeTotal || 0}
                    valueB={clientB.soldeGlobal?.soldeTotal || 0}
                    format="fcfa"
                    icon={Wallet}
                  />
                  <CompareRow
                    label="Nombre de comptes"
                    valueA={clientA.soldeGlobal?.nombreComptes || 0}
                    valueB={clientB.soldeGlobal?.nombreComptes || 0}
                    icon={Wallet}
                  />
                  <CompareRow
                    label="Transactions"
                    valueA={clientA.transactions?.length || 0}
                    valueB={clientB.transactions?.length || 0}
                    icon={ArrowLeftRight}
                  />
                  <CompareRow
                    label="Alertes"
                    valueA={clientA.alertes?.length || 0}
                    valueB={clientB.alertes?.length || 0}
                    higherIsWorse
                    icon={Bell}
                  />
                  <CompareRow
                    label="Revenu mensuel"
                    valueA={clientA.revenuMensuel || 0}
                    valueB={clientB.revenuMensuel || 0}
                    format="fcfa"
                    icon={TrendingUp}
                  />
                </div>

                {/* Summary */}
                <div className="mt-4 pt-3 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Client A - {clientA.nom}</div>
                      <RiskBadge niveau={clientA.niveauRisque} score={clientA.scoreRisque} />
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Client B - {clientB.nom}</div>
                      <RiskBadge niveau={clientB.niveauRisque} score={clientB.scoreRisque} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!clientAId && !clientBId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <div className="font-medium">Sélectionnez deux clients à comparer</div>
            <div className="text-xs mt-1">Ou utilisez la comparaison aléatoire pour voir un exemple</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ClientCompareCard({ client, loading, label, winner }: { client: any; loading: boolean; label: string; winner: string | null }) {
  if (loading || !client) {
    return <Card><CardContent className="py-8"><div className="h-48 rounded-xl bg-muted animate-pulse" /></CardContent></Card>
  }
  return (
    <Card className={cn(
      'hover-lift',
      winner === label && 'ring-2 ring-emerald-400'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white',
              label === 'A' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-violet-500 to-fuchsia-600'
            )}>
              {label}
            </div>
            <CardTitle className="text-sm">{client.nom} {client.prenom}</CardTitle>
          </div>
          <RiskBadge niveau={client.niveauRisque} score={client.scoreRisque} />
        </div>
        <div className="text-xs text-muted-foreground">{client.code} · {client.profession}</div>
      </CardHeader>
      <CardContent className="pt-2 space-y-2">
        <InfoRow icon={Wallet} label="Solde global" value={formatFCFA(client.soldeGlobal?.soldeTotal || 0)} />
        <InfoRow icon={Wallet} label="Comptes" value={`${client.soldeGlobal?.nombreComptes || 0} compte(s)`} />
        <InfoRow icon={ArrowLeftRight} label="Transactions" value={`${client.transactions?.length || 0}`} />
        <InfoRow icon={Bell} label="Alertes" value={`${client.alertes?.length || 0}`} />
        <InfoRow icon={TrendingUp} label="Revenu mensuel" value={formatFCFA(client.revenuMensuel)} />
        <InfoRow icon={User} label="Statut" value={client.statut} />
        {client.estPPE && <InfoRow icon={ShieldAlert} label="PPE" value={client.detailsPPE || 'Oui'} />}
        <div className="pt-2">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Score de risque</div>
          <ScoreBar score={client.scoreRisqueCalcule?.score || 0} />
        </div>
      </CardContent>
    </Card>
  )
}

function CompareRow({ label, valueA, valueB, suffix, format, higherIsWorse, icon: Icon }: {
  label: string
  valueA: number
  valueB: number
  suffix?: string
  format?: 'fcfa'
  higherIsWorse?: boolean
  icon: any
}) {
  function formatVal(v: number) {
    if (format === 'fcfa') return formatFCFA(v)
    return formatNumber(v) + (suffix || '')
  }
  const aWins = higherIsWorse ? valueA < valueB : valueA > valueB
  const bWins = higherIsWorse ? valueB < valueA : valueB > valueA
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="text-sm flex-1">{label}</div>
      <div className={cn('text-right font-semibold tabular-nums w-28', aWins && 'text-emerald-600')}>
        {formatVal(valueA)}
        {aWins && <Trophy className="w-3 h-3 inline ml-1 text-amber-500" />}
      </div>
      <ArrowRight className="w-3 h-3 text-muted-foreground" />
      <div className={cn('text-right font-semibold tabular-nums w-28', bWins && 'text-emerald-600')}>
        {formatVal(valueB)}
        {bWins && <Trophy className="w-3 h-3 inline ml-1 text-amber-500" />}
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium ml-auto truncate">{value}</span>
    </div>
  )
}
