import { NextRequest, NextResponse } from 'next/server'
import { calculerScoreRisqueClient } from '@/lib/rule-engine'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const score = await calculerScoreRisqueClient(id)
    return NextResponse.json(score)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
