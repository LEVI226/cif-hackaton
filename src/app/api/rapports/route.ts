import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || ''
    const where: any = {}
    if (type) where.type = type

    const rapports = await db.rapport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: rapports })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const count = await db.rapport.count()
    const reference = `RPT-${String(count + 1).padStart(5, '0')}-${new Date().getFullYear()}`

    const rapport = await db.rapport.create({
      data: {
        ...body,
        reference,
        statut: body.statut || 'BROUILLON',
        creePar: body.creePar || 'Responsable conformité',
      } as any,
    })
    return NextResponse.json(rapport, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
