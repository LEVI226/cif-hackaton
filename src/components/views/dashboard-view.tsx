'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { KpiCard } from '@/components/shared/kpi-card'
import { RiskBadge, SeveriteBadge, StatutBadge, TypeBadge, ScoreBar } from '@/components/shared/badges'
import { formatFCFA, formatNumber, formatCompact, timeAgo, CATEGORIE_ALERTE_LABELS } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import {
  Users, ShieldAlert, ArrowLeftRight, Bell, TrendingUp, Globe2,
  AlertTriangle, Ban, Eye, ShieldCheck, Search, Activity,
  ArrowUpRight, ArrowDownRight, Clock, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

export function DashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const r = await fetch('/api/dashboard')
      if (!r.ok) throw new Error('Erreur')
      return r.json()
    },
    refetchInterval: 45_000,
  })

  const setView = useAppStore((s) => s.setView)
  const setAlerteId = useAppStore((s) => s.setAlerteId)
  const setClientId = useAppStore((s) => s.setClientId)

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 rounded-xl bg-muted animate-pulse" />
          <div className="h-80 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  const k = data.kpis
  const evolution = data.evolution || []
  const parType = Object.entries(data.parType || {}).map(([name, value]) => ({ name, value }))
  const repartition = data.repartitionRisque || {}

  const pieData = [
    { name: 'Faible', value: repartition.faible || 0, color: '#10b981' },
    { name: 'Moyen', value: repartition.moyen || 0, color: '#f59e0b' },
    { name: 'Élevé', value: repartition.eleve || 0, color: '#f97316' },
    { name: 'Prohibitif', value: repartition.prohibitif || 0, color: '#ef4444' },
  ]

  return (
    <div className="space-y-5">
      {/* Bandeau d'alerte critique */}
      {k.alertesCritiques > 0 && (
        <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/30 p-4 flex items-center gap-3 animate-slide-in">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center pulse-alert">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-red-900 dark:text-red-200">
              {k.alertesCritiques} alerte{k.alertesCritiques > 1 ? 's' : ''} critique{k.alertesCritiques > 1 ? 's' : ''} en attente de traitement
            </div>
            <div className="text-xs text-red-700/80 dark:text-red-300/70">
              Action requise immédiatement — conformément aux obligations LBC/FT/FP
            </div>
          </div>
          <button
            onClick={() => setView('alertes')}
            className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-red-700 dark:text-red-300 hover:underline"
          >
            Traiter <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard label="Clients" value={formatNumber(k.totalClients)} icon={Users} hint={`${k.clientsPPE} PPE · ${k.clientsBloques} bloqués`} accent="emerald" delay={0} />
        <KpiCard label="Transactions 30j" value={formatNumber(k.transactions30j)} icon={ArrowLeftRight} hint={`Vol: ${formatCompact(k.volume30j)}`} accent="sky" delay={50} />
        <KpiCard label="Alertes ouvertes" value={formatNumber(k.alertesOuvertes)} icon={Bell} hint={`${k.alertesCritiques} critique(s)`} accent={k.alertesCritiques > 0 ? 'red' : 'amber'} delay={100} />
        <KpiCard label="Trx suspectes" value={formatNumber(k.transactionsSuspectes)} icon={ShieldAlert} hint={`${k.transactionsBloquees} bloquées`} accent="red" delay={150} />
        <KpiCard label="Screenings 7j" value={formatNumber(k.screenings7j)} icon={Search} hint={`${k.totalSanctions} entrées sanctions`} accent="purple" delay={200} />
        <KpiCard label="Volume du jour" value={formatCompact(k.volumeJour)} icon={TrendingUp} hint={`${k.trxJourBloquees} trx bloquées`} accent="emerald" delay={250} />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Évolution */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Évolution des transactions</CardTitle>
                <CardDescription className="text-xs">7 derniers jours · volume et nombre</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  Montant
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                  Nombre
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={evolution} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradMontant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradNombre" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} stroke="oklch(0.6 0 0)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0)" tickFormatter={(v) => formatCompact(v)} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0 0)', fontSize: 12 }}
                  formatter={(v: any, n) => n === 'montant' ? formatFCFA(v) : [v, 'Nombre']}
                />
                <Area type="monotone" dataKey="montant" stroke="#10b981" strokeWidth={2} fill="url(#gradMontant)" />
                <Area type="monotone" dataKey="nombre" stroke="#38bdf8" strokeWidth={2} fill="url(#gradNombre)" yAxisId={0} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition risque */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition du risque</CardTitle>
            <CardDescription className="text-xs">Niveau de risque des clients</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0 0)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {pieData.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
                  <span className="text-muted-foreground">{p.name}</span>
                  <span className="ml-auto font-semibold tabular-nums">{p.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section inférieure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top clients à risque */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  Clients à surveiller
                </CardTitle>
                <CardDescription className="text-xs">Top 5 par score de risque</CardDescription>
              </div>
              <button onClick={() => setView('clients')} className="text-xs text-primary hover:underline flex items-center gap-1">
                Voir tout <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-2 space-y-2">
            {data.topRisque?.map((c: any, i: number) => (
              <button
                key={c.id}
                onClick={() => { setClientId(c.id); setView('clients') }}
                className="w-full group flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{c.nom} {c.prenom}</span>
                    {c.estPPE && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-medium">PPE</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{c.code} · {formatFCFA(c.solde)}</div>
                  <div className="mt-1"><ScoreBar score={c.scoreRisque} /></div>
                </div>
                <div className="shrink-0 text-right">
                  <RiskBadge niveau={c.niveauRisque} score={c.scoreRisque} />
                  <div className="text-[10px] text-muted-foreground mt-1">{c.alertesOuvertes} alerte(s)</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Alertes récentes */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Alertes récentes
                </CardTitle>
                <CardDescription className="text-xs">Dernières alertes générées</CardDescription>
              </div>
              <button onClick={() => setView('alertes')} className="text-xs text-primary hover:underline flex items-center gap-1">
                Voir tout <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-2 space-y-2 max-h-[380px] overflow-y-auto">
            {data.alertesRecentes?.map((a: any) => (
              <button
                key={a.id}
                onClick={() => { setAlerteId(a.id); setView('alertes') }}
                className="w-full group block p-2.5 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-accent/30 transition-all text-left"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <TypeBadge type={a.type} label={a.type === 'BLOQUANTE' ? 'Bloquante' : 'Informative'} />
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{timeAgo(a.createdAt)}
                  </span>
                </div>
                <div className="text-xs font-medium line-clamp-2 mb-1">{a.titre}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {a.client ? `${a.client.nom} ${a.client.prenom || ''}` : '—'}
                  </span>
                  {a.montant && <span className="text-[10px] font-semibold">{formatCompact(a.montant)}</span>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Types de transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Répartition par type de transaction</CardTitle>
          <CardDescription className="text-xs">30 derniers jours</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={parType} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0)" />
              <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0)" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0 0)', fontSize: 12 }} />
              <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
