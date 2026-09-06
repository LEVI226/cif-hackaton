'use client'

import { ShieldCheck, Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/50 px-4 md:px-6 py-3">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium">CIF Sentinel</span>
          <span className="text-muted-foreground/50">·</span>
          <span>Plateforme de conformité LBC/FT/FP</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Programme DigiCoop-WA+</span>
          <span className="text-muted-foreground/50">·</span>
          <span>v1.0.0</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="flex items-center gap-1">
            Conçu avec <Heart className="w-3 h-3 fill-red-500 text-red-500" /> pour les IMF de l'UEMOA
          </span>
        </div>
      </div>
    </footer>
  )
}
