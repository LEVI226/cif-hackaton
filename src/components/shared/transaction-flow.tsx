'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatFCFA, formatCompact } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  ArrowDownRight, ArrowUpRight, Wallet, TrendingUp, ArrowLeftRight,
  Globe2, Building2, Smartphone, Wifi
} from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  DEPOT: 'Dépôt',
  RETRAIT: 'Retrait',
  VIREMENT: 'Virement',
  CHANGE: 'Change',
  TRANSFERT: 'Transfert',
}

const TYPE_COLORS: Record<string, string> = {
  DEPOT: '#10b981',
  RETRAIT: '#ef4444',
  VIREMENT: '#0ea5e9',
  CHANGE: '#f59e0b',
  TRANSFERT: '#a855f7',
}

const CANAL_ICONS: Record<string, any> = {
  AGENCE: Building2,
  MOBILE: Smartphone,
  INTERNET: Wifi,
  ATM: Wallet,
}

export function TransactionFlow() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-widgets'],
    queryFn: async () => {
      const r = await fetch('/api/dashboard/widgets')
      return r.json()
    },
    staleTime: 60_000,
  })

  if (isLoading || !data) {
    return <Card><CardContent className="py-8"><div className="h-64 rounded-xl bg-muted animate-pulse" /></CardContent></Card>
  }

  const flowData = data.flowByType || []
  const canalData = data.canalDist || []
  const totalVolume = flowData.reduce((s: number, f: any) => s + f.entree + f.sortie, 0)
  const totalEntree = flowData.reduce((s: number, f: any) => s + f.entree, 0)
  const totalSortie = flowData.reduce((s: number, f: any) => s + f.sortie, 0)

  // Calculate proportions for the flow diagram
  const maxFlow = Math.max(...flowData.map((f: any) => Math.max(f.entree, f.sortie)), 1)

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              Flux des transactions
            </CardTitle>
            <CardDescription className="text-xs">
              Entrées et sorties par type · 30 derniers jours
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums">{formatCompact(totalVolume)}</div>
            <div className="text-[10px] text-muted-foreground">Volume total (FCFA)</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {/* Flow visualization */}
        <div className="space-y-2">
          {flowData.map((flow: any, i: number) => {
            const entreePct = (flow.entree / maxFlow) * 100
            const sortiePct = (flow.sortie / maxFlow) * 100
            const color = TYPE_COLORS[flow.type] || '#999'
            const total = flow.entree + flow.sortie
            const pctOfTotal = totalVolume > 0 ? (total / totalVolume) * 100 : 0

            return (
              <div
                key={flow.type}
                className="group rounded-lg border p-3 hover:border-primary/30 transition-all animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ background: color }}
                    />
                    <span className="text-sm font-medium">{TYPE_LABELS[flow.type] || flow.type}</span>
                    <Badge variant="outline" className="text-[9px]">{flow.count} trx</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {pctOfTotal.toFixed(1)}% du total
                  </span>
                </div>

                {/* Flow bars */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Entrée */}
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 mb-1">
                      <ArrowDownRight className="w-3 h-3" />
                      <span>Entrée</span>
                      <span className="ml-auto font-semibold tabular-nums">{formatCompact(flow.entree)}</span>
                    </div>
                    <div className="h-6 rounded-md bg-muted/30 overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-700 ease-out flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max(entreePct, flow.entree > 0 ? 8 : 0)}%`,
                          background: `linear-gradient(90deg, ${color}40, ${color})`,
                        }}
                      >
                        {flow.entree > 0 && entreePct > 15 && (
                          <span className="text-[9px] text-white font-medium tabular-nums">
                            {formatFCFA(flow.entree).replace(' FCFA', '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sortie */}
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-red-600 mb-1">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Sortie</span>
                      <span className="ml-auto font-semibold tabular-nums">{formatCompact(flow.sortie)}</span>
                    </div>
                    <div className="h-6 rounded-md bg-muted/30 overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-700 ease-out flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max(sortiePct, flow.sortie > 0 ? 8 : 0)}%`,
                          background: `linear-gradient(90deg, ${color}40, ${color})`,
                          opacity: 0.7,
                        }}
                      >
                        {flow.sortie > 0 && sortiePct > 15 && (
                          <span className="text-[9px] text-white font-medium tabular-nums">
                            {formatFCFA(flow.sortie).replace(' FCFA', '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Canal distribution */}
        <div className="pt-3 border-t">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Répartition par canal
          </div>
          <div className="grid grid-cols-4 gap-2">
            {canalData.map((c: any) => {
              const Icon = CANAL_ICONS[c.canal] || Globe2
              const total = canalData.reduce((s: number, cc: any) => s + cc.count, 0)
              const pct = total > 0 ? (c.count / total) * 100 : 0
              return (
                <div key={c.canal} className="text-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <Icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-sm font-bold tabular-nums">{c.count}</div>
                  <div className="text-[9px] text-muted-foreground">{c.canal}</div>
                  <div className="text-[9px] text-primary font-medium">{pct.toFixed(0)}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="pt-3 border-t grid grid-cols-2 gap-3">
          <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-600">
              <ArrowDownRight className="w-3 h-3" />
              Total entrées
            </div>
            <div className="text-lg font-bold text-emerald-600 tabular-nums">{formatCompact(totalEntree)}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
            <div className="flex items-center justify-center gap-1 text-[10px] text-red-600">
              <ArrowUpRight className="w-3 h-3" />
              Total sorties
            </div>
            <div className="text-lg font-bold text-red-600 tabular-nums">{formatCompact(totalSortie)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
