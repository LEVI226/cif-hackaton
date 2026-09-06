'use client'

import { cn } from '@/lib/utils'

interface ComplianceGaugeProps {
  score: number  // 0-100
  label?: string
  size?: number
}

export function ComplianceGauge({ score, label, size = 160 }: ComplianceGaugeProps) {
  const pct = Math.max(0, Math.min(100, score))
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const stroke = 12
  const offset = circumference - (pct / 100) * circumference * 0.75  // 270 degree arc

  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : pct >= 40 ? '#f97316' : '#ef4444'
  const label2 = label || 'Score de conformité'
  const status = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Acceptable' : pct >= 40 ? 'À améliorer' : 'Critique'

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="oklch(0.92 0.005 150)"
            strokeWidth={stroke}
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${circumference * 0.75 * (pct / 100)} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <div className="text-3xl font-bold tabular-nums" style={{ color }}>{pct}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</div>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="text-xs font-medium text-muted-foreground">{label2}</div>
        <div className="text-sm font-bold" style={{ color }}>{status}</div>
      </div>
    </div>
  )
}
