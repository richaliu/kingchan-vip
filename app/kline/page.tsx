'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// 默认自选列表（左侧选择框）
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

// A股代码 → HQChart symbol（带市场后缀）
function toSymbol(code: string): string {
  const c = String(code).trim()
  if (/^(6|9|5)/.test(c)) return `${c}.sh`
  return `${c}.sz`
}

// 周期 → HQChart Period 枚举（0日 1周 2月 9季 7三十分 5五分）
const PERIOD_MAP: Record<string, number> = {
  daily: 0,
  weekly: 1,
  monthly: 2,
  quarterly: 9,
  '30m': 7,
  '5m': 5,
}

// HQChart 指标配置（主图 MA + 副图 MACD + 副图 VOL）
const INDEX_WINDOWS = [
  { Index: 'MA', Modify: false, Change: false },
  { Index: 'MACD', Modify: false, Change: false },
  { Index: 'VOL', Modify: false, Change: false },
]

export default function KlinePage() {
  const [stockList, setStockList] = useState(DEFAULT_STOCKS)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const symbol = stockList[selectedIdx] ?? DEFAULT_STOCKS[0]
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<any[]>([])
  const [libReady, setLibReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const weekRef = useRef<HTMLDivElement>(null)
  const dayRef = useRef<HTMLDivElement>(null)
  const chartWeek = useRef<any>(null)
  const chartDay = useRef<any>(null)
  const symbolRef = useRef(symbol)
  symbolRef.current = symbol

  // 依次加载 HQChart 全部模块
  useEffect(() => {
    const w = window as any
    const SCRIPTS = [
      '/hqchart/jquery.min.js',
      '/hqchart/umychart.network.js',
      '/hqchart/umychart.min.js',
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
  const makeChart = useCallback((container: HTMLDivElement, period: string): any => {
    const w = window as any
    const code = symbolRef.current.code
    container.innerHTML = ''
    const option = {
      Type: '历史K线图',
      Symbol: toSymbol(code),
      Windows: INDEX_WINDOWS,
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

  // 初始化双图（周K + 日K）
  useEffect(() => {
    if (!libReady) return
    if (weekRef.current) chartWeek.current = makeChart(weekRef.current, 'weekly')
    if (dayRef.current) chartDay.current = makeChart(dayRef.current, 'daily')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libReady, symbol])

  // 触控板手势：左右滑=平移（模拟键盘←→），上下滑=缩放（HQChart自带wheel）
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

  // 键盘 ↑↓ 切换左侧股票
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') setSelectedIdx((i) => Math.max(0, i - 1))
      else if (e.key === 'ArrowDown') setSelectedIdx((i) => Math.min(stockList.length - 1, i + 1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [stockList.length])

  // 搜索（支持中文名/代码）
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setCandidates([])
      return
    }
    fetch(`/api/stocks?q=${encodeURIComponent(q.trim())}&limit=10`)
      .then((r) => r.json())
      .then((d) => setCandidates(Array.isArray(d.items) ? d.items : []))
  }, [])

  // 选中股票（加入列表 + 高亮）
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

  return (
    <div style={{ display: 'flex', gap: 12, maxWidth: 1400, margin: '0 auto', padding: '16px', fontFamily: 'var(--font-serif-sc), serif' }}>
      {/* 左侧选择框 */}
      <div style={{ width: 230, flexShrink: 0, border: '1px solid #e5e5e5', borderRadius: 8, padding: 10, background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 15 }}>自选 / 搜索</div>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            doSearch(e.target.value)
          }}
          placeholder="代码或中文名"
          style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #ccc', borderRadius: 6, marginBottom: 6 }}
        />
        {candidates.length > 0 && (
          <div style={{ border: '1px solid #ddd', borderRadius: 6, marginBottom: 6, maxHeight: 180, overflowY: 'auto' }}>
            {candidates.map((c, i) => (
              <div
                key={`${c.code}-${i}`}
                onClick={() => pickStock(c)}
                style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}
              >
                <b>{c.name}</b> <span style={{ color: '#999', fontSize: 12 }}>{c.code}</span>
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
                padding: '7px 10px',
                cursor: 'pointer',
                borderRadius: 6,
                marginBottom: 2,
                fontSize: 13,
                background: i === selectedIdx ? '#333' : 'transparent',
                color: i === selectedIdx ? '#fff' : '#333',
              }}
            >
              <b>{s.name}</b> <span style={{ opacity: 0.6, fontSize: 12 }}>{s.code}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 6, color: '#999', fontSize: 11, textAlign: 'center' }}>
          键盘 ↑↓ 切换 · 触控板左右滑=平移 上下滑=缩放
        </div>
      </div>

      {/* 右侧图表区：周K + 日K */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
          {symbol.name} <b>{symbol.code}</b> · 周K / 日K（MACD + 成交量）
        </div>
        {loading && <div style={{ textAlign: 'center', color: '#888', padding: 4, fontSize: 12 }}>数据加载中…</div>}
        {errMsg && !loading && (
          <div style={{ textAlign: 'center', color: '#c00', padding: 6, border: '1px solid #f0c0c0', borderRadius: 6, marginBottom: 6, background: '#fff8f8', fontSize: 13 }}>
            ⚠️ {errMsg}
          </div>
        )}
        <div
          ref={weekRef}
          onWheel={handleWheel}
          style={{ width: '100%', height: 420, border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff', marginBottom: 10 }}
        />
        <div
          ref={dayRef}
          onWheel={handleWheel}
          style={{ width: '100%', height: 420, border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff' }}
        />
        <p style={{ marginTop: 8, color: '#999', fontSize: 12, textAlign: 'center' }}>
          数据源：本地服务器股票数据库 · MACD + 成交量副图 · 触控板手势：左右滑=滚动时间，上下滑=缩放
        </p>
      </div>
    </div>
  )
}
