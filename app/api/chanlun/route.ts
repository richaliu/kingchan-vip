import { NextRequest, NextResponse } from 'next/server'

// 缠论 RAG API 代理 → 服务器 8081（独立 RAG 服务）
const UPSTREAM = process.env.RAG_API_BASE || 'http://139.224.245.96:8081'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path') || ''
  const qs = new URLSearchParams()
  for (const [k, v] of searchParams.entries()) {
    if (k !== 'path') qs.set(k, v)
  }
  const url = `${UPSTREAM}/api/chanlun/${path}${qs.toString() ? '?' + qs : ''}`
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(25000),
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  } catch (e) {
    return NextResponse.json({ error: 'RAG 数据源不可达（服务器 8081）' }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path') || ''
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON 解析失败' }, { status: 400 })
  }
  const url = `${UPSTREAM}/api/chanlun/${path}`
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(250000), // hermes 回答可能 1-3 分钟
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  } catch (e) {
    return NextResponse.json({ error: '对话服务不可达（服务器 8081）' }, { status: 502 })
  }
}
