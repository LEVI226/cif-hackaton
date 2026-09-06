'use client'

import { ShieldCheck, Heart, Activity, Server, Database, Zap } from 'lucide-react'
import { useAppStore, type ViewName } from '@/lib/store'
import { cn } from '@/lib/utils'

export function Footer() {
  const setView = useAppStore((s) => s.setView)

  const quickLinks: Array<{ label: string; view: ViewName }> = [
    { label: 'Dashboard', view: 'dashboard' },
    { label: 'Clients', view: 'clients' },
    { label: 'Transactions', view: 'transactions' },
    { label: 'Alertes', view: 'alertes' },
    { label: 'Screening', view: 'screening' },
    { label: 'Rapports', view: 'rapports' },
    { label: 'Calendrier', view: 'calendrier' },
    { label: 'Paramètres', view: 'parametres' },
  ]

  return (
    <footer className="mt-auto border-t border-border bg-card/50 px-4 md:px-6 py-3">
      <div className="max-w-[1600px] mx-auto space-y-2">
        {/* Quick links row */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-2">Accès rapide:</span>
          {quickLinks.map((link, i) => (
            <button
              key={link.view}
              onClick={() => setView(link.view)}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-medium transition-colors hover:bg-accent hover:text-foreground',
                i === 0 && 'text-primary'
              )}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Main footer row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">CIF Sentinel</span>
            <span className="text-muted-foreground/50">·</span>
            <span>Plateforme de conformité LBC/FT/FP</span>
          </div>

          {/* System status indicators */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Server className="w-3 h-3" />
              <span>API</span>
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Database className="w-3 h-3" />
              <span>DB</span>
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Zap className="w-3 h-3" />
              <span>WebSocket</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>DigiCoop-WA+</span>
            <span className="text-muted-foreground/50">·</span>
            <span>v1.0.0</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="flex items-center gap-1">
              Conçu avec <Heart className="w-3 h-3 fill-red-500 text-red-500" /> pour les IMF de l'UEMOA
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
