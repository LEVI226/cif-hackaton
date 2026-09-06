import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const params = await db.parametre.findMany({ orderBy: { cle: 'asc' } })
    return NextResponse.json({ data: params })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { cle, valeur } = body
    const param = await db.parametre.upsert({
      where: { cle },
      update: { valeur },
      create: { cle, valeur, description: body.description || '' },
    })
    return NextResponse.json(param)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
