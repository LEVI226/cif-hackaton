'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { ResponsiveContainer, Area, AreaChart } from 'recharts'

interface KpiCardSparklineProps {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  accent?: 'emerald' | 'amber' | 'red' | 'sky' | 'purple'
  sparklineData?: Array<{ value: number }>
  delay?: number
}

const ACCENTS = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200/60 dark:ring-emerald-800/40', color: '#10b981' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200/60 dark:ring-amber-800/40', color: '#f59e0b' },
  red: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-200/60 dark:ring-red-800/40', color: '#ef4444' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-200/60 dark:ring-sky-800/40', color: '#0ea5e9' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-200/60 dark:ring-purple-800/40', color: '#a855f7' },
}

export function KpiCardSparkline({ label, value, icon: Icon, hint, accent = 'emerald', sparklineData, delay = 0 }: KpiCardSparklineProps) {
  const a = ACCENTS[accent]
  const hasSparkline = sparklineData && sparklineData.length > 1
  const trend = hasSparkline ? sparklineData[sparklineData.length - 1].value - sparklineData[0].value : 0
  const trendUp = trend > 0

  return (
    <Card
      className={cn('relative overflow-hidden p-4 hover:shadow-md transition-all animate-slide-in', `ring-1 ${a.ring}`)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-0.5 text-xl font-bold tracking-tight tabular-nums">{value}</div>
        </div>
        <div className={cn('shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', a.bg)}>
          <Icon className={cn('w-4 h-4', a.text)} strokeWidth={2.2} />
        </div>
      </div>
      {hasSparkline && (
        <div className="h-8 -mx-1 -mb-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`spark-${accent}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={a.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={a.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={a.color}
                strokeWidth={1.5}
                fill={`url(#spark-${accent})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="flex items-center justify-between mt-1">
        {hint && <div className="text-[10px] text-muted-foreground truncate">{hint}</div>}
        {hasSparkline && trend !== 0 && (
          <div className={cn('flex items-center gap-0.5 text-[10px] font-semibold', trendUp ? 'text-emerald-600' : 'text-red-600')}>
            {trendUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {Math.abs(trend)}
          </div>
        )}
      </div>
    </Card>
  )
}
