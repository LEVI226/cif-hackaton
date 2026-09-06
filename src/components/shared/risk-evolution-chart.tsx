'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatFCFA, formatDateTime } from '@/lib/format'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts'

interface RiskEvolutionChartProps {
  clientId: string
}

export function RiskEvolutionChart({ clientId }: RiskEvolutionChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['client-risk-evolution', clientId],
    queryFn: async () => {
      const r = await fetch(`/api/clients/${clientId}/risk-evolution`)
      return r.json()
    },
  })

  if (isLoading || !data) {
    return <div className="h-48 rounded-xl bg-muted animate-pulse" />
  }

  const evolution = data.evolution || []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Évolution du risque dans le temps
        </CardTitle>
        <CardDescription className="text-xs">
          Score de risque basé sur les transactions sur 30 jours
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={evolution} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="oklch(0.6 0 0)" tickFormatter={(d) => d.slice(5)} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="oklch(0.6 0 0)" />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0 0)', fontSize: 11 }}
              formatter={(v: any) => [`${v}/100`, 'Score']}
            />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Élevé', fontSize: 9, fill: '#ef4444' }} />
            <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Moyen', fontSize: 9, fill: '#f59e0b' }} />
            <Area type="monotone" dataKey="score" stroke="#f97316" strokeWidth={2} fill="url(#gradRisk)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {evolution.length} points · Dernière mise à jour: {evolution[evolution.length - 1]?.date || '—'}
        </div>
      </CardContent>
    </Card>
  )
}
