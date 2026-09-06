'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatutBadge, RiskBadge } from '@/components/shared/badges'
import { AIAnalyse } from '@/components/shared/ai-analyse'
import { formatFCFA, formatDateTime, TYPE_TRANSACTION_LABELS } from '@/lib/format'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  ArrowUpRight, ArrowDownRight, Globe2, User, CreditCard, Calendar,
  AlertTriangle, Ban, Eye, X
} from 'lucide-react'

export function TransactionDetailModal() {
  const trxId = useAppStore((s) => s.selectedTransactionId)
  const setTransactionId = useAppStore((s) => s.setTransactionId)
  const setClientId = useAppStore((s) => s.setClientId)
  const setView = useAppStore((s) => s.setView)

  const { data: trx, isLoading } = useQuery({
    queryKey: ['transaction-detail', trxId],
    queryFn: async () => {
      const r = await fetch(`/api/transactions/${trxId}`)
      return r.json()
    },
    enabled: !!trxId,
  })

  function handleClose() {
    setTransactionId(null)
  }

  function viewClient() {
    if (trx?.clientId) {
      setClientId(trx.clientId)
      setTransactionId(null)
      setView('clients')
    }
  }

  return (
    <Dialog open={!!trxId} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading || !trx ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center',
                      trx.statut === 'BLOQUEE' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-emerald-100 dark:bg-emerald-950/40'
                    )}>
                      {trx.statut === 'BLOQUEE' ? <Ban className="w-5 h-5 text-red-600" /> :
                       trx.sens === 'ENTREE' ? <ArrowDownRight className="w-5 h-5 text-emerald-600" /> : <ArrowUpRight className="w-5 h-5 text-red-600" />}
                    </div>
                    Transaction {trx.reference}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(trx.date)} · {trx.canal}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatutBadge statut={trx.statut} />
                  {trx.estSuspecte && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Suspecte
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Montant principal */}
            <div className={cn(
              'rounded-xl p-4 text-center',
              trx.sens === 'ENTREE' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'
            )}>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {TYPE_TRANSACTION_LABELS[trx.type] || trx.type} · {trx.sens}
              </div>
              <div className={cn(
                'text-3xl font-bold tabular-nums mt-1',
                trx.sens === 'ENTREE' ? 'text-emerald-600' : 'text-red-600'
              )}>
                {trx.sens === 'ENTREE' ? '+' : '-'}{formatFCFA(trx.montant)}
              </div>
              {trx.frais > 0 && (
                <div className="text-xs text-muted-foreground mt-1">Frais: {formatFCFA(trx.frais)}</div>
              )}
            </div>

            {/* Détails */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">Client</div>
                {trx.client ? (
                  <button onClick={viewClient} className="flex items-center gap-2 text-left hover:text-primary transition-colors w-full">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {trx.client.nom.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{trx.client.nom} {trx.client.prenom}</div>
                      <div className="text-[11px] text-muted-foreground">{trx.client.code}</div>
                    </div>
                  </button>
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
                {trx.client && (
                  <div className="flex items-center gap-2">
                    <RiskBadge niveau={trx.client.niveauRisque} />
                    {trx.client.estPPE && <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700">PPE</Badge>}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">Compte</div>
                {trx.compte ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{trx.compte.numero}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{trx.compte.type}</div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">N/A</div>
                )}
              </div>

              {trx.contrepartie && (
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground">Contrepartie</div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{trx.contrepartie}</span>
                  </div>
                  {trx.compteContre && <div className="text-[11px] text-muted-foreground font-mono">{trx.compteContre}</div>}
                </div>
              )}

              {trx.paysContrepartie && (
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground">Pays contrepartie</div>
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{trx.paysContrepartie}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Motif de blocage/suspicion */}
            {trx.motifBlocage && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <Ban className="w-4 h-4" />
                  <span className="font-semibold text-sm">Motif du blocage</span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{trx.motifBlocage}</p>
              </div>
            )}

            {trx.motifSuspicion && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-semibold text-sm">Motif de suspicion</span>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{trx.motifSuspicion}</p>
              </div>
            )}

            {/* Alertes associées */}
            {trx.alertes && trx.alertes.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Alertes déclenchées ({trx.alertes.length})
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {trx.alertes.map((a: any) => (
                    <div key={a.id} className="rounded-lg border p-2 text-xs">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <Badge variant="outline" className={cn(
                          'text-[9px]',
                          a.type === 'BLOQUANTE' ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-700'
                        )}>
                          {a.type === 'BLOQUANTE' ? 'Bloquante' : 'Informative'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                      </div>
                      <div className="font-medium">{a.titre}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <AIAnalyse
              type="transaction"
              id={trx.id}
              title="Analyse IA de la transaction"
              description="Évaluation automatisée des risques de blanchiment par intelligence artificielle"
            />

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={viewClient} className="gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Voir le client
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose} className="gap-1.5 ml-auto">
                <X className="w-3.5 h-3.5" /> Fermer
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
