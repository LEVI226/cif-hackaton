'use client'

import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatFCFA, formatNumber, formatCompact } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  ShieldCheck, TrendingUp, AlertTriangle, Users, ArrowLeftRight,
  Bell, ChevronRight, Sparkles
} from 'lucide-react'

export function DashboardHero() {
  const setView = useAppStore((s) => s.setView)

  const { data } = useQuery({
    queryKey: ['dashboard-hero'],
    queryFn: async () => {
      const r = await fetch('/api/dashboard')
      return r.json()
    },
    staleTime: 30_000,
  })

  const k = data?.kpis || {}
  const complianceScore = Math.max(0, 100 - Math.round((k.alertesOuvertes * 2) + (k.alertesCritiques * 5) + (k.transactionsBloquees * 1.5)))
  const scoreColor = complianceScore >= 80 ? 'text-emerald-300' : complianceScore >= 60 ? 'text-amber-300' : 'text-red-300'
  const scoreBg = complianceScore >= 80 ? 'from-emerald-600/20' : complianceScore >= 60 ? 'from-amber-600/20' : 'from-red-600/20'

  return (
    <Card className={cn(
      'relative overflow-hidden border-0 bg-gradient-to-br to-transparent dark:to-background/50',
      scoreBg
    )}>
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2" />

      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left: Title and status */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                Système actif
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 backdrop-blur-sm">
                <ShieldCheck className="w-3 h-3 mr-1" />
                LBC/FT/FP
              </Badge>
              {k.alertesCritiques > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 backdrop-blur-sm animate-bounce-soft">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {k.alertesCritiques} critique{k.alertesCritiques > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              CIF Sentinel
              <span className="ml-2 text-base font-normal text-muted-foreground">· Conformité</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Plateforme de filtrage des clients et de lutte contre le blanchiment de capitaux,
              le financement du terrorisme et la prolifération des armes de destruction massive.
            </p>
          </div>

          {/* Right: Compliance score */}
          <div className="text-center px-6 py-3 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/50">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Score Conformité</div>
            <div className={cn('text-4xl font-bold tabular-nums', scoreColor)}>
              {complianceScore}
            </div>
            <div className="text-[10px] text-muted-foreground">/ 100</div>
          </div>
        </div>

        {/* Quick metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <button
            onClick={() => setView('clients')}
            className="group flex items-center gap-3 p-3 rounded-xl bg-background/40 backdrop-blur-sm border border-border/30 hover:bg-background/70 hover:border-primary/30 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold tabular-nums">{formatNumber(k.totalClients)}</div>
              <div className="text-[10px] text-muted-foreground">Clients</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </button>

          <button
            onClick={() => setView('transactions')}
            className="group flex items-center gap-3 p-3 rounded-xl bg-background/40 backdrop-blur-sm border border-border/30 hover:bg-background/70 hover:border-primary/30 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-4 h-4 text-sky-600" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold tabular-nums">{formatNumber(k.transactions30j)}</div>
              <div className="text-[10px] text-muted-foreground">Transactions 30j</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </button>

          <button
            onClick={() => setView('alertes')}
            className="group flex items-center gap-3 p-3 rounded-xl bg-background/40 backdrop-blur-sm border border-border/30 hover:bg-background/70 hover:border-primary/30 transition-all text-left"
          >
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              k.alertesOuvertes > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'
            )}>
              <Bell className={cn('w-4 h-4', k.alertesOuvertes > 0 ? 'text-amber-600' : 'text-emerald-600')} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold tabular-nums">{formatNumber(k.alertesOuvertes)}</div>
              <div className="text-[10px] text-muted-foreground">Alertes ouvertes</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </button>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-background/40 backdrop-blur-sm border border-border/30">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold tabular-nums">{formatCompact(k.volume30j)}</div>
              <div className="text-[10px] text-muted-foreground">Volume 30j (FCFA)</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              CIF COOP-CA · IFU: 00019733Z
            </span>
            <span>·</span>
            <span>Espace UEMOA · BCEAO</span>
          </div>
          <span>Mis à jour il y a quelques secondes</span>
        </div>
      </div>
    </Card>
  )
}
