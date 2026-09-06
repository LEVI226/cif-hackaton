'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCircle2, AlertTriangle, Ban, Clock, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/lib/store'
import { useRealtime } from '@/hooks/use-realtime'
import { formatFCFA, timeAgo, CATEGORIE_ALERTE_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export function NotificationCenter() {
  const setView = useAppStore((s) => s.setView)
  const setAlerteId = useAppStore((s) => s.setAlerteId)
  const { alerts: realtimeAlerts, connected } = useRealtime()

  const { data, refetch } = useQuery({
    queryKey: ['header-alertes'],
    queryFn: async () => {
      const r = await fetch('/api/alertes?statut=OUVERTE&limit=10')
      return r.json()
    },
    refetchInterval: 30_000,
  })

  const alertes = data?.data || []
  const totalCount = data?.total || 0
  const realtimeCount = realtimeAlerts.length

  function openAlerte(id: string) {
    setAlerteId(id)
    setView('alertes')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {totalCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-bounce-soft"
              suppressHydrationWarning
            >
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
          {connected && (
            <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div>
            <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {totalCount} alerte{totalCount > 1 ? 's' : ''} ouverte{totalCount > 1 ? 's' : ''} · {realtimeCount} temps réel
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
              connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
            )} suppressHydrationWarning>
              <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400')} />
              {connected ? 'Live' : 'Off'}
            </span>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-1">
            {/* Real-time alerts */}
            {realtimeAlerts.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  Temps réel ({realtimeAlerts.length})
                </div>
                {realtimeAlerts.slice(0, 3).map((a, i) => (
                  <button
                    key={`rt-${i}`}
                    onClick={() => openAlerte(a.id)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-accent transition-colors border border-violet-200/50 dark:border-violet-800/50 bg-violet-50/30 dark:bg-violet-950/10"
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                        a.type === 'BLOQUANTE' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-amber-100 dark:bg-amber-950/40'
                      )}>
                        {a.type === 'BLOQUANTE' ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{a.titre}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {a.client || a.description}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />{timeAgo(a.timestamp)}
                          </span>
                          {a.montant && <span className="text-[10px] font-semibold">{formatFCFA(a.montant)}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            {/* Recent alerts from DB */}
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Alertes récentes
            </div>
            {alertes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs">Aucune alerte ouverte</p>
              </div>
            ) : (
              alertes.map((a: any) => (
                <button
                  key={a.id}
                  onClick={() => openAlerte(a.id)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-accent transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      a.type === 'BLOQUANTE' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-sky-100 dark:bg-sky-950/40'
                    )}>
                      {a.type === 'BLOQUANTE' ? <Ban className="w-3.5 h-3.5 text-red-600" /> : <Bell className="w-3.5 h-3.5 text-sky-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{a.titre}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {a.client ? `${a.client.nom} ${a.client.prenom}` : a.description}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {CATEGORIE_ALERTE_LABELS[a.categorie] || a.categorie}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setView('alertes')}
          >
            Voir toutes les alertes
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
