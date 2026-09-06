'use client'

import { useRealtimeAlerts } from '@/hooks/use-realtime'
import { createContext, useContext, ReactNode } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RealtimeContextValue {
  alerts: ReturnType<typeof useRealtimeAlerts>['alerts']
  connected: boolean
  stats: ReturnType<typeof useRealtimeAlerts>['stats']
}

const RealtimeContext = createContext<RealtimeContextValue>({
  alerts: [],
  connected: false,
  stats: null,
})

export function useRealtime() {
  return useContext(RealtimeContext)
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { alerts, connected, stats } = useRealtimeAlerts()

  return (
    <RealtimeContext.Provider value={{ alerts, connected, stats }}>
      {/* Floating connection indicator */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm transition-all',
          connected
            ? 'bg-emerald-500/90 text-white'
            : 'bg-gray-500/90 text-white'
        )}>
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{connected ? 'Temps réel' : 'Hors ligne'}</span>
          {connected && alerts.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
              {alerts.length}
            </span>
          )}
        </div>
      </div>
      {children}
    </RealtimeContext.Provider>
  )
}
