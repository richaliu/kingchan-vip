import { NextRequest, NextResponse } from 'next/server'

// 通用 API 代理：/api/<path> → 服务器 8000 /api/<path>
const UPSTREAM = process.env.STOCK_API_BASE || 'http://139.224.245.96:8000'

export async function GET(req: NextRequest, { params }: { params: { proxy: string[] } }) {
  const path = Array.isArray(params.proxy) ? params.proxy.join('/') : params.proxy
  const qs = new URL(req.url).searchParams.toString()
  const url = `${UPSTREAM}/api/${path}${qs ? '?' + qs : ''}`
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    })
    const data = await resp.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '数据源不可达' }, { status: 502 })
  }
}
