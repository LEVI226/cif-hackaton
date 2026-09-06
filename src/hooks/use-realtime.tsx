'use client'

import { create } from 'zustand'
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

export interface RealtimeAlert {
  id: string
  reference: string
  type: string
  severite: string
  titre: string
  description: string
  montant?: number
  client?: string | null
  timestamp: string
}

export interface RealtimeTransaction {
  id: string
  reference: string
  type: string
  montant: number
  statut: string
  estSuspecte: boolean
  client?: string | null
  timestamp: string
}

interface RealtimeState {
  alerts: RealtimeAlert[]
  connected: boolean
  stats: { alertesOuvertes: number; transactionsJour: number; totalClients: number } | null
  setAlerts: (a: RealtimeAlert[]) => void
  addAlert: (a: RealtimeAlert) => void
  setConnected: (c: boolean) => void
  setStats: (s: any) => void
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  alerts: [],
  connected: false,
  stats: null,
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 20) })),
  setConnected: (connected) => set({ connected }),
  setStats: (stats) => set({ stats }),
}))

// Hook for components to read realtime state (no SSR issues since defaults are static)
export function useRealtime() {
  return useRealtimeStore()
}

// Hook that initializes the WebSocket connection - must be called client-side only
export function useRealtimeAlerts() {
  const addAlert = useRealtimeStore((s) => s.addAlert)
  const setConnected = useRealtimeStore((s) => s.setConnected)
  const setStats = useRealtimeStore((s) => s.setStats)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('reconnect', () => setConnected(true))

    socket.on('alert:new', (alert: RealtimeAlert) => {
      addAlert(alert)
      const isBloquante = alert.type === 'BLOQUANTE'
      const prefix = isBloquante ? '🚫 ' : '⚠️ '
      if (isBloquante) {
        toast.error(prefix + alert.titre, {
          description: alert.client ? `Client: ${alert.client}` : alert.description,
          duration: 8000,
        })
      } else {
        toast.warning(prefix + alert.titre, {
          description: alert.client ? `Client: ${alert.client}` : alert.description,
          duration: 5000,
        })
      }
    })

    socket.on('transaction:new', (trx: RealtimeTransaction) => {
      if (trx.estSuspecte || trx.statut === 'BLOQUEE') {
        toast.info(`💱 Transaction ${trx.statut}`, {
          description: `${trx.reference} - ${trx.client || ''} - ${trx.montant.toLocaleString('fr-FR')} FCFA`,
          duration: 4000,
        })
      }
    })

    socket.on('dashboard:stats', (s: any) => setStats(s))

    return () => {
      socket.disconnect()
    }
  }, [addAlert, setConnected, setStats])
}
