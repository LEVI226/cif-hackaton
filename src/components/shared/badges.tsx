'use client'

import { cn } from '@/lib/utils'
import { RISK_COLORS, SEVERITE_COLORS, STATUT_COLORS, STATUT_LABELS, RISK_LABELS } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

export function RiskBadge({ niveau, score }: { niveau: string; score?: number }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', RISK_COLORS[niveau] || RISK_COLORS.FAIBLE)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {RISK_LABELS[niveau] || niveau}
      {score !== undefined && <span className="opacity-60">· {score}</span>}
    </Badge>
  )
}

export function StatutBadge({ statut }: { statut: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium', STATUT_COLORS[statut] || STATUT_COLORS.INACTIF)}>
      {STATUT_LABELS[statut] || statut}
    </Badge>
  )
}

export function SeveriteBadge({ severite }: { severite: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium', SEVERITE_COLORS[severite] || SEVERITE_COLORS.FAIBLE)}>
      {severite}
    </Badge>
  )
}

export function TypeBadge({ type, label }: { type: string; label?: string }) {
  const colors: Record<string, string> = {
    BLOQUANTE: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300',
    INFORMATIVE: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300',
    PPE: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
    SANCTIONS: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300',
  }
  return (
    <Badge variant="outline" className={cn('font-medium', colors[type] || 'bg-gray-100 text-gray-700')}>
      {label || type}
    </Badge>
  )
}

export function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100)
  const color = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}
