import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculerScoreRisqueClient } from '@/lib/rule-engine'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await db.client.findUnique({
      where: { id },
      include: {
        transactions: { orderBy: { date: 'asc' }, take: 500 },
        alertes: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

    // Group transactions by day and calculate cumulative risk score
    const byDay: Record<string, { date: string; montant: number; count: number; alertes: number }> = {}

    // Initialize last 30 days
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      byDay[key] = { date: key, montant: 0, count: 0, alertes: 0 }
    }

    // Aggregate transactions
    for (const t of client.transactions) {
      const key = new Date(t.date).toISOString().slice(0, 10)
      if (byDay[key]) {
        byDay[key].montant += t.montant
        byDay[key].count += 1
      }
    }

    // Aggregate alertes
    for (const a of client.alertes) {
      const key = new Date(a.createdAt).toISOString().slice(0, 10)
      if (byDay[key]) {
        byDay[key].alertes += 1
      }
    }

    // Calculate risk score evolution (cumulative)
    const evolution = []
    let cumScore = 0
    const sortedDays = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))

    for (const day of sortedDays) {
      // Base score from current client risk
      let dayScore = client.scoreRisque || 0
      // Add alerts impact
      dayScore += day.alertes * 5
      // Add transaction volume impact (high volume = higher risk)
      if (day.montant > 5000000) dayScore += 10
      if (day.montant > 10000000) dayScore += 15
      // Cumulative average
      cumScore = Math.round((cumScore * 0.7 + dayScore * 0.3))
      evolution.push({
        date: day.date,
        score: Math.min(100, cumScore),
        volume: day.montant,
        transactions: day.count,
        alertes: day.alertes,
      })
    }

    return NextResponse.json({ evolution, current: evolution[evolution.length - 1] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
