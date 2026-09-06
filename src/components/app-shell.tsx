'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { DashboardView } from '@/components/views/dashboard-view'
import { ClientsView } from '@/components/views/clients-view'
import { TransactionsView } from '@/components/views/transactions-view'
import { AlertesView } from '@/components/views/alertes-view'
import { ScreeningView } from '@/components/views/screening-view'
import { RapportsView } from '@/components/views/rapports-view'
import { ReglesView } from '@/components/views/regles-view'
import { AuditView } from '@/components/views/audit-view'
import { CalendrierView } from '@/components/views/calendrier-view'
import { ComparaisonView } from '@/components/views/comparaison-view'
import { useAppStore } from '@/lib/store'
import { Footer } from '@/components/layout/footer'
import { RealtimeProvider } from '@/components/realtime-provider'
import { TransactionDetailModal } from '@/components/shared/transaction-detail-modal'

export function AppShell() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  }))

  const view = useAppStore((s) => s.view)

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <div className="flex flex-1 min-h-0">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-6 max-w-[1600px] mx-auto animate-fade-in">
                  {view === 'dashboard' && <DashboardView />}
                  {view === 'clients' && <ClientsView />}
                  {view === 'transactions' && <TransactionsView />}
                  {view === 'alertes' && <AlertesView />}
                  {view === 'screening' && <ScreeningView />}
                  {view === 'rapports' && <RapportsView />}
                  {view === 'regles' && <ReglesView />}
                  {view === 'audit' && <AuditView />}
                  {view === 'calendrier' && <CalendrierView />}
                  {view === 'comparaison' && <ComparaisonView />}
                </div>
              </main>
            </div>
          </div>
          <Footer />
        </div>
        <TransactionDetailModal />
      </RealtimeProvider>
    </QueryClientProvider>
  )
}
