'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; positive: boolean }
  hint?: string
  accent?: 'emerald' | 'amber' | 'red' | 'sky' | 'purple'
  delay?: number
}

const ACCENTS = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200/60 dark:ring-emerald-800/40' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200/60 dark:ring-amber-800/40' },
  red: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-200/60 dark:ring-red-800/40' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-200/60 dark:ring-sky-800/40' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-200/60 dark:ring-purple-800/40' },
}

export function KpiCard({ label, value, icon: Icon, trend, hint, accent = 'emerald', delay = 0 }: KpiCardProps) {
  const a = ACCENTS[accent]
  return (
    <Card
      className={cn('relative overflow-hidden p-4 hover:shadow-md transition-all animate-slide-in', `ring-1 ${a.ring}`)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
          {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
          {trend && (
            <div className={cn('mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold',
              trend.positive ? 'text-emerald-600' : 'text-red-600')}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">vs 7j</span>
            </div>
          )}
        </div>
        <div className={cn('shrink-0 w-10 h-10 rounded-xl flex items-center justify-center', a.bg)}>
          <Icon className={cn('w-5 h-5', a.text)} strokeWidth={2.2} />
        </div>
      </div>
    </Card>
  )
}
