'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { formatFCFA, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  Search, User, ArrowLeftRight, Bell, Command, CornerDownLeft
} from 'lucide-react'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const setView = useAppStore((s) => s.setView)
  const setClientId = useAppStore((s) => s.setClientId)
  const setTransactionId = useAppStore((s) => s.setTransactionId)
  const setAlerteId = useAppStore((s) => s.setAlerteId)

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened - use a ref-based approach to avoid setState in effect
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    wasOpen.current = open
  }, [open])

  // Reset query when dialog closes
  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
    setOpen(newOpen)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      return r.json()
    },
    enabled: query.length >= 2,
  })

  const results = data || { clients: [], transactions: [], alertes: [] }
  const allResults = [
    ...results.clients.map((c: any) => ({ ...c, _type: 'client' })),
    ...results.transactions.map((t: any) => ({ ...t, _type: 'transaction' })),
    ...results.alertes.map((a: any) => ({ ...a, _type: 'alerte' })),
  ]

  function selectResult(item: any) {
    if (item._type === 'client') {
      setClientId(item.id)
      setView('clients')
    } else if (item._type === 'transaction') {
      setTransactionId(item.id)
    } else if (item._type === 'alerte') {
      setAlerteId(item.id)
      setView('alertes')
    }
    setOpen(false)
  }

  // Keyboard navigation
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && allResults[selectedIndex]) {
        e.preventDefault()
        selectResult(allResults[selectedIndex])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, allResults, selectedIndex])

  return (
    <>
      {/* Trigger button in header would go here, but we use keyboard shortcut */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Recherche globale</DialogTitle>
          </DialogHeader>
          {/* Search input */}
          <div className="flex items-center gap-3 p-4 border-b">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Rechercher clients, transactions, alertes..."
              className="border-0 shadow-none focus-visible:ring-0 text-base h-auto p-0"
            />
            <kbd className="shrink-0 px-2 py-1 rounded-md border bg-muted text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {query.length < 2 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Tapez au moins 2 caractères pour rechercher</p>
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 rounded border bg-muted">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded border bg-muted">↓</kbd>
                  <span>naviguer</span>
                  <kbd className="px-1.5 py-0.5 rounded border bg-muted">↵</kbd>
                  <span>sélectionner</span>
                </div>
              </div>
            ) : isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : allResults.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Aucun résultat pour "{query}"</p>
              </div>
            ) : (
              <div className="p-2">
                {/* Clients */}
                {results.clients?.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Clients ({results.clients.length})
                    </div>
                    {results.clients.map((c: any, i: number) => {
                      const idx = allResults.indexOf(c)
                      return (
                        <button
                          key={c.id}
                          onClick={() => selectResult(c)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left',
                            selectedIndex === idx ? 'bg-accent' : 'hover:bg-accent/50'
                          )}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {c.nom.slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{c.nom} {c.prenom}</div>
                            <div className="text-[11px] text-muted-foreground">{c.code} · {c.niveauRisque}</div>
                          </div>
                          {c.estPPE && <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700">PPE</Badge>}
                          {selectedIndex === idx && <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Transactions */}
                {results.transactions?.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Transactions ({results.transactions.length})
                    </div>
                    {results.transactions.map((t: any) => {
                      const idx = allResults.indexOf(t)
                      return (
                        <button
                          key={t.id}
                          onClick={() => selectResult(t)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left',
                            selectedIndex === idx ? 'bg-accent' : 'hover:bg-accent/50'
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
                            <ArrowLeftRight className="w-4 h-4 text-sky-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate font-mono">{t.reference}</div>
                            <div className="text-[11px] text-muted-foreground">{t.client?.nom} {t.client?.prenom} · {formatFCFA(t.montant)}</div>
                          </div>
                          <Badge variant="outline" className="text-[9px]">{t.statut}</Badge>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Alertes */}
                {results.alertes?.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Alertes ({results.alertes.length})
                    </div>
                    {results.alertes.map((a: any) => {
                      const idx = allResults.indexOf(a)
                      return (
                        <button
                          key={a.id}
                          onClick={() => selectResult(a)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left',
                            selectedIndex === idx ? 'bg-accent' : 'hover:bg-accent/50'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                            a.type === 'BLOQUANTE' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-amber-100 dark:bg-amber-950/40'
                          )}>
                            <Bell className={cn('w-4 h-4', a.type === 'BLOQUANTE' ? 'text-red-600' : 'text-amber-600')} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{a.titre}</div>
                            <div className="text-[11px] text-muted-foreground">{a.reference} · {a.client?.nom} {a.client?.prenom}</div>
                          </div>
                          <Badge variant="outline" className="text-[9px]">{a.severite}</Badge>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border bg-background">↑↓</kbd> naviguer
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border bg-background">↵</kbd> ouvrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border bg-background">ESC</kbd> fermer
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Command className="w-3 h-3" />
              {allResults.length} résultat{allResults.length > 1 ? 's' : ''}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating search trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:shadow-xl transition-all hover-lift"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono">⌘K</kbd>
      </button>
    </>
  )
}
