'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_STOCKS = [
  { code: '600519', name: '贵州茅台' },
  { code: '000001', name: '平安银行' },
  { code: '300750', name: '宁德时代' },
  { code: '601318', name: '中国平安' },
  { code: '000858', name: '五粮液' },
  { code: '002594', name: '比亚迪' },
  { code: '600036', name: '招商银行' },
  { code: '000651', name: '格力电器' },
  { code: '601899', name: '紫金矿业' },
  { code: '300059', name: '东方财富' },
]

const PERIODS = [
  { key: 'daily', label: '日K' },
  { key: 'weekly', label: '周K' },
  { key: 'monthly', label: '月K' },
  { key: 'quarterly', label: '季K' },
  { key: '30m', label: '30分' },
  { key: '5m', label: '5分' },
]

const INDEX_MODES = [
  { key: 'macd', label: 'MACD' },
  { key: 'vol', label: '成交量' },
  { key: 'ma', label: '仅均线' },
]

function toSymbol(code: string): string {
  const c = String(code).trim()
  if (/^(6|9|5)/.test(c)) return `${c}.sh`
  return `${c}.sz`
}

const PERIOD_MAP: Record<string, number> = {
  daily: 0,
  weekly: 1,
  monthly: 2,
  quarterly: 9,
  '30m': 7,
  '5m': 5,
}

// 按指标模式生成副图配置
function getWindows(mode: string) {
  const base: any[] = [{ Index: 'MA', Modify: false, Change: false }]
  if (mode === 'macd') base.push({ Index: 'MACD', Modify: false, Change: false })
  if (mode === 'vol') base.push({ Index: 'VOL', Modify: false, Change: false })
  return base
}

export default function KlinePage() {
  const [stockList, setStockList] = useState(DEFAULT_STOCKS)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const symbol = stockList[selectedIdx] ?? DEFAULT_STOCKS[0]
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<any[]>([])
  const [libReady, setLibReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  // 上图默认日K+MACD，下图默认周K+成交量
  const [periodTop, setPeriodTop] = useState('daily')
  const [periodBottom, setPeriodBottom] = useState('weekly')
  const [indexTop, setIndexTop] = useState('macd')
  const [indexBottom, setIndexBottom] = useState('vol')

  const topRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const chartTop = useRef<any>(null)
  const chartBottom = useRef<any>(null)
  const symbolRef = useRef(symbol)
  symbolRef.current = symbol

  // 加载 HQChart 模块
  useEffect(() => {
    const w = window as any
    const SCRIPTS = [
      '/hqchart/jquery.min.js',
      '/hqchart/umychart.network.js',
      '/hqchart/umychart.full.js',
      '/hqchart/umychart.complier.js',
      '/hqchart/umychart.index.data.js',
      '/hqchart/umychart.style.js',
    ]
    if (w.JSChart && w.JSIndexScript) {
      setLibReady(true)
      return
    }
    let idx = 0
    const loadNext = () => {
      if (idx >= SCRIPTS.length) {
        if (w.JSChart && w.JSIndexScript) setLibReady(true)
        else setErrMsg('图表库加载失败')
        return
      }
      const s = document.createElement('script')
      s.src = SCRIPTS[idx++]
      s.onload = loadNext
      s.onerror = () => setErrMsg('加载失败: ' + s.src)
      document.head.appendChild(s)
    }
    loadNext()
  }, [])

  // 构建单个图表
  const makeChart = useCallback((container: HTMLDivElement, period: string, mode: string): any => {
    const w = window as any
    const code = symbolRef.current.code
    container.innerHTML = ''
    const option = {
      Type: '历史K线图',
      Symbol: toSymbol(code),
      Windows: getWindows(mode),
      Listener: { KeyDown: true, Wheel: true },
      IsShowCorssCursorInfo: true,
      KLine: {
        Right: 0,
        Period: PERIOD_MAP[period] ?? 0,
        MaxReqeustDataCount: 1000,
        PageSize: 50,
        IsShowTooltip: true,
      },
      NetworkFilter: (data: any, callback: (d: any) => void) => {
        const cmd = data.Name || data.Request?.Command || ''
        const reqCode = symbolRef.current.code
        const isMinute = cmd === 'KLineChartContainer::ReqeustHistoryMinuteData'
        const isDay = cmd === 'KLineChartContainer::RequestHistoryData'
        if (isMinute || isDay) {
          setLoading(true)
          setErrMsg('')
          fetch(`/api/kline?code=${encodeURIComponent(reqCode)}&period=${period}&limit=1000`)
            .then((r) => r.json())
            .then((d) => {
              setLoading(false)
              if (!d || d.error || !Array.isArray(d.data) || d.data.length === 0) {
                callback({ code: 0, data: [], Data: [], symbol: toSymbol(reqCode), name: reqCode })
                return
              }
              const rows: any[] = []
              let yClose: number | null = null
              d.data.forEach((x: any) => {
                const dt = String(x.date)
                const dateNum = parseInt(dt.slice(0, 10).replace(/-/g, ''), 10)
                let tm = 0
                const m = dt.match(/(\d{2}):(\d{2})/)
                if (m) tm = parseInt(m[1], 10) * 100 + parseInt(m[2], 10)
                rows.push([
                  dateNum,
                  yClose,
                  x.open,
                  x.high,
                  x.low,
                  x.close,
                  x.volume != null ? x.volume : x.vol,
                  x.amount,
                  tm,
                ])
                yClose = x.close
              })
              callback({ code: 0, data: rows, Data: rows, symbol: toSymbol(reqCode), name: d.name || reqCode })
            })
            .catch(() => {
              setLoading(false)
              setErrMsg('数据加载失败')
              callback({ code: 0, data: [], Data: [], symbol: toSymbol(reqCode), name: reqCode })
            })
        }
      },
    }
    const chart = w.JSChart.Init(container)
    chart.SetOption(option)
    return chart
  }, [])

  // 双图重建（上图=日K, 下图=周K；周期/指标各自独立）
  useEffect(() => {
    if (!libReady) return
    if (topRef.current) chartTop.current = makeChart(topRef.current, periodTop, indexTop)
    if (bottomRef.current) chartBottom.current = makeChart(bottomRef.current, periodBottom, indexBottom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libReady, symbol, periodTop, periodBottom, indexTop, indexBottom])

  // 触控板手势
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const container = e.currentTarget as HTMLDivElement
    const canvas = container.querySelector('canvas')
    if (!canvas) return
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX !== 0) {
      const key = e.deltaX > 0 ? 'ArrowRight' : 'ArrowLeft'
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    }
  }, [])

  // 键盘 ↑↓ 切换股票
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') setSelectedIdx((i) => Math.max(0, i - 1))
      else if (e.key === 'ArrowDown') setSelectedIdx((i) => Math.min(stockList.length - 1, i + 1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [stockList.length])

  // 搜索（按 code 去重）
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setCandidates([])
      return
    }
    fetch(`/api/stocks?q=${encodeURIComponent(q.trim())}&limit=20`)
      .then((r) => r.json())
      .then((d) => {
        const seen = new Set<string>()
        const uniq: any[] = []
        ;(Array.isArray(d.items) ? d.items : []).forEach((i: any) => {
          if (!seen.has(i.code)) {
            seen.add(i.code)
            uniq.push(i)
          }
        })
        setCandidates(uniq)
      })
  }, [])

  const pickStock = (c: any) => {
    const code = String(c.code || c).trim()
    const name = c.name || code
    setStockList((prev) => {
      const idx = prev.findIndex((x) => x.code === code)
      if (idx >= 0) {
        setSelectedIdx(idx)
        return prev
      }
      setSelectedIdx(0)
      return [{ code, name }, ...prev]
    })
    setCandidates([])
    setQuery('')
  }

  // 渲染单个图表块（标题+周期按钮+指标切换+图）
  const renderChartBlock = (
    title: string,
    period: string,
    setPeriod: (k: string) => void,
    mode: string,
    setMode: (k: string) => void,
    chartRef: React.RefObject<HTMLDivElement | null>,
    height: number,
  ) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {title} · {symbol.name} {symbol.code}
        </span>
        <span style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '2px 8px',
                fontSize: 12,
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
        <span style={{ display: 'flex', gap: 4 }}>
          {INDEX_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                padding: '2px 8px',
                fontSize: 12,
                border: '1px solid #999',
                borderRadius: 4,
                cursor: 'pointer',
                background: mode === m.key ? '#8b4513' : '#fff',
                color: mode === m.key ? '#fff' : '#666',
              }}
            >
              {m.label}
            </button>
          ))}
        </span>
      </div>
      <div
        ref={chartRef}
        onWheel={handleWheel}
        style={{ width: '100%', height, border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff' }}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 10, maxWidth: 1400, margin: '0 auto', padding: '14px', fontFamily: 'var(--font-serif-sc), serif' }}>
      {/* 左侧窄选择框 */}
      <div style={{ width: 150, flexShrink: 0, border: '1px solid #e5e5e5', borderRadius: 8, padding: 8, background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>自选</div>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            doSearch(e.target.value)
          }}
          placeholder="代码/名称"
          style={{ padding: '5px 8px', fontSize: 12, border: '1px solid #ccc', borderRadius: 6, marginBottom: 6 }}
        />
        {candidates.length > 0 && (
          <div style={{ border: '1px solid #ddd', borderRadius: 6, marginBottom: 6, maxHeight: 150, overflowY: 'auto' }}>
            {candidates.map((c) => (
              <div
                key={c.code}
                onClick={() => pickStock(c)}
                style={{ padding: '5px 8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}
              >
                <b>{c.name}</b> <span style={{ color: '#999', fontSize: 11 }}>{c.code}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {stockList.map((s, i) => (
            <div
              key={s.code}
              onClick={() => setSelectedIdx(i)}
              style={{
                padding: '5px 8px',
                cursor: 'pointer',
                borderRadius: 5,
                marginBottom: 1,
                fontSize: 12,
                background: i === selectedIdx ? '#333' : 'transparent',
                color: i === selectedIdx ? '#fff' : '#333',
              }}
            >
              <b>{s.name}</b> <span style={{ opacity: 0.6, fontSize: 11 }}>{s.code}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 4, color: '#999', fontSize: 10, textAlign: 'center' }}>↑↓切换 · 触控板滑</div>
      </div>

      {/* 右侧图表区：上图=日K（默认），下图=周K（默认） */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {loading && <div style={{ textAlign: 'center', color: '#888', padding: 4, fontSize: 12 }}>数据加载中…</div>}
        {errMsg && !loading && (
          <div style={{ textAlign: 'center', color: '#c00', padding: 6, border: '1px solid #f0c0c0', borderRadius: 6, marginBottom: 6, background: '#fff8f8', fontSize: 13 }}>
            ⚠️ {errMsg}
          </div>
        )}
        {renderChartBlock('日K', periodTop, setPeriodTop, indexTop, setIndexTop, topRef, 400)}
        {renderChartBlock('周K', periodBottom, setPeriodBottom, indexBottom, setIndexBottom, bottomRef, 400)}
        <p style={{ marginTop: 6, color: '#999', fontSize: 12, textAlign: 'center' }}>
          两图独立切换周期与指标 · 触控板左右滑=滚动时间 上下滑=缩放
        </p>
      </div>
    </div>
  )
}
