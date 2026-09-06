'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { Bell, AlertTriangle, Ban, ArrowLeftRight } from 'lucide-react'

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

export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([])
  const [connected, setConnected] = useState(false)
  const [stats, setStats] = useState<{ alertesOuvertes: number; transactionsJour: number; totalClients: number } | null>(null)
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
      setAlerts((prev) => [alert, ...prev].slice(0, 20))

      // Show toast notification
      const isBloquante = alert.type === 'BLOQUANTE'
      if (isBloquante) {
        toast.error(alert.titre, {
          description: alert.client ? `Client: ${alert.client}` : alert.description,
          duration: 8000,
          icon: <Ban className="w-4 h-4" />,
        })
      } else {
        toast.warning(alert.titre, {
          description: alert.client ? `Client: ${alert.client}` : alert.description,
          duration: 5000,
          icon: <AlertTriangle className="w-4 h-4" />,
        })
      }
    })

    socket.on('transaction:new', (trx: RealtimeTransaction) => {
      if (trx.estSuspecte || trx.statut === 'BLOQUEE') {
        toast.info(`Transaction ${trx.statut}`, {
          description: `${trx.reference} - ${trx.client || ''} - ${trx.montant.toLocaleString('fr-FR')} FCFA`,
          duration: 4000,
          icon: <ArrowLeftRight className="w-4 h-4" />,
        })
      }
    })

    socket.on('dashboard:stats', (s: any) => setStats(s))

    return () => {
      socket.disconnect()
    }
  }, [])

  return { alerts, connected, stats }
}
