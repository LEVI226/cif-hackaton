'use client'

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Upload, FileText, Loader2, AlertCircle, CheckCircle2, XCircle,
  Search, Users, Download, Zap, X
} from 'lucide-react'

interface BatchResult {
  id: string
  nom: string
  prenom: string
  statut: string
  nombreMatch: number
  matches: Array<{
    nom: string
    prenom: string
    type: string
    score: number
    fonction: string
    pays: string
    source: string
    motif: string
  }>
}

export function BatchScreening() {
  const qc = useQueryClient()
  const [input, setInput] = useState('')
  const [results, setResults] = useState<BatchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{ total: number; matches: number; clean: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setInput(reader.result as string)
      toast.success(`Fichier chargé: ${file.name}`)
    }
    reader.readAsText(file)
  }

  function parseNames(text: string): Array<{ nom: string; prenom?: string }> {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const parts = line.split(/[,\t;]| - /).map(p => p.trim())
        if (parts.length >= 2) {
          return { nom: parts[0], prenom: parts[1] }
        }
        // Try space-separated
        const spaceParts = line.split(/\s+/)
        if (spaceParts.length >= 2) {
          return { nom: spaceParts[0], prenom: spaceParts.slice(1).join(' ') }
        }
        return { nom: line }
      })
  }

  async function runBatch() {
    const names = parseNames(input)
    if (names.length === 0) {
      toast.error('Aucun nom à screening')
      return
    }
    if (names.length > 100) {
      toast.error('Maximum 100 noms par lot')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const r = await fetch('/api/screening/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names }),
      })
      const j = await r.json()
      if (r.ok) {
        setResults(j.results)
        setStats({ total: j.total, matches: j.matches, clean: j.clean })
        toast.success(`${j.matches} match(s) sur ${j.total} nom(s)`)
        qc.invalidateQueries({ queryKey: ['screenings'] })
      } else {
        setError(j.error || 'Erreur lors du screening')
        toast.error('Erreur de screening')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function exportResults() {
    if (!results) return
    const csv = ['Nom;Prénom;Statut;Matchs;Détail']
    for (const r of results) {
      const detail = r.matches.map(m => `${m.nom} ${m.prenom} (${m.type}, ${m.score}%)`).join(' | ')
      csv.push(`${r.nom};${r.prenom};${r.statut};${r.nombreMatch};${detail}`)
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch_screening_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function reset() {
    setInput('')
    setResults(null)
    setStats(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              Screening en lot
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Vérifiez plusieurs noms contre les listes PPE et sanctions en une seule opération
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 shrink-0">
            <Zap className="w-3 h-3 mr-1" /> Max 100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!results && (
          <>
            {/* Input zone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Noms à screening (un par ligne, format: Nom, Prénom)
                </label>
                <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} className="h-7 text-xs gap-1">
                  <Upload className="w-3 h-3" /> Importer CSV
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={'COMPAORE, Blaise\nDIARRA, Souleymane\nTOURE, Ahmed\nGUEYE, Mariam'}
                rows={6}
                className="font-mono text-xs"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {parseNames(input).length} nom(s) détecté(s)
                </span>
                {input && (
                  <Button variant="ghost" size="sm" onClick={() => setInput('')} className="h-7 text-xs gap-1">
                    <X className="w-3 h-3" /> Effacer
                  </Button>
                )}
              </div>
            </div>

            <Button
              onClick={runBatch}
              disabled={loading || !input.trim()}
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Screening en cours...</>
              ) : (
                <><Search className="w-4 h-4" /> Lancer le screening en lot</>
              )}
            </Button>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-700 dark:text-red-300">{error}</div>
              </div>
            )}
          </>
        )}

        {/* Results */}
        {results && stats && (
          <div className="space-y-3 animate-slide-in">
            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-3 text-center bg-muted/30">
                <div className="text-2xl font-bold tabular-nums">{stats.total}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Total</div>
              </div>
              <div className={cn(
                'rounded-lg border p-3 text-center',
                stats.matches > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 'bg-muted/30'
              )}>
                <div className={cn('text-2xl font-bold tabular-nums', stats.matches > 0 && 'text-red-600')}>{stats.matches}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Match(s)</div>
              </div>
              <div className="rounded-lg border p-3 text-center bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                <div className="text-2xl font-bold tabular-nums text-emerald-600">{stats.clean}</div>
                <div className="text-[10px] text-muted-foreground uppercase">OK</div>
              </div>
            </div>

            {/* Results list */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {results.map((r, i) => (
                <div
                  key={r.id}
                  className={cn(
                    'rounded-lg border p-2.5 animate-fade-in',
                    r.statut === 'MATCH_EXACT' ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' :
                    r.statut === 'MATCH_PARTIEL' ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' :
                    'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10'
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-center gap-2">
                    {r.statut === 'AUCUN_MATCH' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : r.statut === 'MATCH_EXACT' ? (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span className="text-sm font-medium">{r.nom} {r.prenom}</span>
                    <Badge variant="outline" className={cn(
                      'text-[9px] ml-auto',
                      r.statut === 'MATCH_EXACT' ? 'bg-red-100 text-red-700' :
                      r.statut === 'MATCH_PARTIEL' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    )}>
                      {r.statut.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {r.matches.length > 0 && (
                    <div className="mt-1.5 ml-6 space-y-1">
                      {r.matches.map((m, j) => (
                        <div key={j} className="text-[11px] text-muted-foreground">
                          → <span className="font-medium">{m.nom} {m.prenom}</span>
                          {' '}({m.type}, {m.score}%)
                          {m.fonction && ` · ${m.fonction}`}
                          {m.pays && ` · ${m.pays}`}
                          {m.motif && <span className="text-red-600"> · ⚠ {m.motif}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={exportResults} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Exporter CSV
              </Button>
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 ml-auto">
                <X className="w-3.5 h-3.5" /> Nouveau lot
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
