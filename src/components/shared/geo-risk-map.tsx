'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatFCFA, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Globe2, AlertTriangle, TrendingUp, MapPin } from 'lucide-react'

// Pays à risque élevé (embargo/sanctions)
const PAYS_RISQUE_ELEVE = [
  { nom: 'Iran', code: 'IR', niveau: 'CRITIQUE', motif: 'Embargo international' },
  { nom: 'Corée du Nord', code: 'KP', niveau: 'CRITIQUE', motif: 'Sanctions ONU' },
  { nom: 'Syrie', code: 'SY', niveau: 'CRITIQUE', motif: 'Sanctions UE' },
  { nom: 'Soudan', code: 'SD', niveau: 'ÉLEVÉ', motif: 'Juridiction sous surveillance' },
  { nom: 'Yémen', code: 'YE', niveau: 'ÉLEVÉ', motif: 'Conflit armé' },
  { nom: 'Somalie', code: 'SO', niveau: 'ÉLEVÉ', motif: 'État défaillant' },
  { nom: 'Afghanistan', code: 'AF', niveau: 'ÉLEVÉ', motif: 'Financement terrorisme' },
]

// Pays UEMOA (membres)
const PAYS_UEMOA = [
  { nom: 'Burkina Faso', code: 'BF' },
  { nom: 'Mali', code: 'ML' },
  { nom: 'Sénégal', code: 'SN' },
  { nom: 'Côte d\'Ivoire', code: 'CI' },
  { nom: 'Togo', code: 'TG' },
  { nom: 'Bénin', code: 'BJ' },
  { nom: 'Niger', code: 'NE' },
  { nom: 'Guinée-Bissau', code: 'GW' },
]

interface GeoRiskMapProps {
  transactions?: any[]
}

export function GeoRiskMap({ transactions: propTrx }: GeoRiskMapProps) {
  const { data } = useQuery({
    queryKey: ['transactions-geo'],
    queryFn: async () => {
      const r = await fetch('/api/transactions?limit=200')
      return r.json()
    },
    staleTime: 60_000,
  })

  const transactions = propTrx || data?.data || []
  const trxWithCountry = transactions.filter((t: any) => t.paysContrepartie)

  // Grouper par pays
  const parPays: Record<string, { count: number; montant: number; suspectes: number }> = {}
  trxWithCountry.forEach((t: any) => {
    const p = t.paysContrepartie
    if (!parPays[p]) parPays[p] = { count: 0, montant: 0, suspectes: 0 }
    parPays[p].count++
    parPays[p].montant += t.montant
    if (t.estSuspecte || t.statut === 'BLOQUEE') parPays[p].suspectes++
  })

  const paysRisqueActifs = PAYS_RISQUE_ELEVE.filter(p => parPays[p.nom])
  const paysUEMOAActifs = PAYS_UEMOA.filter(p => parPays[p.nom])
  const autresPays = Object.keys(parPays).filter(p =>
    !PAYS_RISQUE_ELEVE.find(r => r.nom === p) && !PAYS_UEMOA.find(u => u.nom === p)
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-primary" />
              Cartographie des risques géographiques
            </CardTitle>
            <CardDescription className="text-xs">
              Transactions par pays de contrepartie · {trxWithCountry.length} transactions internationales
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Risque élevé</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> UEMOA</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Autres</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 space-y-3">
        {/* Pays à risque élevé */}
        {paysRisqueActifs.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Pays sous embargo / sanctions ({paysRisqueActifs.length})
            </div>
            <div className="space-y-1.5">
              {paysRisqueActifs.map(p => {
                const data = parPays[p.nom]
                return (
                  <div key={p.code} className="flex items-center gap-3 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-300">{p.code}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{p.nom}</span>
                        <Badge variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300">{p.niveau}</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.motif}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-red-600 dark:text-red-400">{formatFCFA(data.montant)}</div>
                      <div className="text-[10px] text-muted-foreground">{data.count} trx · {data.suspectes} suspecte(s)</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pays UEMOA */}
        {paysUEMOAActifs.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Espace UEMOA ({paysUEMOAActifs.length})
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {paysUEMOAActifs.map(p => {
                const data = parPays[p.nom]
                return (
                  <div key={p.code} className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">{p.code}</span>
                      <span className="text-xs font-medium truncate">{p.nom}</span>
                    </div>
                    <div className="text-sm font-bold mt-1">{formatFCFA(data.montant)}</div>
                    <div className="text-[10px] text-muted-foreground">{data.count} trx</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Autres pays */}
        {autresPays.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 mb-1.5 flex items-center gap-1">
              <Globe2 className="w-3.5 h-3.5" />
              Autres juridictions ({autresPays.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {autresPays.map(p => {
                const data = parPays[p]
                return (
                  <div key={p} className="px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs">
                    <span className="font-medium">{p}</span>
                    <span className="text-muted-foreground ml-1.5">· {data.count} trx · {formatFCFA(data.montant)}</span>
                    {data.suspectes > 0 && <span className="ml-1 text-red-600">⚠ {data.suspectes}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {trxWithCountry.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Globe2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Aucune transaction internationale détectée
          </div>
        )}
      </CardContent>
    </Card>
  )
}
