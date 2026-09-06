'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'
import { useRealtimeAlerts } from '@/hooks/use-realtime'

// Client-only component that initializes WebSocket and renders the indicator
// Uses dynamic import with ssr: false to prevent any hydration mismatch
const RealtimeClient = dynamic(() => import('./realtime-client').then(m => m.RealtimeClient), {
  ssr: false,
  loading: () => null,
})

export function RealtimeProvider({ children }: { children: ReactNode }) {
  // The useRealtimeAlerts hook is called inside RealtimeClient (client-only)
  // so it never runs during SSR, eliminating hydration mismatch
  return (
    <>
      {children}
      <RealtimeClient />
    </>
  )
}
