'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatNumber, formatCompact } from '@/lib/format'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  RadialBarChart, RadialBar
} from 'recharts'
import { Shield, Users, AlertTriangle, TrendingUp, PieChart as PieIcon } from 'lucide-react'

const RISK_COLORS: Record<string, string> = {
  FAIBLE: '#10b981',
  MOYEN: '#f59e0b',
  ELEVE: '#f97316',
  PROHIBITIF: '#ef4444',
}

const STATUS_COLORS: Record<string, string> = {
  VALIDEE: '#10b981',
  BLOQUEE: '#ef4444',
  SUSPECTE: '#f59e0b',
  EN_ATTENTE: '#0ea5e9',
  REJETEE: '#6b7280',
}

const ALERT_TYPE_COLORS: Record<string, string> = {
  BLOQUANTE: '#ef4444',
  INFORMATIVE: '#0ea5e9',
}

export function ComplianceWidgets() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-widgets'],
    queryFn: async () => {
      const r = await fetch('/api/dashboard/widgets')
      return r.json()
    },
    staleTime: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  const riskData = Object.entries(data.riskDistribution || {}).map(([name, value]) => ({
    name,
    value: value as number,
    color: RISK_COLORS[name] || '#999',
  }))

  const statusData = (data.trxsStatus || []).map((s: any) => ({
    name: s.statut,
    value: s.count,
    color: STATUS_COLORS[s.statut] || '#999',
  }))

  const alertTypeData = (data.alertByType || []).map((a: any) => ({
    name: a.type === 'BLOQUANTE' ? 'Bloquantes' : 'Informatives',
    value: a.count,
    color: ALERT_TYPE_COLORS[a.type] || '#999',
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Risk Distribution Donut */}
      <Card className="hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            Distribution du risque
          </CardTitle>
          <CardDescription className="text-xs">Niveaux de risque des clients</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center gap-3">
            <ResponsiveContainer width="55%" height={140}>
              <PieChart>
                <Pie
                  data={riskData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                >
                  {riskData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0 0)', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {riskData.map((r) => (
                <div key={r.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: r.color }} />
                  <span className="text-muted-foreground flex-1">{r.name}</span>
                  <span className="font-semibold tabular-nums">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Status Donut */}
      <Card className="hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-500" />
            Statut des transactions
          </CardTitle>
          <CardDescription className="text-xs">30 derniers jours</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center gap-3">
            <ResponsiveContainer width="55%" height={140}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0 0)', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                  <span className="text-muted-foreground flex-1">{s.name}</span>
                  <span className="font-semibold tabular-nums">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Type Donut */}
      <Card className="hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Types d'alertes
          </CardTitle>
          <CardDescription className="text-xs">Bloquantes vs informatives</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center gap-3">
            <ResponsiveContainer width="55%" height={140}>
              <PieChart>
                <Pie
                  data={alertTypeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={2}
                >
                  {alertTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.9 0 0)', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {alertTypeData.map((a) => (
                <div key={a.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: a.color }} />
                  <span className="text-muted-foreground flex-1">{a.name}</span>
                  <span className="font-semibold tabular-nums">{a.value}</span>
                </div>
              ))}
              <div className="pt-1.5 border-t mt-1.5">
                <div className="text-[10px] text-muted-foreground">Total alertes</div>
                <div className="text-lg font-bold tabular-nums">{alertTypeData.reduce((s: number, a: any) => s + a.value, 0)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
