import { NextRequest, NextResponse } from 'next/server'

// 代理到阿里云服务器股票数据 API（DuckDB 直读 parquet）
const UPSTREAM = process.env.STOCK_API_BASE || 'http://139.224.245.96:8000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code') || ''
  const period = searchParams.get('period') || 'daily'
  const limit = searchParams.get('limit') || '2000'
  const start = searchParams.get('start') || ''
  const end = searchParams.get('end') || ''
  const exact = searchParams.get('exact') || ''

  if (!code) return NextResponse.json({ error: 'code 必填' }, { status: 400 })

  const params: Record<string, string> = { code, period, limit }
  if (start) params.start = start
  if (end) params.end = end
  if (exact) params.exact = exact
  const qs = new URLSearchParams(params)
  try {
    const resp = await fetch(`${UPSTREAM}/api/kline?${qs}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  } catch (e) {
    return NextResponse.json(
      { error: '数据源不可达（服务器 8000 端口需公网放行）' },
      { status: 502 },
    )
  }
}
