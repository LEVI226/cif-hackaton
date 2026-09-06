'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Settings, Shield, Bell, Globe2, Database, KeyRound, Mail,
  Save, RotateCcw, Sliders, Building2, AlertTriangle, CheckCircle2,
  Server, Clock, Zap
} from 'lucide-react'
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

export function ParametresView() {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: params, isLoading } = useQuery({
    queryKey: ['parametres'],
    queryFn: async () => {
      const r = await fetch('/api/parametres')
      return r.json()
    },
  })

  const { data: regles } = useQuery({
    queryKey: ['regles'],
    queryFn: async () => {
      const r = await fetch('/api/regles')
      return r.json()
    },
  })

  const paramList = params?.data || []
  const regleList = regles?.data || []

  // Get parameter value by key
  function getParam(key: string): string {
    const p = paramList.find((p: any) => p.cle === key)
    return p?.valeur || ''
  }

  // Local state for editable params
  const [formState, setFormState] = useState<Record<string, string>>({})
  function updateParam(key: string, value: string) {
    setFormState((s) => ({ ...s, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      for (const [cle, valeur] of Object.entries(formState)) {
        await fetch('/api/parametres', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cle, valeur }),
        })
      }
      toast.success('Paramètres enregistrés')
      qc.invalidateQueries({ queryKey: ['parametres'] })
      setFormState({})
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  async function toggleRegle(id: string, active: boolean) {
    const r = await fetch(`/api/regles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    if (r.ok) {
      toast.success(`Règle ${!active ? 'activée' : 'désactivée'}`)
      qc.invalidateQueries({ queryKey: ['regles'] })
    }
  }

  const systemInfo = [
    { label: 'Application', value: 'CIF Sentinel v1.0', icon: Server },
    { label: 'Base de données', value: 'SQLite (Prisma)', icon: Database },
    { label: 'Framework', value: 'Next.js 16 + React 19', icon: Zap },
    { label: 'Service temps réel', value: 'WebSocket (port 3003)', icon: Bell },
    { label: 'Fuseau horaire', value: 'UTC+0 (BCEAO)', icon: Clock },
    { label: 'Région', value: 'UEMOA - Afrique de l\'Ouest', icon: Globe2 },
  ]

  const thresholds = [
    { key: 'SEUIL_DECLARATION_TRA', label: 'Seuil déclaration TRA (FCFA)', defaultValue: '5000000', icon: AlertTriangle, description: 'Seuil de déclaration de transaction à la CENTIF' },
    { key: 'SEUIL_BLOCAGE', label: 'Seuil blocage automatique (FCFA)', defaultValue: '10000000', icon: Shield, description: 'Transactions au-dessus sont automatiquement bloquées' },
    { key: 'SEUIL_SOLDE_GLOBAL', label: 'Seuil revue solde global (FCFA)', defaultValue: '20000000', icon: Database, description: 'Déclenche une revue KYC du client' },
    { key: 'PERIODE_STRUCTURE', label: 'Période détection structuration (heures)', defaultValue: '24', icon: Clock, description: 'Fenêtre temporelle pour détecter le smurfing' },
    { key: 'NOMBRE_MAX_TRANSACTIONS_JOUR', label: 'Nombre max transactions/jour', defaultValue: '5', icon: Zap, description: 'Avant déclenchement d\'alerte vélocité' },
  ]

  return (
    <div className="space-y-4">
      {/* System info cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {systemInfo.map((info, i) => {
          const Icon = info.icon
          return (
            <Card key={i} className="p-4 hover-lift">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">{info.label}</div>
                  <div className="text-sm font-semibold truncate">{info.value}</div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="seuils" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="seuils" className="gap-1.5"><Sliders className="w-3.5 h-3.5" /> Seuils & Règles</TabsTrigger>
          <TabsTrigger value="institution" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Institution</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-3.5 h-3.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="securite" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Sécurité</TabsTrigger>
        </TabsList>

        {/* Seuils & Règles */}
        <TabsContent value="seuils" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Seuils de conformité LBC/FT/FP
              </CardTitle>
              <CardDescription className="text-xs">
                Configurez les seuils de détection automatique des transactions suspectes
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)
              ) : (
                thresholds.map((t) => {
                  const Icon = t.icon
                  const currentValue = formState[t.key] ?? getParam(t.key) ?? t.defaultValue
                  return (
                    <div key={t.key} className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/30 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Label className="text-sm font-medium">{t.label}</Label>
                        <p className="text-[11px] text-muted-foreground">{t.description}</p>
                      </div>
                      <Input
                        type="number"
                        value={currentValue}
                        onChange={(e) => updateParam(t.key, e.target.value)}
                        className="w-40 h-9 text-right tabular-nums"
                      />
                    </div>
                  )
                })
              )}
              <div className="flex items-center justify-between pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {Object.keys(formState).length > 0 ? `${Object.keys(formState).length} modification(s) en attente` : 'Aucune modification'}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setFormState({})} className="gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Annuler
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving || Object.keys(formState).length === 0} className="gap-1.5">
                    <Save className="w-3.5 h-3.5" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Règles de conformité */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Règles de détection actives
              </CardTitle>
              <CardDescription className="text-xs">
                Activez ou désactivez les règles du moteur de conformité
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-2">
              {regleList.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/30 transition-colors">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    r.type === 'BLOCAGE' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
                  )}>
                    {r.type === 'BLOCAGE' ? <Shield className="w-4 h-4 text-red-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.nom}</span>
                      <Badge variant="outline" className="text-[9px] font-mono">{r.code}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{r.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-[10px] font-medium', r.active ? 'text-emerald-600' : 'text-muted-foreground')}>
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                    <Switch checked={r.active} onCheckedChange={() => toggleRegle(r.id, r.active)} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Institution */}
        <TabsContent value="institution" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Informations de l'institution
              </CardTitle>
              <CardDescription className="text-xs">Données de la Coopérative financière membre de la CIF</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom de l'institution</Label>
                <Input defaultValue="CIF - COOP-CA" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Numéro IFU</Label>
                <Input defaultValue={getParam('INSTITUTION_IFU') || '00019733Z'} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Immatriculation</Label>
                <Input defaultValue="25-SC-01073.BF/RCEN/PKAD" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">N° IMF (BCEAO)</Label>
                <Input defaultValue="A-13070367" className="h-9" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Adresse du siège social</Label>
                <Input defaultValue="Ouaga 2000 - Zone B - Secteur 15 - Avenue El Hadj Salifou CISSE - Lot 40 - Burkina Faso" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Téléphone</Label>
                <Input defaultValue="+226 25 37 64 60" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input defaultValue="cifburkina@fasonet.bf" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Site web</Label>
                <Input defaultValue="www.cif-ao.org" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Capital social (FCFA)</Label>
                <Input defaultValue="1 200 000 000" className="h-9 tabular-nums" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Préférences de notifications
              </CardTitle>
              <CardDescription className="text-xs">Configurez les alertes et notifications système</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {[
                { label: 'Alertes critiques en temps réel', desc: 'Notifications push pour alertes bloquantes', default: true },
                { label: 'Transactions suspectes', desc: 'Notifier pour chaque transaction suspecte', default: true },
                { label: 'Échéances réglementaires', desc: 'Rappel 3 jours avant les deadlines BCEAO/GIABA', default: true },
                { label: 'Nouveaux clients PPE', desc: 'Alerte lors de l\'identification d\'un PPE', default: true },
                { label: 'Rapports hebdomadaires', desc: 'Email de synthèse chaque lundi', default: false },
                { label: 'Mises à jour listes sanctions', desc: 'Notification lors des mises à jour OFAC/ONU/UE', default: true },
              ].map((n, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{n.label}</div>
                    <div className="text-[11px] text-muted-foreground">{n.desc}</div>
                  </div>
                  <Switch defaultChecked={n.default} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sécurité */}
        <TabsContent value="securite" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                Sécurité et accès
              </CardTitle>
              <CardDescription className="text-xs">Gestion de l'authentification et de la sécurité</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Authentification à deux facteurs activée</div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Tous les utilisateurs doivent utiliser 2FA</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Durée de session (minutes)</div>
                  <div className="text-[11px] text-muted-foreground">Déconnexion automatique après inactivité</div>
                </div>
                <Input type="number" defaultValue={30} className="w-20 h-9 text-right" />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Journalisation des actions</div>
                  <div className="text-[11px] text-muted-foreground">Toutes les actions sont tracées dans le journal d'audit</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Chiffrement des données sensibles</div>
                  <div className="text-[11px] text-muted-foreground">AES-256 pour les données KYC</div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
