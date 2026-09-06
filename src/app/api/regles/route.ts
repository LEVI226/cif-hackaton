import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const regles = await db.regleConformite.findMany({ orderBy: { priorite: 'desc' } })
    return NextResponse.json({ data: regles })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const regle = await db.regleConformite.create({
      data: {
        ...body,
        active: body.active ?? true,
        priorite: body.priorite ?? 1,
      } as any,
    })
    return NextResponse.json(regle, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
