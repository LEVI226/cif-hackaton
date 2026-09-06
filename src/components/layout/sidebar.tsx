'use client'

import { useAppStore, type ViewName } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, ArrowLeftRight, Bell, Search,
  FileText, Shield, History, ShieldCheck, ChevronRight, Calendar, GitCompare
} from 'lucide-react'

const navItems: Array<{ id: ViewName; label: string; icon: any; description: string }> = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, description: 'Vue d\'ensemble' },
  { id: 'clients', label: 'Clients', icon: Users, description: 'Profilage & KYC' },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, description: 'Monitoring temps réel' },
  { id: 'alertes', label: 'Alertes', icon: Bell, description: 'Gestion des alertes' },
  { id: 'screening', label: 'Screening', icon: Search, description: 'PPE & Sanctions' },
  { id: 'comparaison', label: 'Comparaison', icon: GitCompare, description: 'Comparer les clients' },
  { id: 'rapports', label: 'Rapports', icon: FileText, description: 'Conformité & SAR' },
  { id: 'calendrier', label: 'Calendrier', icon: Calendar, description: 'Échéances réglementaires' },
  { id: 'regles', label: 'Règles', icon: Shield, description: 'Configuration' },
  { id: 'audit', label: 'Audit', icon: History, description: 'Journal d\'audit' },
]

export function Sidebar() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border sticky top-0 h-screen">
      {/* Logo / Brand */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2.2} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-sidebar" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base tracking-tight text-white leading-tight">CIF Sentinel</div>
            <div className="text-[11px] text-sidebar-foreground/60 leading-tight">Conformité LBC/FT/FP</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Modules
        </div>
        {navItems.map((item, i) => {
          const Icon = item.icon
          const active = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                'w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all animate-stagger',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full bg-white/80" />
              )}
              <Icon className={cn('w-4.5 h-4.5 shrink-0 transition-transform', active ? 'scale-110' : 'group-hover:scale-105')} strokeWidth={2} />
              <div className="flex-1 text-left min-w-0">
                <div className="truncate">{item.label}</div>
                <div className={cn('text-[10px] truncate', active ? 'text-sidebar-primary-foreground/70' : 'text-sidebar-foreground/40')}>
                  {item.description}
                </div>
              </div>
              {active && <ChevronRight className="w-4 h-4 shrink-0 animate-slide-right" />}
            </button>
          )
        })}
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="rounded-lg bg-sidebar-accent/60 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-emerald-300">Système actif</span>
          </div>
          <div className="text-[10px] text-sidebar-foreground/50 leading-relaxed">
            Moteur de règles opérationnel. Surveillance 24/7 des transactions.
          </div>
        </div>
        <div className="text-[10px] text-sidebar-foreground/40 px-1">
          <div className="font-medium text-sidebar-foreground/60">CIF COOP-CA</div>
          <div>IFU: 00019733Z · BCEAO</div>
        </div>
      </div>
    </aside>
  )
}
