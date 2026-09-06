'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNumber, CATEGORIE_ALERTE_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, Clock, Users, AlertTriangle } from 'lucide-react'

const SEVERITE_COLORS: Record<string, string> = {
  INFO: '#0ea5e9',
  FAIBLE: '#10b981',
  MOYENNE: '#f59e0b',
  ELEVEE: '#f97316',
  CRITIQUE: '#ef4444',
}

export function AlertStats() {
  const { data, isLoading } = useQuery({
    queryKey: ['alertes-stats'],
    queryFn: async () => {
      const r = await fetch('/api/alertes/stats')
      return r.json()
    },
  })

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  const evolution = data.evolution || []
  const parCategorie = data.parCategorie || []
  const parSeverite = data.parSeverite || []
  const topClients = data.topClients || []
  const tempsMoyen = data.tempsMoyenTraitement || 0

  const pieData = parSeverite.map((s: any) => ({ name: s.severite, value: s.count, color: SEVERITE_COLORS[s.severite] || '#999' }))

  return (
    <div className="space-y-4">
      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><TrendingUp className="w-3.5 h-3.5" /> Alertes 7j</div>
          <div className="text-xl font-bold mt-1">{formatNumber(evolution.reduce((s: number, e: any) => s + e.ouvertes, 0))}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Clock className="w-3.5 h-3.5" /> Temps moyen</div>
          <div className="text-xl font-bold mt-1 text-amber-600">{tempsMoyen}h</div>
          <div className="text-[10px] text-muted-foreground">{data.totalTraitees} traitées</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><AlertTriangle className="w-3.5 h-3.5" /> Bloquantes 7j</div>
          <div className="text-xl font-bold mt-1 text-red-600">{evolution.reduce((s: number, e: any) => s + e.bloquantes, 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Users className="w-3.5 h-3.5" /> Clôturées 7j</div>
          <div className="text-xl font-bold mt-1 text-emerald-600">{evolution.reduce((s: number, e: any) => s + e.cloturees, 0)}</div>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Évolution des alertes (7 jours)</CardTitle>
            <CardDescription className="text-xs">Ouvertes, clôturées et bloquantes par jour</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolution} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradOuvertes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCloturees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="oklch(0.6 0 0)" tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.6 0 0)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0 0)', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="ouvertes" stroke="#f59e0b" strokeWidth={2} fill="url(#gradOuvertes)" name="Ouvertes" />
                <Area type="monotone" dataKey="cloturees" stroke="#10b981" strokeWidth={2} fill="url(#gradCloturees)" name="Clôturées" />
                <Area type="monotone" dataKey="bloquantes" stroke="#ef4444" strokeWidth={2} fill="none" name="Bloquantes" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Par sévérité */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Répartition par sévérité</CardTitle>
            <CardDescription className="text-xs">Distribution des niveaux d'urgence</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {pieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0 0)', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {pieData.map((p: any) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="ml-auto font-semibold tabular-nums">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Par catégorie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alertes par catégorie</CardTitle>
            <CardDescription className="text-xs">Types de règles déclenchées</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={parCategorie} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="oklch(0.6 0 0)" />
                <YAxis type="category" dataKey="categorie" tick={{ fontSize: 9 }} stroke="oklch(0.6 0 0)" width={80} tickFormatter={(v) => CATEGORIE_ALERTE_LABELS[v]?.slice(0, 12) || v} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0 0)', fontSize: 11 }}
                  formatter={(v: any, _n, p: any) => [v, CATEGORIE_ALERTE_LABELS[p.payload.categorie] || p.payload.categorie]}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 5 clients par alertes</CardTitle>
            <CardDescription className="text-xs">Clients générant le plus d'alertes</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {topClients.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Aucune donnée</div>
              ) : (
                topClients.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{c.nom} {c.prenom}</div>
                      <div className="text-[11px] text-muted-foreground">{c.code}</div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                      {c.count} alerte{c.count > 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
