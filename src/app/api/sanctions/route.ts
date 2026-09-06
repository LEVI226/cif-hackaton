import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || ''
    const source = searchParams.get('source') || ''
    const q = searchParams.get('q') || ''

    const where: any = {}
    if (type) where.type = type
    if (source) where.source = source
    if (q) {
      where.OR = [
        { nom: { contains: q } },
        { prenom: { contains: q } },
        { fonction: { contains: q } },
        { pays: { contains: q } },
      ]
    }

    const sanctions = await db.listeSanction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: sanctions, total: sanctions.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sanction = await db.listeSanction.create({
      data: {
        ...body,
        statut: 'ACTIF',
        dateAjout: new Date().toISOString().slice(0, 10),
      } as any,
    })
    return NextResponse.json(sanction, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
