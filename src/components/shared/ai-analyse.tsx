'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, Brain, AlertCircle, RefreshCw, Copy, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface AIAnalyseProps {
  type: 'client' | 'alerte' | 'rapport' | 'transaction'
  id?: string
  title?: string
  description?: string
}

export function AIAnalyse({ type, id, title, description }: AIAnalyseProps) {
  const qc = useQueryClient()
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    setAnalysis(null)
    try {
      let url = '/api/ai-analyse'
      let body: any = { type }
      if (type === 'client') body.clientId = id
      else if (type === 'alerte') body.alerteId = id
      else if (type === 'transaction') {
        url = `/api/transactions/${id}/ai-analyse`
        body = {}
      }
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (r.ok) {
        setAnalysis(j.analysis)
        qc.invalidateQueries({ queryKey: ['audit'] })
      } else {
        setError(j.error || 'Erreur lors de l\'analyse IA')
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  function copyAnalysis() {
    if (analysis) {
      navigator.clipboard.writeText(analysis)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              Analyse IA Conformité
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {description || 'Analyse automatisée par intelligence artificielle des patterns suspects et recommandations LBC/FT/FP'}
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 shrink-0">
            <Sparkles className="w-3 h-3 mr-1" /> Z.ai LLM
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!analysis && !loading && !error && (
          <div className="text-center py-6">
            <Button onClick={runAnalysis} className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700">
              <Sparkles className="w-4 h-4" /> Lancer l'analyse IA
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              L'IA analysera les données et fournira des recommandations expertes
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="relative">
              <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
              <Brain className="w-5 h-5 absolute inset-0 m-auto text-violet-700" />
            </div>
            <p className="text-sm text-muted-foreground">Analyse en cours... L'IA examine les patterns de risque</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-red-700 dark:text-red-300">Erreur d'analyse</div>
              <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={runAnalysis} className="ml-auto shrink-0">
              <RefreshCw className="w-3.5 h-3.5" /> Réessayer
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-3 animate-slide-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Analyse générée
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={copyAnalysis} className="h-7 gap-1 text-xs">
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copié' : 'Copier'}
                </Button>
                <Button size="sm" variant="ghost" onClick={runAnalysis} className="h-7 gap-1 text-xs">
                  <RefreshCw className="w-3 h-3" /> Régénérer
                </Button>
              </div>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg bg-card/50 border p-4 max-h-[500px] overflow-y-auto">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-3 text-primary">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                  p: ({ children }) => <p className="text-xs leading-relaxed mb-2 text-foreground/90">{children}</p>,
                  ul: ({ children }) => <ul className="text-xs space-y-1 mb-2 list-disc pl-4">{children}</ul>,
                  ol: ({ children }) => <ol className="text-xs space-y-1 mb-2 list-decimal pl-4">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  code: ({ children }) => <code className="px-1 py-0.5 rounded bg-muted text-[11px] font-mono">{children}</code>,
                }}
              >
                {analysis}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
