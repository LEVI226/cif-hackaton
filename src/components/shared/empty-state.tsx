'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'search' | 'error' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

const VARIANTS = {
  default: 'bg-muted/30',
  search: 'bg-sky-50 dark:bg-sky-950/20',
  error: 'bg-red-50 dark:bg-red-950/20',
  success: 'bg-emerald-50 dark:bg-emerald-950/20',
}

const ICON_COLORS = {
  default: 'text-muted-foreground',
  search: 'text-sky-500',
  error: 'text-red-500',
  success: 'text-emerald-500',
}

const SIZES = {
  sm: { container: 'py-6', icon: 'w-8 h-8', title: 'text-sm', desc: 'text-xs' },
  md: { container: 'py-10', icon: 'w-12 h-12', title: 'text-base', desc: 'text-xs' },
  lg: { container: 'py-16', icon: 'w-16 h-16', title: 'text-lg', desc: 'text-sm' },
}

export function EmptyState({ icon: Icon, title, description, action, variant = 'default', size = 'md' }: EmptyStateProps) {
  const s = SIZES[size]
  return (
    <div className={cn('flex flex-col items-center justify-center text-center rounded-xl border border-dashed', VARIANTS[variant], s.container)}>
      <div className="relative mb-3">
        <div className={cn('absolute inset-0 blur-xl opacity-30', ICON_COLORS[variant])} />
        <Icon className={cn(s.icon, ICON_COLORS[variant], 'relative')} strokeWidth={1.5} />
      </div>
      <h3 className={cn('font-semibold', s.title)}>{title}</h3>
      {description && (
        <p className={cn('text-muted-foreground mt-1 max-w-sm', s.desc)}>{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors animate-fade-in"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
