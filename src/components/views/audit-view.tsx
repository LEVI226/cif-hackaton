'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  Search, History, Shield, UserCheck, FileText, Bell, LogIn,
  Ban, Eye, Filter, Download
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

const ACTION_ICONS: Record<string, any> = {
  CONNEXION: LogIn,
  CREATION_CLIENT: UserCheck,
  MODIFICATION_CLIENT: UserCheck,
  BLOCAGE_CLIENT: Ban,
  DEBLOCAGE_CLIENT: Shield,
  TRAITEMENT_ALERTE: Bell,
  SCREENING: Search,
  GENERATION_RAPPORT: FileText,
  ALERTE_PRENDRE: Eye,
  ALERTE_ESCALADER: Bell,
  ALERTE_CLOTURER: Shield,
  ALERTE_REJETER: Ban,
}

const MODULE_COLORS: Record<string, string> = {
  CLIENTS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  TRANSACTIONS: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  ALERTES: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  SCREENING: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  RAPPORTS: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

export function AuditView() {
  const [search, setSearch] = useState('')
  const [filtreModule, setFiltreModule] = useState('')

  const { data } = useQuery({
    queryKey: ['audit', search, filtreModule],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (filtreModule) params.set('module', filtreModule)
      const r = await fetch(`/api/audit?${params}`)
      return r.json()
    },
  })

  const logs = (data?.data || []).filter((l: any) =>
    !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.utilisateur?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-[11px] text-muted-foreground">Total actions</div><div className="text-xl font-bold">{logs.length}</div></Card>
        <Card className="p-4"><div className="text-[11px] text-muted-foreground">Modules actifs</div><div className="text-xl font-bold">{new Set(logs.map((l: any) => l.module)).size}</div></Card>
        <Card className="p-4"><div className="text-[11px] text-muted-foreground">Utilisateurs</div><div className="text-xl font-bold">{new Set(logs.map((l: any) => l.utilisateur)).size}</div></Card>
        <Card className="p-4"><div className="text-[11px] text-muted-foreground">Aujourd'hui</div><div className="text-xl font-bold">{logs.filter((l: any) => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}</div></Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par action, utilisateur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Select value={filtreModule} onValueChange={setFiltreModule}>
          <SelectTrigger className="w-full md:w-48 h-10"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="CLIENTS">Clients</SelectItem>
            <SelectItem value="TRANSACTIONS">Transactions</SelectItem>
            <SelectItem value="ALERTES">Alertes</SelectItem>
            <SelectItem value="SCREENING">Screening</SelectItem>
            <SelectItem value="RAPPORTS">Rapports</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => window.open('/api/export?type=audit', '_blank')} className="h-10 gap-2 shrink-0">
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4" /> Journal d'audit</CardTitle></CardHeader>
        <CardContent className="pt-2">
          <div className="relative pl-6 space-y-3 max-h-[600px] overflow-y-auto before:absolute before:left-2 before:top-3 before:bottom-3 before:w-px before:bg-border">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune entrée d'audit</div>
            ) : logs.map((l: any) => {
              const Icon = ACTION_ICONS[l.action] || Eye
              return (
                <div key={l.id} className="relative">
                  <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', MODULE_COLORS[l.module] || 'bg-gray-100 text-gray-600')}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{l.action.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className="text-[10px]">{l.module}</Badge>
                      </div>
                      {l.details && <div className="text-xs text-muted-foreground mt-0.5">{l.details}</div>}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span>{l.utilisateur || 'Système'}</span>
                        {l.ip && <span>· {l.ip}</span>}
                        <span>· {formatDateTime(l.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
