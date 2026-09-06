'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, FileImage, Loader2, Eye, CheckCircle2, AlertCircle, Scan, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

interface KYCDocumentProps {
  clientId?: string
}

export function KYCDocument({ clientId }: KYCDocumentProps) {
  const [image, setImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [docType, setDocType] = useState('CNI')
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 5MB)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImagePreview(result)
      // Extract base64 without data URI prefix
      const base64 = result.split(',')[1]
      setImage(base64)
      setAnalysis(null)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  async function analyze() {
    if (!image) {
      toast.error('Veuillez d\'abord télécharger une image')
      return
    }
    setLoading(true)
    setError(null)
    setAnalysis(null)
    try {
      const r = await fetch('/api/kyc-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: image, type: docType, clientId, mimeType: 'image/jpeg' }),
      })
      const j = await r.json()
      if (r.ok) {
        setAnalysis(j.analysis)
        toast.success('Document analysé avec succès')
      } else {
        setError(j.error || 'Erreur lors de l\'analyse')
        toast.error('Erreur d\'analyse')
      }
    } catch (e: any) {
      setError(e.message)
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setImage(null)
    setImagePreview(null)
    setAnalysis(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const docTypes = [
    { value: 'CNI', label: 'Pièce d\'identité (CNI/Passeport)' },
    { value: 'JUSTIFICATIF_DOMICILE', label: 'Justificatif de domicile' },
    { value: 'FACTURE', label: 'Facture (eau/électricité/téléphone)' },
    { value: 'AUTRE', label: 'Autre document' },
  ]

  return (
    <Card className="border-violet-200/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <Scan className="w-4 h-4 text-white" />
              </div>
              Analyse VLM de documents KYC
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Téléchargez un document (CNI, justificatif, facture) pour extraction automatique par vision IA
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
            <Sparkles className="w-3 h-3 mr-1" /> VLM Z.ai
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Document type selector */}
        <div className="flex flex-wrap gap-1.5">
          {docTypes.map(t => (
            <button
              key={t.value}
              onClick={() => setDocType(t.value)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                docType === t.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-accent'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Upload zone */}
        {!imagePreview && (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
          >
            <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium">Cliquez pour télécharger un document</div>
            <div className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP · max 5MB</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        )}

        {/* Preview + analysis */}
        {imagePreview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                <img src={imagePreview} alt="Document" className="w-full h-48 object-contain" />
                <button
                  onClick={reset}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Button onClick={analyze} disabled={loading} className="w-full gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours...</> : <><Eye className="w-4 h-4" /> Analyser le document</>}
              </Button>
            </div>

            <div>
              {loading && (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-xs">Extraction des données par IA...</p>
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-700 dark:text-red-300">{error}</div>
                </div>
              )}
              {analysis && !loading && (
                <div className="space-y-2 animate-slide-in">
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Document analysé avec succès
                  </div>
                  <div className="rounded-lg border bg-card p-3 max-h-44 overflow-y-auto">
                    <div className="space-y-1.5">
                      {Object.entries(analysis).filter(([k, v]) => k !== 'raw' && v !== null && v !== '').map(([key, value]) => (
                        <div key={key} className="flex items-start justify-between gap-2 text-xs">
                          <span className="text-muted-foreground font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-semibold text-right">
                            {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {analysis.anomalies_detectees && analysis.anomalies_detectees !== 'null' && (
                    <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded">
                      ⚠ Anomalies: {analysis.anomalies_detectees}
                    </div>
                  )}
                </div>
              )}
              {!loading && !error && !analysis && (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
                  <FileImage className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs">Cliquez sur "Analyser" pour extraire les informations</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
