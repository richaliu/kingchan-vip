'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef, useState } from 'react'

const PERIODS = [
  { key: 'daily', label: '日K' },
  { key: '10d', label: '10日' },
  { key: 'weekly', label: '周K' },
  { key: 'monthly', label: '月K' },
  { key: 'quarterly', label: '季K' },
  { key: '30m', label: '30分' },
  { key: '5m', label: '5分' },
]

export default function KlinePage() {
  const [symbol, setSymbol] = useState({ code: '600519', name: '600519' })
  const [period, setPeriod] = useState('daily')
  const [query, setQuery] = useState('600519')
  const [candidates, setCandidates] = useState<any[]>([])
  const [libReady, setLibReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const chartRef = useRef<HTMLDivElement>(null)
  const chartObj = useRef<any>(null)
  const periodRef = useRef(period)
  const symbolRef = useRef(symbol)
  periodRef.current = period
  symbolRef.current = symbol

  // 注册 HQChart 数据回调
  useEffect(() => {
    if (!libReady) return
    const w = window as any
    w.JSRequest.KLine = (option: any, callback: (d: any) => void) => {
      const code = option.symbol?.code || symbolRef.current.code
      const pd = periodRef.current
      setLoading(true)
      setErrMsg('')
      fetch(`/api/kline?code=${encodeURIComponent(code)}&period=${pd}&limit=1000`)
        .then((r) => r.json())
        .then((d) => {
          setLoading(false)
          if (!d || d.error || !Array.isArray(d.data) || d.data.length === 0) {
            setErrMsg(d?.error || '暂无数据')
            callback({ code, name: code, day: [] })
            return
          }
          callback({
            code: d.code || code,
            name: d.name || code,
            day: d.data.map((x: any) => ({
              date: String(x.date).slice(0, 10),
              open: x.open,
              high: x.high,
              low: x.low,
              close: x.close,
              vol: x.volume != null ? x.volume : x.vol,
              amount: x.amount,
            })),
          })
        })
        .catch(() => {
          setLoading(false)
          setErrMsg('数据加载失败')
          callback({ code, name: code, day: [] })
        })
    }
  }, [libReady])

  // 初始化/重建图表
  const initChart = useCallback(() => {
    const w = window as any
    if (!w.JSChart || !chartRef.current) return
    try {
      chartObj.current?.Destroy?.()
    } catch {
      /* ignore */
    }
    try {
      const container = chartRef.current
      container.innerHTML = '' // 清空旧 canvas
      const option = {
        type: 'kline',
        symbol: symbolRef.current,
        isDrag: true,
        isRightMenuEnable: false,
        rate: { isShow: false },
        KLine: {
          MaxReqeustDataCount: 1000,
          isShowTitle: true,
          isShowMenu: false,
          isShowRight: false,
          isInfoTipShow: true,
          KLineTitle: { isShow: true },
          Area: { isShow: true },
        },
      }
      chartObj.current = w.JSChart.Init(container)
      chartObj.current.SetOption(option)
    } catch (e) {
      setErrMsg('图表初始化失败: ' + String(e))
    }
  }, [])

  useEffect(() => {
    if (libReady) initChart()
  }, [libReady, initChart, symbol, period])

  // 搜索
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) return
    fetch(`/api/stocks?q=${encodeURIComponent(q.trim())}&limit=10`)
      .then((r) => r.json())
      .then((d) => setCandidates(Array.isArray(d.items) ? d.items : []))
  }, [])

  const pick = (c: any) => {
    setSymbol({ code: c.code, name: c.name || c.code })
    setCandidates([])
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--font-serif-sc), serif' }}>
      <Script
        src="/hqchart/umychart.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          const w = window as any
          if (w.JSChart) setLibReady(true)
          else setErrMsg('图表库加载失败')
        }}
        onError={() => setErrMsg('图表库加载失败')}
      />

      <h1 style={{ fontSize: 24, marginBottom: 16, textAlign: 'center' }}>K 线图</h1>

      {/* 搜索栏 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', position: 'relative' }}>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            doSearch(e.target.value)
          }}
          onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
          placeholder="输入代码或名称，如 600519"
          style={{ flex: 1, padding: '8px 12px', fontSize: 15, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button onClick={() => doSearch(query)} style={{ padding: '8px 16px', fontSize: 15, border: '1px solid #888', borderRadius: 6, background: '#f5f5f5', cursor: 'pointer' }}>
          搜索
        </button>
        {candidates.length > 0 && (
          <div style={{ position: 'absolute', top: 44, left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 6, zIndex: 10, maxHeight: 260, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }}>
            {candidates.map((c) => (
              <div
                key={`${c.code}-${c.period}`}
                onClick={() => pick(c)}
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}
              >
                <b>{c.code}</b> <span style={{ color: '#888' }}>{c.period} · {c.board}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 当前代码 + 周期切换 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 17, fontWeight: 600 }}>
          {symbol.code} {symbol.name !== symbol.code ? symbol.name : ''}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '4px 10px',
                fontSize: 14,
                border: '1px solid #ccc',
                borderRadius: 4,
                cursor: 'pointer',
                background: period === p.key ? '#333' : '#fff',
                color: period === p.key ? '#fff' : '#333',
              }}
            >
              {p.label}
            </button>
          ))}
        </span>
      </div>

      {/* 状态提示 */}
      {loading && <div style={{ textAlign: 'center', color: '#888', padding: 8 }}>数据加载中…</div>}
      {errMsg && !loading && (
        <div style={{ textAlign: 'center', color: '#c00', padding: 8, border: '1px solid #f0c0c0', borderRadius: 6, marginBottom: 8, background: '#fff8f8' }}>
          ⚠️ {errMsg}
        </div>
      )}

      {/* 图表容器 */}
      <div
        ref={chartRef}
        style={{ width: '100%', height: 560, border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff' }}
      />
      <p style={{ marginTop: 8, color: '#999', fontSize: 12, textAlign: 'center' }}>
        数据源：本地服务器股票数据库（日K/周K/月K/季K/10日/30分/5分）
      </p>
    </div>
  )
}
