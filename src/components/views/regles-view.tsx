'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Shield, ShieldCheck, ShieldAlert, Zap, TrendingUp, Globe2,
  UserCheck, Layers, AlertTriangle, Ban
} from 'lucide-react'

export function ReglesView() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['regles'],
    queryFn: async () => {
      const r = await fetch('/api/regles')
      return r.json()
    },
  })

  const regles = data?.data || []

  async function toggleRegle(id: string, active: boolean) {
    const r = await fetch(`/api/regles/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    if (r.ok) {
      toast.success(`Règle ${!active ? 'activée' : 'désactivée'}`)
      qc.invalidateQueries({ queryKey: ['regles'] })
    }
  }

  const icons: Record<string, any> = {
    SEUIL: Zap,
    VELOCITY: TrendingUp,
    PROFIL: UserCheck,
    PAYS: Globe2,
    PPE: ShieldAlert,
    STRUCTURING: Layers,
  }

  const actives = regles.filter((r: any) => r.active).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Shield className="w-3.5 h-3.5" /> Total règles</div><div className="text-xl font-bold mt-1">{regles.length}</div></Card>
        <Card className="p-4"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck className="w-3.5 h-3.5" /> Actives</div><div className="text-xl font-bold mt-1 text-emerald-600">{actives}</div></Card>
        <Card className="p-4"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Ban className="w-3.5 h-3.5" /> Blocages</div><div className="text-xl font-bold mt-1 text-red-600">{regles.filter((r: any) => r.type === 'BLOCAGE').length}</div></Card>
        <Card className="p-4"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><AlertTriangle className="w-3.5 h-3.5" /> Alertes</div><div className="text-xl font-bold mt-1 text-amber-600">{regles.filter((r: any) => r.type === 'ALERTE').length}</div></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {regles.map((r: any) => {
          const Icon = icons[r.categorie] || Shield
          let params: any = {}
          try { params = JSON.parse(r.parametres) } catch { /* */ }
          return (
            <Card key={r.id} className={cn('overflow-hidden', !r.active && 'opacity-60')}>
              <div className={cn('h-1', r.type === 'BLOCAGE' ? 'bg-red-500' : 'bg-amber-500')} />
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    r.type === 'BLOCAGE' ? 'bg-red-100 dark:bg-red-950/40' : 'bg-amber-100 dark:bg-amber-950/40')}>
                    <Icon className={cn('w-5 h-5', r.type === 'BLOCAGE' ? 'text-red-600' : 'text-amber-600')} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{r.nom}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{r.code}</Badge>
                      <Badge variant="outline" className={cn('text-[10px]',
                        r.type === 'BLOCAGE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                        {r.type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">Priorité {r.priorite}</Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {Object.entries(params).slice(0, 4).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-[10px] font-mono">
                          {k}: {String(v).slice(0, 30)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Switch checked={r.active} onCheckedChange={() => toggleRegle(r.id, r.active)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
