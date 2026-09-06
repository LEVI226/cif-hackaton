'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatFCFA, formatNumber } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { Grid3x3, TrendingUp, Users } from 'lucide-react'

export function RiskHeatmap() {
  const setClientId = useAppStore((s) => s.setClientId)
  const setView = useAppStore((s) => s.setView)

  const { data, isLoading } = useQuery({
    queryKey: ['clients-heatmap'],
    queryFn: async () => {
      const r = await fetch('/api/clients?limit=100')
      return r.json()
    },
    staleTime: 60_000,
  })

  if (isLoading || !data) {
    return <div className="h-80 rounded-xl bg-muted animate-pulse" />
  }

  const clients = data.data || []

  // Create a grid: X = scoreRisque (0-100), Y = soldeGlobal (0-max)
  const maxSolde = Math.max(...clients.map((c: any) => c.soldeGlobal || 0), 1)
  const gridSize = 10

  // Group clients into grid cells
  const grid: Array<Array<{ clients: any[]; count: number }>> = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({ clients: [], count: 0 }))
  )

  for (const c of clients) {
    const score = c.scoreRisque || 0
    const solde = c.soldeGlobal || 0
    const x = Math.min(gridSize - 1, Math.floor((score / 100) * gridSize))
    const y = Math.min(gridSize - 1, Math.floor((solde / maxSolde) * gridSize))
    grid[y][x].clients.push(c)
    grid[y][x].count++
  }

  const maxCount = Math.max(...grid.flat().map((c) => c.count), 1)

  function getColor(count: number): string {
    if (count === 0) return 'bg-muted/30'
    const intensity = count / maxCount
    if (intensity > 0.75) return 'bg-red-500 dark:bg-red-600'
    if (intensity > 0.5) return 'bg-orange-400 dark:bg-orange-500'
    if (intensity > 0.25) return 'bg-amber-300 dark:bg-amber-400'
    if (intensity > 0.1) return 'bg-emerald-200 dark:bg-emerald-700'
    return 'bg-emerald-100 dark:bg-emerald-900'
  }

  function getTextColor(count: number): string {
    if (count === 0) return 'text-muted-foreground/30'
    return count / maxCount > 0.5 ? 'text-white' : 'text-foreground'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Grid3x3 className="w-4 h-4 text-primary" />
              Carte de chaleur des risques clients
            </CardTitle>
            <CardDescription className="text-xs">
              Score de risque vs solde global · {clients.length} clients analysés
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 dark:bg-emerald-900" /> Faible</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300" /> Moyen</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400" /> Élevé</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Critique</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {/* Y-axis label */}
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-muted-foreground -rotate-90 origin-center whitespace-nowrap font-medium w-6 flex items-center justify-center">
              <span>Solde →</span>
            </div>
            <div className="flex-1">
              {/* Grid */}
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
                {grid.flatMap((row, y) =>
                  row.map((cell, x) => (
                    <button
                      key={`${y}-${x}`}
                      onClick={() => {
                        if (cell.clients.length > 0) {
                          setClientId(cell.clients[0].id)
                          setView('clients')
                        }
                      }}
                      disabled={cell.count === 0}
                      className={cn(
                        'aspect-square rounded-sm transition-all relative group',
                        getColor(cell.count),
                        cell.count > 0 && 'hover:ring-2 hover:ring-primary hover:scale-110 cursor-pointer'
                      )}
                      title={cell.count > 0 ? `${cell.count} client(s) · Score ${x * 10}-${(x + 1) * 10} · Solde ${formatFCFA((y * maxSolde) / gridSize)}` : 'Aucun client'}
                    >
                      {cell.count > 0 && (
                        <span className={cn('text-[10px] font-bold absolute inset-0 flex items-center justify-center', getTextColor(cell.count))}>
                          {cell.count}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
              {/* X-axis label */}
              <div className="text-[10px] text-muted-foreground text-center mt-1 font-medium">
                Score de risque →
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Faible</div>
              <div className="text-lg font-bold text-emerald-600">{clients.filter((c: any) => c.niveauRisque === 'FAIBLE').length}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Moyen</div>
              <div className="text-lg font-bold text-amber-600">{clients.filter((c: any) => c.niveauRisque === 'MOYEN').length}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Élevé</div>
              <div className="text-lg font-bold text-red-600">{clients.filter((c: any) => c.niveauRisque === 'ELEVE').length}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
