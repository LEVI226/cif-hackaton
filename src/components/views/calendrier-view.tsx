'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Calendar, ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle2,
  FileText, Shield, Globe2, GraduationCap, Building2, AlertTriangle,
  CalendarDays, AlarmClock
} from 'lucide-react'

const STATUT_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  EN_RETARD: { color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800', icon: AlertCircle, label: 'En retard' },
  URGENT: { color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800', icon: AlarmClock, label: 'Urgent' },
  PROCHE: { color: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800', icon: Clock, label: 'Proche' },
  A_VENIR: { color: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800', icon: CheckCircle2, label: 'À venir' },
}

const CATEGORIE_ICON: Record<string, any> = {
  BCEAO: Globe2,
  GIABA: Shield,
  EXTERNE: Building2,
  INTERNE: FileText,
  FORMATION: GraduationCap,
}

const PERIODICITE_LABEL: Record<string, string> = {
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
  SEMESTRIEL: 'Semestriel',
  ANNUEL: 'Annuel',
}

export function CalendrierView() {
  const now = new Date()
  const [moisSelectionne, setMoisSelectionne] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )

  const { data, isLoading } = useQuery({
    queryKey: ['calendrier', moisSelectionne],
    queryFn: async () => {
      const r = await fetch(`/api/calendrier?mois=${moisSelectionne}`)
      return r.json()
    },
  })

  function navigateMois(delta: number) {
    const [annee, mois] = moisSelectionne.split('-').map(Number)
    const d = new Date(annee, mois - 1 + delta, 1)
    setMoisSelectionne(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const moisLabel = new Date(moisSelectionne + '-01').toLocaleDateString('fr-FR', {
    month: 'long', year: 'numeric'
  })

  return (
    <div className="space-y-4">
      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Calendar className="w-3.5 h-3.5" /> Échéances du mois</div>
          <div className="text-xl font-bold mt-1">{data?.total || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" /> En retard</div>
          <div className="text-xl font-bold mt-1 text-red-600">{data?.enRetard || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><AlarmClock className="w-3.5 h-3.5" /> Urgents (≤3j)</div>
          <div className="text-xl font-bold mt-1 text-orange-600">{data?.urgents || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Clock className="w-3.5 h-3.5" /> À traiter</div>
          <div className="text-xl font-bold mt-1 text-amber-600">{data?.echeances?.filter((e: any) => e.statut !== 'A_VENIR').length || 0}</div>
        </Card>
      </div>

      {/* Navigation mois */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMois(-1)} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </Button>
          <h2 className="text-lg font-bold capitalize">{moisLabel}</h2>
          <Button variant="outline" size="sm" onClick={() => navigateMois(1)} className="gap-1">
            Suivant <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMoisSelectionne(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)}
        >
          Aujourd'hui
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste des échéances */}
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Échéances réglementaires
              </CardTitle>
              <CardDescription className="text-xs">
                Obligations LBC/FT/FP · BCEAO · GIABA · GAFI
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
                ))
              ) : (data?.echeances || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <div className="font-medium">Aucune échéance ce mois</div>
                </div>
              ) : (
                (data?.echeances || []).map((echeance: any) => {
                  const config = STATUT_CONFIG[echeance.statut] || STATUT_CONFIG.A_VENIR
                  const Icon = config.icon
                  const CatIcon = CATEGORIE_ICON[echeance.categorie] || FileText
                  return (
                    <div
                      key={echeance.id}
                      className={cn('rounded-xl border-2 p-4 transition-all hover:shadow-md', config.color)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-black/20 flex items-center justify-center shrink-0">
                          <CatIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-sm">{echeance.titre}</h3>
                            <Badge variant="outline" className="text-[10px] bg-white/50 dark:bg-black/20">
                              {PERIODICITE_LABEL[echeance.periodicite] || echeance.periodicite}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-white/50 dark:bg-black/20">
                              {echeance.categorie}
                            </Badge>
                          </div>
                          <p className="text-xs opacity-80 mb-2">{echeance.description}</p>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 font-medium">
                              <Icon className="w-3.5 h-3.5" />
                              {new Date(echeance.dateEcheance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className={cn(
                              'font-bold px-2 py-0.5 rounded-full text-[11px]',
                              echeance.statut === 'EN_RETARD' ? 'bg-red-200/50 dark:bg-red-900/50' : ''
                            )}>
                              {config.label}
                              {echeance.joursRestants < 0 ? ` (${Math.abs(echeance.joursRestants)}j retard)` : ` (${echeance.joursRestants}j)`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vue annuelle */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vue annuelle {new Date(moisSelectionne).getFullYear()}</CardTitle>
              <CardDescription className="text-xs">Répartition des échéances par mois</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-3 gap-2">
                {(data?.calendrierAnnuel || []).map((m: any) => (
                  <button
                    key={m.mois}
                    onClick={() => setMoisSelectionne(`${new Date(moisSelectionne).getFullYear()}-${String(m.mois).padStart(2, '0')}`)}
                    className={cn(
                      'p-3 rounded-xl border text-center transition-all hover:shadow-md',
                      m.isCurrent ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-border hover:bg-accent/50'
                    )}
                  >
                    <div className="text-xs font-medium capitalize">{m.nom.slice(0, 4)}</div>
                    <div className="text-lg font-bold mt-1">{m.nbEcheances}</div>
                    <div className="text-[10px] text-muted-foreground">échéance{m.nbEcheances > 1 ? 's' : ''}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Légende */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Légende des statuts</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-2">
              {Object.entries(STATUT_CONFIG).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <div key={key} className={cn('flex items-center gap-2 p-2 rounded-lg border', config.color)}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="text-xs font-medium">{config.label}</div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Obligations récurrentes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Obligations réglementaires</CardTitle>
              <CardDescription className="text-xs">Cadre BCEAO / GIABA / GAFI</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-2 text-xs">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <Globe2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">BCEAO</div>
                  <div className="text-muted-foreground">Banque Centrale des États de l'Afrique de l'Ouest</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">GIABA</div>
                  <div className="text-muted-foreground">Groupe d'Action Financière contre le blanchiment en Afrique de l'Ouest</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <Building2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">GAFI</div>
                  <div className="text-muted-foreground">Groupe d'Action Financière International</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
