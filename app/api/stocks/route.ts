import { NextRequest, NextResponse } from 'next/server'

const UPSTREAM = process.env.STOCK_API_BASE || 'http://139.224.245.96:8000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const period = searchParams.get('period') || ''
  const limit = searchParams.get('limit') || '20'

  const qs = new URLSearchParams({ q, period, limit })
  try {
    const resp = await fetch(`${UPSTREAM}/api/stocks?${qs}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  } catch {
    return NextResponse.json({ error: '数据源不可达' }, { status: 502 })
  }
}
