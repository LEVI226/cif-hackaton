import { NextRequest, NextResponse } from 'next/server'
import { calculerSoldeGlobal } from '@/lib/rule-engine'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const solde = await calculerSoldeGlobal(id)
    return NextResponse.json(solde)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
