'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { timeAgo, formatFCFA } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  Ban, Bell, ArrowLeftRight, Search, UserPlus, History,
  Activity as ActivityIcon, ChevronRight, Zap
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

const ICONS: Record<string, any> = {
  Ban, Bell, ArrowLeftRight, Search, UserPlus, History,
}

const COLORS: Record<string, string> = {
  red: 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  orange: 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400',
  amber: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  sky: 'bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
}

const TYPE_COLORS: Record<string, string> = {
  ALERTE: 'text-red-600 dark:text-red-400',
  TRANSACTION: 'text-amber-600 dark:text-amber-400',
  SCREENING: 'text-purple-600 dark:text-purple-400',
  CLIENT: 'text-emerald-600 dark:text-emerald-400',
  AUDIT: 'text-sky-600 dark:text-sky-400',
}

export function ActivityFeed() {
  const setView = useAppStore((s) => s.setView)
  const setClientId = useAppStore((s) => s.setClientId)
  const setAlerteId = useAppStore((s) => s.setAlerteId)
  const setTransactionId = useAppStore((s) => s.setTransactionId)

  const { data, isLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: async () => {
      const r = await fetch('/api/activity?limit=25')
      return r.json()
    },
    refetchInterval: 30_000,
  })

  function handleClick(activity: any) {
    if (activity.type === 'CLIENT' && activity.clientId) {
      setClientId(activity.clientId)
      setView('clients')
    } else if (activity.type === 'ALERTE') {
      // Find the alerte ID from the activity id
      const id = activity.id.replace('alerte-', '')
      setAlerteId(id)
      setView('alertes')
    } else if (activity.type === 'TRANSACTION') {
      const id = activity.id.replace('trx-', '')
      setTransactionId(id)
    }
  }

  const activities = data?.activities || []

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="relative">
                <ActivityIcon className="w-4 h-4 text-primary" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              Flux d'activité en temps réel
            </CardTitle>
            <CardDescription className="text-xs">
              {data?.total || 0} événement(s) dans les dernières 24h
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
            <Zap className="w-3 h-3 mr-1" /> Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[420px] pr-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-2 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ActivityIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune activité récente</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-1">
                {activities.map((activity: any, i: number) => {
                  const Icon = ICONS[activity.icon] || ActivityIcon
                  return (
                    <button
                      key={activity.id}
                      onClick={() => handleClick(activity)}
                      className="relative flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors w-full text-left group animate-fade-in"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      {/* Icon with timeline dot */}
                      <div className="relative shrink-0">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center ring-4 ring-background',
                          COLORS[activity.color] || COLORS.sky
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[10px] font-bold uppercase tracking-wider', TYPE_COLORS[activity.type])}>
                            {activity.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
                            {timeAgo(activity.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm font-medium truncate mt-0.5">{activity.titre}</div>
                        <div className="text-xs text-muted-foreground truncate">{activity.description}</div>

                        {/* Metadata badges */}
                        {activity.metadata && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {activity.metadata.reference && (
                              <Badge variant="outline" className="text-[9px] font-mono h-4 px-1">
                                {activity.metadata.reference}
                              </Badge>
                            )}
                            {activity.metadata.montant && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1">
                                {formatFCFA(activity.metadata.montant)}
                              </Badge>
                            )}
                            {activity.metadata.severite && (
                              <Badge variant="outline" className={cn('text-[9px] h-4 px-1', COLORS[activity.color])}>
                                {activity.metadata.severite}
                              </Badge>
                            )}
                            {activity.metadata.nombreMatch > 0 && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 bg-red-50 text-red-700">
                                {activity.metadata.nombreMatch} match
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
