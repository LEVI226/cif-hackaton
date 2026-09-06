import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rapport = await db.rapport.findUnique({ where: { id } })
    if (!rapport) return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 })
    return NextResponse.json(rapport)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const rapport = await db.rapport.update({ where: { id }, data: body as any })
    return NextResponse.json(rapport)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
