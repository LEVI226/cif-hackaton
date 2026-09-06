import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const regle = await db.regleConformite.update({ where: { id }, data: body as any })
    return NextResponse.json(regle)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
