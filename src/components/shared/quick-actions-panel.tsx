'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  UserPlus, ArrowLeftRight, Search, FileText, Ban,
  ShieldAlert, Zap, Calendar, Plus, ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickAction {
  id: string
  label: string
  description: string
  icon: any
  color: string
  view?: any
  action?: () => void
}

export function QuickActionsPanel() {
  const setView = useAppStore((s) => s.setView)

  const actions: QuickAction[] = [
    {
      id: 'new-transaction',
      label: 'Nouvelle transaction',
      description: 'Soumettre une transaction pour évaluation',
      icon: ArrowLeftRight,
      color: 'from-emerald-500 to-teal-600',
      view: 'transactions',
    },
    {
      id: 'screening',
      label: 'Screening PPE',
      description: 'Vérifier un nom contre les listes',
      icon: Search,
      color: 'from-violet-500 to-fuchsia-600',
      view: 'screening',
    },
    {
      id: 'treat-alertes',
      label: 'Traiter alertes',
      description: 'Gérer les alertes en attente',
      icon: ShieldAlert,
      color: 'from-red-500 to-orange-600',
      view: 'alertes',
    },
    {
      id: 'generate-rapport',
      label: 'Générer rapport',
      description: 'Créer un rapport de conformité',
      icon: FileText,
      color: 'from-amber-500 to-yellow-600',
      view: 'rapports',
    },
    {
      id: 'view-calendrier',
      label: 'Échéances',
      description: 'Voir le calendrier réglementaire',
      icon: Calendar,
      color: 'from-sky-500 to-blue-600',
      view: 'calendrier',
    },
    {
      id: 'view-clients',
      label: 'Gestion clients',
      description: 'Profilage et KYC',
      icon: UserPlus,
      color: 'from-purple-500 to-indigo-600',
      view: 'clients',
    },
  ]

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Actions rapides
        </CardTitle>
        <CardDescription className="text-xs">Accès direct aux tâches de conformité fréquentes</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {actions.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => action.view && setView(action.view)}
                className="group relative overflow-hidden rounded-xl border p-3 text-left hover:border-primary/40 hover:bg-accent/30 transition-all animate-stagger"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2 group-hover:scale-110 transition-transform',
                  action.color
                )}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="text-xs font-semibold truncate">{action.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{action.description}</div>
                <ArrowRight className="w-3 h-3 text-muted-foreground absolute top-3 right-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
