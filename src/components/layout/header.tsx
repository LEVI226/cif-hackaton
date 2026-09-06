'use client'

import { useAppStore, type ViewName } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { Search, Moon, Sun, Globe, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { NotificationCenter } from '@/components/layout/notification-center'

const viewTitles: Record<ViewName, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de la conformité LBC/FT/FP' },
  clients: { title: 'Gestion des clients', subtitle: 'Profilage KYC, scoring de risque et filtrage' },
  transactions: { title: 'Monitoring des transactions', subtitle: 'Filtrage temps réel et détection d\'opérations suspectes' },
  alertes: { title: 'Gestion des alertes', subtitle: 'Alertes bloquantes et informatives LBC/FT/FP' },
  screening: { title: 'Screening PPE & Sanctions', subtitle: 'Vérification contre les listes de sanctions' },
  rapports: { title: 'Rapports de conformité', subtitle: 'Déclarations TRA, SAR et statistiques' },
  calendrier: { title: 'Calendrier réglementaire', subtitle: 'Échéances LBC/FT/FP et obligations BCEAO/GIABA' },
  comparaison: { title: 'Comparaison de clients', subtitle: 'Analyse comparative des profils de risque' },
  parametres: { title: 'Paramètres système', subtitle: 'Configuration de la plateforme et des seuils de conformité' },
  regles: { title: 'Règles de conformité', subtitle: 'Configuration du moteur de détection' },
  audit: { title: 'Journal d\'audit', subtitle: 'Traçabilité des actions système' },
}

export function Header() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const [dark, setDark] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [dark])

  const info = viewTitles[view]

  return (
    <header className="sticky top-0 z-30 glass border-b border-border/60">
      <div className="px-4 md:px-6 py-3 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-bold tracking-tight truncate">{info.title}</h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate">{info.subtitle}</p>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher client, transaction..."
              className="pl-9 h-9 bg-background/60"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setView('clients')
                }
              }}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark(!dark)}
            className="h-9 w-9"
            aria-label="Changer thème"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-2 gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    RC
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold leading-tight">Resp. Conformité</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Agent CIF</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profil</DropdownMenuItem>
              <DropdownMenuItem>Paramètres</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Déconnexion</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden xl:flex items-center gap-2 text-xs text-muted-foreground border-l border-border pl-4">
          <Globe className="w-3.5 h-3.5" />
          <div className="tabular-nums" suppressHydrationWarning>
            {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <Badge variant="outline" className="text-[10px] h-5">UTC+0</Badge>
        </div>
      </div>
    </header>
  )
}
