import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        client: true,
        compte: true,
        alertes: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!transaction) return NextResponse.json({ error: 'Transaction non trouvée' }, { status: 404 })
    return NextResponse.json(transaction)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
