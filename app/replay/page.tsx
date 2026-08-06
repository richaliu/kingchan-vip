'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ===================== 常量 =====================
const LAYERS = [
  { id: 'l0', label: '预警', icon: '⚡' },
  { id: 'l1', label: '大盘方向', icon: '🧭' },
  { id: 'l2', label: '日线·资金', icon: '📈' },
  { id: 'l3', label: '情绪温度', icon: '🌡️' },
  { id: 'l4', label: '板块轮动', icon: '🔄' },
  { id: 'l5', label: '个股诊断', icon: '🔍' },
  { id: 'l6', label: '交易计划', icon: '📋' },
]

const INDICES: Record<string, { name: string; color: string }> = {
  sh000001: { name: '上证', color: '#ef4444' },
  sz399001: { name: '深证', color: '#3b82f6' },
  sz399006: { name: '创业板', color: '#22c55e' },
  sh000016: { name: '上证50', color: '#f59e0b' },
  sh000300: { name: '沪深300', color: '#a78bfa' },
  sh000688: { name: '科创50', color: '#06b6d4' },
  sh000852: { name: '中证1000', color: '#f97316' },
  sh000905: { name: '中证500', color: '#14b8a6' },
}

const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155',
  green: '#22c55e', red: '#ef4444', amber: '#f59e0b',
  teal: '#14b8a6', emerald: '#10b981', rose: '#f43f5e',
  muted: '#64748b', bright: '#e2e8f0',
}

// ===================== 工具函数 =====================
function fmtMoney(v: any): string {
  const n = Number(v)
  if (!isFinite(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (abs >= 1e4) return (n / 1e4).toFixed(0) + '万'
  return n.toFixed(0)
}
function fmtPct(v: any): string {
  const n = Number(v)
  if (!isFinite(n)) return '-'
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}
function c(v: number) { return v > 0 ? C.green : v < 0 ? C.red : C.amber }

// VWAP 计算
function calcVWAP(klines: any[]) {
  if (!klines?.length) return null
  let cumVol = 0, cumVal = 0
  for (const k of klines) {
    const v = Number(k.volume || 0), price = Number(k.close || 0)
    cumVol += v; cumVal += price * v
  }
  return cumVol > 0 ? cumVal / cumVol : null
}
function calcMA(data: number[], period: number) {
  const result: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j]
    result.push(sum / period)
  }
  return result
}

// 主力阶段判断
function judgePhase(mf: any[], klines?: any[]) {
  if (!mf?.length) return { phase: '数据不足', color: C.muted, advice: '—', level: 0 }
  const recent5 = mf.slice(-5)
  const recent10 = mf.slice(-10)
  const recent20 = mf.slice(-20)
  const main5 = recent5.reduce((s: number, r: any) => s + (Number(r.super_net || 0) + Number(r.large_net || 0)), 0)
  const main10 = recent10.reduce((s: number, r: any) => s + (Number(r.super_net || 0) + Number(r.large_net || 0)), 0)
  const main20 = recent20.reduce((s: number, r: any) => s + (Number(r.super_net || 0) + Number(r.large_net || 0)), 0)
  const small5 = recent5.reduce((s: number, r: any) => s + Number(r.small_net || 0), 0)
  const upDays5 = recent5.filter((r: any) => (Number(r.super_net || 0) + Number(r.large_net || 0)) > 0).length

  // 量价判断
  let volUp = false, priceUp = false
  if (klines && klines.length >= 5) {
    const r5 = klines.slice(-5)
    const r10 = klines.slice(-10, -5)
    const avgVol5 = r5.reduce((s: number, k: any) => s + Number(k.volume || 0), 0) / 5
    const avgVol10 = r10.length > 0 ? r10.reduce((s: number, k: any) => s + Number(k.volume || 0), 0) / r10.length : avgVol5
    volUp = avgVol5 > avgVol10 * 1.2
    priceUp = Number(r5[r5.length - 1].close) > Number(r5[0].close)
  }

  // 出货期：主力流出+放量滞涨/阴线
  if (main5 < -5e7 && main10 < 0) {
    if (volUp && !priceUp) return { phase: '出货期', color: C.rose, advice: '主力放量出货，坚决回避', level: -2 }
    return { phase: '派发期', color: '#991b1b', advice: '主力持续流出，不参与', level: -1 }
  }
  // 拉升期：主力大幅流入+放量+上涨
  if (main5 > 1e8 && upDays5 >= 3 && priceUp && volUp) return { phase: '拉升期', color: C.emerald, advice: '主力主导拉升，持有或突破追', level: 2 }
  // 吸筹期：持续流入+缩量横盘
  if (main20 > 1e8 && main5 > 0) return { phase: '吸筹期', color: C.teal, advice: '主力持续买入，低吸耐心', level: 1 }
  // 洗盘期：缩量回调+流出放缓
  if (main10 < 0 && main5 > main10 / 2 && !volUp) return { phase: '洗盘期', color: C.amber, advice: '缩量洗盘，持有或逢低加仓', level: 0 }
  // 散户恐慌吸筹
  if (small5 < -5e7 && main5 > 1e7) return { phase: '吸筹期（散户割肉）', color: C.teal, advice: '散户恐慌+主力接筹，低吸良机', level: 1 }
  return { phase: '震荡博弈', color: C.amber, advice: '方向不明，等待确认', level: 0 }
}

// 承接力评级
function judgeSupport(mf: any[], bigDeals: any[], klines?: any[], margin?: any[]) {
  if (!mf?.length) return { stars: 0, label: '数据不足', desc: '—' }
  const recent3 = mf.slice(-3)
  let stars = 0
  const reasons: string[] = []

  // 1. 下跌承接
  const main3 = recent3.reduce((s: number, r: any) => s + (Number(r.super_net || 0) + Number(r.large_net || 0)), 0)
  if (main3 > 0) { stars++; reasons.push('近3日主力净流入') }

  // 2. 缩量判断
  if (klines && klines.length >= 10) {
    const vol3 = klines.slice(-3).reduce((s: number, k: any) => s + Number(k.volume || 0), 0) / 3
    const vol7 = klines.slice(-10, -3).reduce((s: number, k: any) => s + Number(k.volume || 0), 0) / 7
    if (vol3 < vol7 * 0.6) { stars++; reasons.push('缩量明显（洗盘特征）') }
  }

  // 3. 尾盘态度（大单买卖比）
  if (bigDeals?.length) {
    const buyCount = bigDeals.filter((d: any) => d.deal_type?.includes('买')).length
    const sellCount = bigDeals.filter((d: any) => d.deal_type?.includes('卖')).length
    if (buyCount > sellCount * 1.2) { stars++; reasons.push('大单买盘>卖盘') }
    else if (buyCount < sellCount * 0.8) { stars--; reasons.push('大单卖盘>买盘') }
  }

  // 4. 融资态度
  if (margin && margin.length >= 5) {
    const r5 = margin.slice(-5)
    const marginNow = Number(r5[r5.length - 1].rzye || 0)
    const margin5d = Number(r5[0].rzye || 0)
    if (marginNow > margin5d * 1.05) { stars++; reasons.push('融资5日增仓>5%') }
    else if (marginNow < margin5d * 0.95) { stars--; reasons.push('融资5日减仓>5%') }
  }

  stars = Math.max(0, Math.min(5, stars))
  const labels = ['无承接', '极弱', '弱', '一般', '良好', '强承接']
  const descs = ['散户踩踏，回避', '反弹减仓', '需等盘口确认', '可小仓试', '回调可建仓', '急跌大胆接']
  return { stars, label: labels[stars], desc: descs[stars], reasons }
}

// ===================== 组件 =====================
export default function ReplayPage() {
  const [layer, setLayer] = useState('l1')
  const [macro, setMacro] = useState<any>(null)
  const [sectors, setSectors] = useState<any>(null)
  const [sentiment, setSentiment] = useState<any>(null)
  const [stock, setStock] = useState<any>(null)
  const [stockCode, setStockCode] = useState('600519')
  const [loading, setLoading] = useState(false)
  const [l1Index, setL1Index] = useState('sh000001')   // 大盘方向：指数
  const [l1Period, setL1Period] = useState('weekly')    // 大盘方向：周期 weekly|daily
  const [topListRecent, setTopListRecent] = useState<any>(null)  // 全市场龙虎榜
  const [stockTopList, setStockTopList] = useState<any>(null)    // 个股龙虎榜
  const ecReady = useRef(false)
  const chartRefs = useRef<Record<string, any>>({})

  // 加载 ECharts + 数据
  useEffect(() => {
    const w = window as any
    if (w.echarts) { ecReady.current = true; fetchAll(); return }
    const s = document.createElement('script')
    s.src = 'https://registry.npmmirror.com/echarts/5.5.0/files/dist/echarts.min.js'
    s.onload = () => { ecReady.current = true; fetchAll() }
    document.head.appendChild(s)
  }, [])

  const fetchAll = () => {
    fetch('/api/replay/macro').then(r => r.json()).then(setMacro).catch(() => {})
    fetch('/api/replay/sectors').then(r => r.json()).then(setSectors).catch(() => {})
    fetch('/api/replay/sentiment').then(r => r.json()).then(setSentiment).catch(() => {})
    fetch('/api/replay/top_list/recent?days=1').then(r => r.json()).then(setTopListRecent).catch(() => {})
  }

  const searchStock = (code: string) => {
    if (!code.trim()) return
    setLoading(true)
    setStock(null)
    setStockTopList(null)
    fetch(`/api/replay/stock?code=${encodeURIComponent(code.trim())}&days=60`)
      .then(r => r.json()).then(d => { setStock(d); setLoading(false) })
      .catch(() => setLoading(false))
    fetch(`/api/replay/top_list?code=${encodeURIComponent(code.trim())}&days=60`)
      .then(r => r.json()).then(setStockTopList).catch(() => {})
  }

  // ===================== Layer 1: 大盘方向图表 =====================
  useEffect(() => {
    if (layer !== 'l1' || !ecReady.current) return
    const dataSource = l1Period === 'weekly' ? macro?.index_weekly : macro?.index_kline
    if (!dataSource?.length) return
    const el = document.getElementById('chart-l1')
    if (!el) return
    const ec = (window as any).echarts
    if (chartRefs.current.l1) chartRefs.current.l1.dispose()
    const dom = ec.init(el!, 'dark')
    chartRefs.current.l1 = dom

    const idxInfo = INDICES[l1Index] || { name: l1Index, color: '#999' }
    const limit = l1Period === 'weekly' ? 52 : 90
    const raw = dataSource.filter((r: any) => r.code === l1Index).sort((a: any, b: any) => String(a.d).localeCompare(String(b.d))).slice(-limit)
    const dates = raw.map((r: any) => String(r.d).slice(0, l1Period === 'weekly' ? 10 : 10))
    const closes = raw.map((r: any) => Number(r.close))
    const vols = raw.map((r: any) => Number(r.volume || 0) / 1e8)

    const ma5 = calcMA(closes, 5)
    const ma10 = calcMA(closes, 10)
    const ma20 = calcMA(closes, 20)
    const maColors = ['#f59e0b', '#06b6d4', '#a78bfa']
    const maLabels = ['MA5', 'MA10', 'MA20']
    const periodLabel = l1Period === 'weekly' ? '周' : '日'

    dom.setOption({
      backgroundColor: C.bg,
      title: { text: `${idxInfo.name}${periodLabel}线（${limit}${periodLabel}）`, textStyle: { color: '#ccc', fontSize: 14 }, left: 10, top: 5 },
      tooltip: { trigger: 'axis' },
      legend: { data: [`${idxInfo.name}收盘`, ...maLabels, `${periodLabel}量`], textStyle: { color: '#aaa' }, bottom: 0 },
      grid: [
        { top: 35, left: 55, right: 15, bottom: 40, height: '60%' },
        { top: '78%', left: 55, right: 15, height: '15%' },
      ],
      xAxis: [
        { type: 'category', data: dates, axisLabel: { color: '#888', fontSize: 9 }, gridIndex: 0 },
        { type: 'category', data: dates, axisLabel: { show: false }, gridIndex: 1 },
      ],
      yAxis: [
        { type: 'value', scale: true, axisLabel: { color: '#888', fontSize: 10 }, splitLine: { lineStyle: { color: '#1e293b' } }, gridIndex: 0 },
        { type: 'value', axisLabel: { color: '#888', fontSize: 9 }, splitLine: { lineStyle: { color: '#1e293b' } }, gridIndex: 1 },
      ],
      series: [
        { name: `${idxInfo.name}收盘`, type: 'line', data: closes.map((v: number, i: number) => [dates[i], v]), smooth: true, symbol: 'none',
          lineStyle: { color: idxInfo.color, width: 2 } },
        ...[ma5, ma10, ma20].map((ma: (number | null)[], i: number) => ({
          name: maLabels[i], type: 'line' as const,
          data: ma.map((v, j) => v != null ? [dates[j], v] : null).filter(Boolean),
          symbol: 'none', lineStyle: { color: maColors[i], width: 1, type: 'dashed' as const },
        })),
        { name: `${periodLabel}量`, type: 'bar', xAxisIndex: 1, yAxisIndex: 1,
          data: dates.map((d: string, i: number) => [d, vols[i]]),
          itemStyle: { color: vols.map((v: number) => v > (vols.reduce((a: number, b: number) => a + b, 0) / vols.length) * 1.5 ? '#f59e0b44' : '#1e293b') } },
      ],
    })
    return () => dom.dispose()
  }, [layer, macro, l1Index, l1Period])

  // 均线排列计算（基于选中的指数+周期）
  const maArrangement = (() => {
    const dataSource = l1Period === 'weekly' ? macro?.index_weekly : macro?.index_kline
    if (!dataSource?.length) return { text: '数据加载中', color: C.muted }
    const raw = dataSource.filter((r: any) => r.code === l1Index).sort((a: any, b: any) => String(a.d).localeCompare(String(b.d)))
    if (raw.length < 20) return { text: '数据不足', color: C.muted }
    const closes = raw.map((r: any) => Number(r.close))
    const m5 = closes.slice(-5).reduce((a: number, b: number) => a + b, 0) / 5
    const m10 = closes.slice(-10).reduce((a: number, b: number) => a + b, 0) / 10
    const m20 = closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20
    if (m5 > m10 && m10 > m20) return { text: '多头排列 ↗', color: C.green }
    if (m5 < m10 && m10 < m20) return { text: '空头排列 ↘', color: C.red }
    return { text: '缠绕震荡 ↔', color: C.amber }
  })()

  // 量能判断（基于选中的指数+周期）
  const volStatus = (() => {
    const dataSource = l1Period === 'weekly' ? macro?.index_weekly : macro?.index_kline
    if (!dataSource?.length) return { text: '—', color: C.muted }
    const raw = dataSource.filter((r: any) => r.code === l1Index).sort((a: any, b: any) => String(a.d).localeCompare(String(b.d)))
    if (raw.length < 5) return { text: '—', color: C.muted }
    const recent2 = raw.slice(-2)
    const prev3 = raw.slice(-5, -2)
    const avgR2 = recent2.reduce((s: number, r: any) => s + Number(r.volume || 0), 0) / 2
    const avgP3 = prev3.reduce((s: number, r: any) => s + Number(r.volume || 0), 0) / 3
    if (avgR2 > avgP3 * 1.5) {
      const priceUp = Number(recent2[1]?.close || 0) > Number(recent2[0]?.close || 0)
      return priceUp ? { text: '放量上涨（主力进场）', color: C.green } : { text: '放量滞涨 ⚠️', color: C.red }
    }
    if (avgR2 < avgP3 * 0.5) return { text: '缩量（筹码锁定）', color: C.amber }
    return { text: '量能正常', color: C.muted }
  })()

  // ===================== Layer 2: 日线+资金流 =====================
  useEffect(() => {
    if (layer !== 'l2' || !macro?.index_kline?.length || !ecReady.current) return
    const el = document.getElementById('chart-l2')
    if (!el) return
    const ec = (window as any).echarts
    if (chartRefs.current.l2) chartRefs.current.l2.dispose()
    const dom = ec.init(el!, 'dark')
    chartRefs.current.l2 = dom

    // 上证日K — 取最近90日，用真实OHLC
    const sh = (macro.index_kline || []).filter((r: any) => r.code === 'sh000001').sort((a: any, b: any) => String(a.d).localeCompare(String(b.d))).slice(-90)
    const dates = sh.map((r: any) => String(r.d).slice(0, 10))
    // 蜡烛图数据: [open, close, low, high]
    const ohlc = sh.map((r: any) => [Number(r.open), Number(r.close), Number(r.low), Number(r.high)])
    const vols = sh.map((r: any) => Number(r.volume || 0) / 1e8)
    const closes = sh.map((r: any) => Number(r.close))

    // VWAP
    const vwap60 = calcVWAP(sh.slice(-60))

    // 资金流（近10日）
    const mf = (macro.fund_flow_all || []).slice(-10).reverse()
    const mfDates = mf.map((r: any) => String(r.date).slice(0, 10))
    const mainFlow = mf.map((r: any) => (Number(r.super || 0) + Number(r.large || 0)) / 1e8)

    dom.setOption({
      backgroundColor: C.bg,
      title: { text: '上证日线（近90日）— OHLC真实蜡烛 + 主力净额', textStyle: { color: '#ccc', fontSize: 14 }, left: 10, top: 5 },
      tooltip: { trigger: 'axis' },
      grid: [
        { top: 35, left: 60, right: 60, height: '55%' },
        { top: '68%', left: 60, right: 60, height: '12%' },
        { top: '83%', left: 60, right: 60, height: '12%' },
      ],
      xAxis: [
        { type: 'category', data: dates, axisLabel: { color: '#888', fontSize: 9 }, gridIndex: 0 },
        { type: 'category', data: dates, axisLabel: { show: false }, gridIndex: 1 },
        { type: 'category', data: mfDates, axisLabel: { color: '#888', fontSize: 9 }, gridIndex: 2 },
      ],
      yAxis: [
        { type: 'value', scale: true, axisLabel: { color: '#888', fontSize: 10 }, splitLine: { lineStyle: { color: '#1e293b' } }, gridIndex: 0 },
        { type: 'value', axisLabel: { color: '#888', fontSize: 9 }, splitLine: { lineStyle: { color: '#1e293b' } }, gridIndex: 1 },
        { type: 'value', axisLabel: { color: '#888', fontSize: 9 }, splitLine: { lineStyle: { color: '#1e293b' } }, gridIndex: 2 },
      ],
      series: [
        // 蜡烛图（上证 OHLC）
        { type: 'candlestick', name: '上证', xAxisIndex: 0, yAxisIndex: 0, data: ohlc,
          itemStyle: { color: C.red, color0: C.green, borderColor: C.red, borderColor0: C.green } },
        // VWAP 虚线
        vwap60 ? { type: 'line', name: 'VWAP(60日)', xAxisIndex: 0, yAxisIndex: 0,
          data: dates.map((d: string, i: number) => [d, vwap60]), symbol: 'none',
          lineStyle: { color: '#a78bfa', width: 1.5, type: 'dashed' } } : null,
        // 成交量柱
        { type: 'bar', name: '量(亿手)', xAxisIndex: 0, yAxisIndex: 1,
          data: dates.map((d: string, i: number) => [d, vols[i]]),
          itemStyle: { color: vols.map((v: number) => v > (vols.reduce((a: number, b: number) => a + b, 0) / vols.length) * 1.3 ? '#f59e0b44' : '#1e293b') } },
        // 主力净额柱（底部区域）
        { type: 'bar', name: '主力净额(亿)', xAxisIndex: 2, yAxisIndex: 2,
          data: mainFlow.map((v: number, i: number) => [mfDates[i], v]),
          itemStyle: { color: (p: any) => p.data?.[1] > 0 ? C.green : C.red } },
      ].filter(Boolean),
    })
    return () => dom.dispose()
  }, [layer, macro])

  // ===================== Layer 4: 板块散点图 =====================
  useEffect(() => {
    if (layer !== 'l4' || !sectors?.sectors?.length || !ecReady.current) return
    const el = document.getElementById('chart-l4')
    if (!el) return
    const ec = (window as any).echarts
    if (chartRefs.current.l4) chartRefs.current.l4.dispose()
    const dom = ec.init(el!, 'dark')
    chartRefs.current.l4 = dom

    const data = sectors.sectors.slice(0, 50).map((r: any) => ({
      value: [Number(r.main || 0) / 1e8, Number(r.chg5d || 0), Math.abs(Number(r.main || 0)) / 1e8],
      name: r.name,
    }))

    dom.setOption({
      backgroundColor: C.bg,
      title: { text: '板块散点图（X=主力净额/亿, Y=5日涨幅%, 气泡=净额大小）', textStyle: { color: '#ccc', fontSize: 13 }, left: 10, top: 5 },
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.data.name}<br/>主力净额: ${p.data.value[0].toFixed(1)}亿<br/>5日涨幅: ${p.data.value[1].toFixed(1)}%` },
      grid: { top: 40, left: 55, right: 20, bottom: 30 },
      xAxis: {
        type: 'value', name: '主力净额(亿)', axisLabel: { color: '#888', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLine: { lineStyle: { color: '#475569' } },
      },
      yAxis: {
        type: 'value', name: '5日涨幅%', axisLabel: { color: '#888', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLine: { lineStyle: { color: '#475569' } },
      },
      series: [{
        type: 'scatter', symbolSize: (d: number[]) => Math.max(5, Math.min(40, Math.sqrt(Math.abs(d[0])) * 3)),
        data,
        itemStyle: { color: (p: any) => {
          const [x, y] = p.data?.value || [0, 0]
          if (x > 0 && y > 0) return C.emerald   // Q1 主力加+涨
          if (x > 0 && y <= 0) return C.teal     // Q2 主力加+未涨→观察
          if (x <= 0 && y > 0) return C.red       // Q4 主力出+涨→警惕
          return C.muted                          // Q3 无人问津
        }},
        label: { show: true, formatter: (p: any) => p.data.name.length > 6 ? p.data.name.slice(0, 6) + '..' : p.data.name, fontSize: 9, color: '#aaa' },
      }],
    })
    return () => dom.dispose()
  }, [layer, sectors])

  // ===================== Layer 5: 个股K线图 =====================
  useEffect(() => {
    if (layer !== 'l5' || !stock?.valuation?.length || !ecReady.current) return
    const el = document.getElementById('chart-l5')
    if (!el) return
    const ec = (window as any).echarts
    if (chartRefs.current.l5) chartRefs.current.l5.dispose()
    const dom = ec.init(el!, 'dark')
    chartRefs.current.l5 = dom

    const val = stock.valuation.slice(-60)
    const dates = val.map((r: any) => String(r.trade_date).slice(0, 10))
    const closes = val.map((r: any) => Number(r.close))

    // 资金流叠加
    const mf = (stock.moneyflow || []).slice(-60)
    const mfByDate: Record<string, number> = {}
    mf.forEach((r: any) => { mfByDate[String(r.date).slice(0, 10)] = (Number(r.super_net || 0) + Number(r.large_net || 0)) / 1e8 })
    const mainData = dates.map(d => mfByDate[d] || null)

    // 融资余额
    const mg = (stock.margin || [])
    const mgByDate: Record<string, number> = {}
    mg.forEach((r: any) => { mgByDate[String(r.date).slice(0, 10)] = Number(r.rzye || 0) / 1e8 })
    const mgData = dates.map(d => mgByDate[d] || null)

    dom.setOption({
      backgroundColor: C.bg,
      title: { text: `${stockCode} 日线 + 主力资金`, textStyle: { color: '#ccc', fontSize: 14 }, left: 10, top: 5 },
      tooltip: { trigger: 'axis' },
      grid: [
        { top: 35, left: 55, right: 70, height: '50%' },
        { top: '63%', left: 55, right: 70, height: '15%' },
        { top: '81%', left: 55, right: 70, height: '12%' },
      ],
      xAxis: [
        { type: 'category', data: dates, axisLabel: { color: '#888', fontSize: 9 }, gridIndex: 0 },
        { type: 'category', data: dates, axisLabel: { show: false }, gridIndex: 1 },
        { type: 'category', data: dates, axisLabel: { color: '#888', fontSize: 9 }, gridIndex: 2 },
      ],
      yAxis: [
        { type: 'value', axisLabel: { color: '#888', fontSize: 10 }, splitLine: { lineStyle: { color: '#1e293b' } }, gridIndex: 0 },
        { type: 'value', axisLabel: { color: '#888', fontSize: 9 }, splitLine: { lineStyle: { color: '#1e293b' } }, gridIndex: 1 },
        { type: 'value', axisLabel: { color: '#888', fontSize: 9 }, splitLine: { lineStyle: { color: '#1e293b' } }, gridIndex: 2, name: '亿' },
      ],
      series: [
        { type: 'line', name: '收盘', data: closes.map((v, i) => [dates[i], v]), xAxisIndex: 0, yAxisIndex: 0,
          symbol: 'none', lineStyle: { color: '#f59e0b', width: 2 }, areaStyle: { color: 'rgba(245,158,11,0.08)' } },
        { type: 'bar', name: '主力净额(亿)', data: mainData.map((v, i) => v != null ? [dates[i], v] : null).filter(Boolean), xAxisIndex: 1, yAxisIndex: 1,
          itemStyle: { color: (p: any) => p.data?.[1] > 0 ? C.green : C.red } },
        { type: 'line', name: '融资余额(亿)', data: mgData.map((v, i) => v != null ? [dates[i], v] : null).filter(Boolean), xAxisIndex: 2, yAxisIndex: 2,
          symbol: 'none', lineStyle: { color: '#06b6d4', width: 1 } },
      ],
    })
    return () => dom.dispose()
  }, [layer, stock, stockCode])

  // ===================== 计算数据 =====================
  const phaseData = judgePhase(stock?.moneyflow || [], stock?.valuation || [])
  const supportData = judgeSupport(stock?.moneyflow || [], stock?.big_deals || [], stock?.valuation || [], stock?.margin || [])
  const vwap = calcVWAP(stock?.valuation?.slice(-60) || [])

  // 情绪判断
  const breadth = sentiment?.breadth
  const bRatio = breadth ? breadth.up / Math.max(1, breadth.down) : 1
  let sentimentLabel = '中性', sentimentColor = C.amber
  if (bRatio > 3) { sentimentLabel = '散户狂热 ⚠️'; sentimentColor = C.red }
  else if (bRatio < 0.5) { sentimentLabel = '散户恐慌 ✅'; sentimentColor = C.green }
  else if (bRatio > 1.8) { sentimentLabel = '偏热'; sentimentColor = C.rose }
  else if (bRatio < 0.8) { sentimentLabel = '偏冷'; sentimentColor = C.teal }

  // 大盘主力判断
  const mainOk = Number(macro?.latest_main?.main_net || 0) > 0
  const mainFlowAmt = Number(macro?.latest_main?.main_net || 0) / 1e8
  const mainLabel = mainOk ? '主力在场' : '主力离场'
  const mainColor = mainOk ? C.green : C.red

  // 主力净额 20日均值对比（L1 断点1修复）
  const mainFlow20dAvg = (() => {
    if (!macro?.fund_flow_all?.length) return null
    const f = macro.fund_flow_all.slice(0, Math.min(20, macro.fund_flow_all.length))
    if (f.length < 2) return null
    const sum = f.reduce((s: number, r: any) => s + (Number(r.super || 0) + Number(r.large || 0)), 0)
    return sum / f.length / 1e8
  })()
  const mainFlowRatio = mainFlow20dAvg && mainFlow20dAvg !== 0 ? mainFlowAmt / mainFlow20dAvg : null

  // ===================== Layer 0: 预警 =====================
  const alerts: { text: string; color: string }[] = []
  if (macro?.latest_main) {
    if (mainFlowAmt > 500) alerts.push({ text: '⚠️ 全市场主力单日净流入超500亿——主力大举进攻', color: C.green })
    else if (mainFlowAmt < -300) alerts.push({ text: '🚨 全市场主力单日净流出超300亿——主力撤退信号', color: C.red })
    else if (Math.abs(mainFlowAmt) < 50) alerts.push({ text: '🟡 主力净额微弱——方向不明，观望', color: C.amber })
  }
  if (breadth) {
    if (bRatio > 3) alerts.push({ text: '🔴 涨跌比>3——散户狂热，警惕主力出货', color: C.red })
    if (bRatio < 0.3) alerts.push({ text: '🟢 涨跌比<0.3——散户恐慌，主力可能吸筹', color: C.green })
    if (breadth.limit_down > 50) alerts.push({ text: `🚨 ${breadth.limit_down}家跌停——恐慌蔓延`, color: C.red })
  }

  // ===================== 选股器 =====================
  const [screenerModel, setScreenerModel] = useState('')
  const screenerModels = [
    { id: 'main_build', label: '主力建仓', desc: '股东人数连续下降 + 超大单持续流入' },
    { id: 'breakout', label: '拉升启动', desc: '超大单突放量 + 突破平台' },
    { id: 'wash_end', label: '洗盘结束', desc: '缩量回调至均线 + 流出放缓' },
    { id: 'panic_reverse', label: '恐慌反转', desc: '连续下跌 + 小单抛售 + 主力接筹' },
    { id: 'margin_sync', label: '杠杆共振', desc: '融资5日增>10% + 超大单同步' },
  ]

  // 仓位计算
  const calcPosition = () => {
    if (!macro?.latest_main) return { pct: 30, label: '轻仓', color: C.red, strategy: '数据不足→防守' }
    const wMainOk = mainOk
    const dMainOk = true // 简化
    const sHot = bRatio > 2

    if (wMainOk && dMainOk && !sHot) return { pct: 80, label: '重仓', color: C.green, strategy: '主力积极+情绪可控→进攻' }
    if (wMainOk && dMainOk && sHot) return { pct: 60, label: '半仓', color: C.amber, strategy: '主力积极但散户过热→回调低吸不追' }
    if (!wMainOk) return { pct: 20, label: '轻仓', color: C.red, strategy: '主力撤离→防守为主' }
    return { pct: 50, label: '半仓', color: C.amber, strategy: '信号不明确→等确认' }
  }
  const pos = calcPosition()

  // ===================== 渲染 =====================
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.bright, fontFamily: 'system-ui,sans-serif' }}>
      {/* 顶部栏 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 20px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: C.amber, marginRight: 16 }}>⚔️ 主力行为复盘</span>
        {macro?.latest_main && (
          <span style={{ fontSize: 12, color: C.muted }}>
            基准日 {macro.latest_main.date} | 全市场主力 {mainFlowAmt.toFixed(1)}亿 |
            <span style={{ color: mainColor, fontWeight: 600, marginLeft: 4 }}>{mainLabel}</span>
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: C.muted, display: 'flex', gap: 12 }}>
          <span style={{ color: C.green }}>🟢 主力买</span>
          <span style={{ color: C.red }}>🔴 散户接</span>
          <span style={{ color: C.amber }}>🟡 观望</span>
        </span>
      </div>

      {/* Tab 导航 */}
      <div style={{ display: 'flex', gap: 1, borderBottom: `1px solid ${C.border}`, overflowX: 'auto', whiteSpace: 'nowrap', padding: '0 16px' }}>
        {LAYERS.map(l => (
          <button key={l.id} onClick={() => setLayer(l.id)}
            style={{ padding: '10px 14px', fontSize: 13, border: 'none', background: layer === l.id ? C.card : 'transparent',
              color: layer === l.id ? C.amber : '#888', cursor: 'pointer', borderBottom: layer === l.id ? `2px solid ${C.amber}` : '2px solid transparent', whiteSpace: 'nowrap' }}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* ========= Layer 0: 预警 ========= */}
      {layer === 'l0' && (
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>⚡ 实时预警信号（基于最新数据）</div>
          {alerts.length === 0 ? (
            <div style={{ padding: 20, background: C.card, borderRadius: 8, color: C.muted, fontSize: 13 }}>暂无触发预警信号。市场运行正常。</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ padding: '12px 16px', background: C.card, borderRadius: 8, borderLeft: `3px solid ${a.color}`, fontSize: 14 }}>
                  {a.text}
                </div>
              ))}
            </div>
          )}
          <div style={{ color: '#666', fontSize: 11, marginTop: 16 }}>
            💡 实时预警需连接盘中数据源。当前基于收盘后 PG 数据快照。竞价/龙虎榜/盘中大单需额外数据接入。
          </div>
        </div>
      )}

      {/* ========= Layer 1: 大盘方向 ========= */}
      {layer === 'l1' && (
        <div style={{ padding: 20 }}>
          {/* 指数切换 + 周期切换 */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: C.muted, marginRight: 4 }}>指数：</span>
            {Object.entries(INDICES).filter(([k]) => ['sh000001','sz399001','sz399006'].includes(k)).map(([code, info]) => (
              <button key={code} onClick={() => setL1Index(code)}
                style={{ padding: '5px 12px', fontSize: 12, border: `1px solid ${l1Index === code ? info.color : C.border}`, borderRadius: 6,
                  background: l1Index === code ? info.color + '22' : 'transparent', color: l1Index === code ? info.color : '#888', cursor: 'pointer' }}>
                {info.name}
              </button>
            ))}
            <span style={{ width: 12 }} />
            <span style={{ fontSize: 12, color: C.muted, marginRight: 4 }}>周期：</span>
            {[{ v: 'weekly', label: '周线' }, { v: 'daily', label: '日线' }].map(p => (
              <button key={p.v} onClick={() => setL1Period(p.v)}
                style={{ padding: '5px 12px', fontSize: 12, border: `1px solid ${l1Period === p.v ? C.amber : C.border}`, borderRadius: 6,
                  background: l1Period === p.v ? '#f59e0b22' : 'transparent', color: l1Period === p.v ? C.amber : '#888', cursor: 'pointer' }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* 核心结论 —— 一眼看清 */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 280, padding: '20px 24px', background: C.card, borderRadius: 10, borderLeft: `4px solid ${mainColor}` }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>主力状态（全市场）</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: mainColor }}>{mainLabel}</div>
              <div style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>
                全市场主力单日净额：<span style={{ fontWeight: 700, color: mainColor }}>{mainFlowAmt.toFixed(1)}亿</span>
                {mainFlowRatio && (
                  <span style={{ fontSize: 12, marginLeft: 8, color: mainFlowRatio > 2 ? C.green : mainFlowRatio > 1 ? C.amber : C.muted }}>
                    (20日均 {mainFlow20dAvg?.toFixed(0)}亿 的 {mainFlowRatio.toFixed(1)}x)
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                {mainOk
                  ? (mainFlowRatio && mainFlowRatio > 2
                    ? `主力净额是平时的${mainFlowRatio.toFixed(0)}倍——大资金在动手，不是普通交易日`
                    : '主力持续买入——市场有资金托底，回调即低吸机会')
                  : '主力撤退——控制仓位，等待主力回流信号'}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 280, padding: '20px 24px', background: C.card, borderRadius: 10, borderLeft: `4px solid ${maArrangement.color}` }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>均线排列（{INDICES[l1Index]?.name}）</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: maArrangement.color }}>{maArrangement.text}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                MA5/MA10/MA20 · {l1Period === 'weekly' ? '周线' : '日线'}收盘价
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 280, padding: '20px 24px', background: C.card, borderRadius: 10, borderLeft: `4px solid ${volStatus.color}` }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{l1Period === 'weekly' ? '周' : '日'}线量能（{INDICES[l1Index]?.name}）</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: volStatus.color }}>{volStatus.text}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                近2{l1Period === 'weekly' ? '周' : '日'} vs 前3{l1Period === 'weekly' ? '周' : '日'}对比
              </div>
            </div>
          </div>

          <div id="chart-l1" style={{ width: '100%', height: 420, marginBottom: 0 }} />

          {/* 一句话总结 */}
          <div style={{ padding: '14px 20px', background: mainOk ? '#22c55e15' : '#ef444415', borderRadius: 8, border: `1px solid ${mainOk ? '#22c55e44' : '#ef444444'}`, marginTop: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: mainOk ? C.green : C.red }}>
              {mainOk ? '✅ 战略看多' : '🚨 战略看空'}
            </span>
            <span style={{ fontSize: 13, color: '#aaa', marginLeft: 12 }}>
              {mainOk
                ? `${l1Period === 'weekly' ? '周' : '日'}线${maArrangement.text === '多头排列 ↗' ? '均线多头排列+主力净流入' : '主力在场但均线未形成多头'}——${maArrangement.text === '多头排列 ↗' ? '可积极操作' : '等均线确认后加仓'}`
                : `主力离场+${l1Period === 'weekly' ? '周' : '日'}线${maArrangement.text}——严格防守，等待主力回流`}
            </span>
          </div>
        </div>
      )}

      {/* ========= Layer 2: 日线+资金流 ========= */}
      {layer === 'l2' && (
        <div style={{ padding: 20 }}>
          {/* 竞价占位 */}
          <div style={{ background: C.card, borderRadius: 8, padding: '10px 14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, color: C.amber, marginBottom: 4 }}>⏰ 竞价分析（P0 - 需接入竞价数据源）</div>
            <div style={{ fontSize: 12, color: C.muted }}>
              竞价09:15-09:25数据需从交易所/数据商接入。当前暂无竞价数据。<br/>
              接入后可展示：可撤单期诱多识别 / 不可撤单期真实买盘判断 / 竞价量分析。
            </div>
          </div>
          <div id="chart-l2" style={{ width: '100%', height: 500, marginBottom: 12 }} />
          {/* 资金面博弈总结 */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            {macro?.fund_flow_all?.length > 0 && (() => {
              const mf = macro.fund_flow_all
              const m5 = mf.slice(-5)
              const main5 = m5.reduce((s: number, r: any) => s + (Number(r.super || 0) + Number(r.large || 0)), 0)
              const small5 = m5.reduce((s: number, r: any) => s + Number(r.small || 0), 0)
              const winner = Math.abs(main5) > Math.abs(small5) ? '主力主导' : '散户主导'
              return <InfoCard label="近5日博弈结果" value={winner} valueColor={Math.abs(main5) > Math.abs(small5) ? C.green : C.red} />
            })()}
            <InfoCard label="VWAP(60日)" value={vwap?.toFixed(2) || '-'} valueColor={C.muted} />
            <InfoCard label="北向(5日)" value="接入中" valueColor={C.muted} />
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
            ⚠️ 图1: 上证日K蜡烛+主力净额柱(绿=主力买/红=主力卖)+小单折线(反向指标)。图2: 全市场资金流近10日。VWAP=60日量价加权均价。
          </div>
        </div>
      )}

      {/* ========= Layer 3: 情绪温度计 ========= */}
      {layer === 'l3' && (
        <div style={{ padding: 20 }}>
          {breadth ? (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <InfoCard label="涨跌家数" value={`${breadth.up}↑ / ${breadth.down}↓`} valueColor={breadth.up > breadth.down ? C.green : C.red} />
                <InfoCard label="涨跌比" value={bRatio.toFixed(2)} valueColor={bRatio > 2 ? C.red : bRatio < 0.5 ? C.green : C.amber} />
                <InfoCard label="涨停" value={breadth.limit_up} valueColor={C.red} />
                <InfoCard label="跌停" value={breadth.limit_down} valueColor={C.green} />
                <InfoCard label="平均涨跌" value={fmtPct(breadth.avg_chg)} valueColor={Number(breadth.avg_chg) > 0 ? C.green : C.red} />
                <InfoCard label="全市场量" value={fmtMoney(breadth.total_vol)} valueColor={C.muted} />
              </div>
              {/* 情绪周期 */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ padding: '14px 20px', background: C.card, borderRadius: 10, minWidth: 240 }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>🧠 散户情绪判断</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: sentimentColor }}>{sentimentLabel}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>
                    {bRatio > 3 ? '散户极度狂热→警惕主力出货' :
                     bRatio < 0.3 ? '散户极度恐慌→主力吸筹窗口' :
                     bRatio > 1.5 ? '偏热→追高需谨慎' :
                     bRatio < 0.7 ? '偏冷→可低吸' : '中性→按技术位操作'}
                  </div>
                </div>
                {/* 情绪周期位置 */}
                <div style={{ padding: '14px 20px', background: C.card, borderRadius: 10, minWidth: 240 }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>📊 情绪周期定位</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.amber }}>
                    {bRatio > 3 ? '高潮期（散户追）→退潮前' :
                     bRatio < 0.3 ? '冰点期（散户割）→修复前' :
                     bRatio > 1 ? '修复→高潮过渡' : '退潮→冰点过渡'}
                  </div>
                </div>
              </div>
              {/* 北向 + 融资 */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {sentiment?.margin?.length > 0 && (() => {
                  const m = sentiment.margin
                  const latest = Number(m[0]?.total_margin || 0) / 1e8
                  return <InfoCard label="全市场融资(亿)" value={latest.toFixed(0)} valueColor={C.muted} />
                })()}
                {topListRecent && (
                  <InfoCard label="龙虎榜机构占比" value={`${topListRecent.inst_ratio}% (${topListRecent.inst_count}/${topListRecent.total})`}
                    valueColor={topListRecent.inst_ratio > 50 ? C.teal : topListRecent.inst_ratio > 30 ? C.amber : C.rose} />
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>情绪数据加载中...</div>
          )}
          <div style={{ fontSize: 11, color: '#666', marginTop: 16 }}>
            ⚠️ 连板高度/炸板率需实时数据源接入。财经媒体热度预留给未来爬虫接入。
          </div>
        </div>
      )}

      {/* ========= Layer 4: 板块轮动 ========= */}
      {layer === 'l4' && (
        <div style={{ padding: 20 }}>
          {sectors?.sectors?.length > 0 ? (
            <>
              <div id="chart-l4" style={{ width: '100%', height: 400, marginBottom: 16 }} />
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>📊 板块主力强度排行榜（前30）</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: '#888', borderBottom: `1px solid ${C.border}` }}>
                      <th style={th}>#</th><th style={th}>板块</th><th style={th}>主力净额</th>
                      <th style={th}>超大单</th><th style={th}>大单</th><th style={th}>5日涨跌</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectors.sectors.slice(0, 30).map((r: any) => (
                      <tr key={r.rank} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={td}>{r.rank}</td>
                        <td style={{ ...td, fontWeight: 600, color: r.bk ? '#60a5fa' : '#888' }}>{r.name}</td>
                        <td style={{ ...td, color: c(r.main) }}>{fmtMoney(r.main)}</td>
                        <td style={{ ...td, color: c(r.super) }}>{fmtMoney(r.super)}</td>
                        <td style={{ ...td, color: c(r.large) }}>{fmtMoney(r.large)}</td>
                        <td style={{ ...td, color: Number(r.chg5d) > 0 ? C.green : C.red }}>{r.chg5d != null ? fmtPct(r.chg5d) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* 主线板块分析 */}
              <div style={{ marginTop: 16, padding: '12px 16px', background: C.card, borderRadius: 8 }}>
                <div style={{ fontSize: 13, color: C.amber, marginBottom: 6 }}>🔥 当前主线板块 TOP3</div>
                {sectors.sectors.slice(0, 3).map((r: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>
                    #{r.rank} {r.name} — 主力净额{fmtMoney(r.main)}
                    {Number(r.chg5d) > 0 ? ' ↗' : ' ↘'}
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                  🏥 板块健康度需成分股资金流对比（板块内上涨家数占比+超大单同步流入票数占比）
                </div>
              </div>
              {/* Q2板块——主力加码但未涨，即将启动 */}
              {sectors.sectors.filter((r: any) => Number(r.main) > 1e8 && (Number(r.chg5d) || 0) <= 1).length > 0 && (
                <div style={{ marginTop: 12, padding: '12px 16px', background: C.teal + '15', borderRadius: 8, border: `1px solid ${C.teal}44` }}>
                  <div style={{ fontSize: 13, color: C.teal, marginBottom: 6 }}>👀 即将启动（主力加码 + 涨幅未启动）</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {sectors.sectors.filter((r: any) => Number(r.main) > 1e8 && (Number(r.chg5d) || 0) <= 1).slice(0, 6).map((r: any, i: number) => (
                      <span key={i} style={{ fontSize: 12, padding: '3px 10px', background: C.card, borderRadius: 4, color: '#aaa' }}>
                        {r.name} <span style={{ color: C.green }}>{fmtMoney(r.main)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>板块数据加载中...</div>
          )}
        </div>
      )}

      {/* ========= Layer 5: 个股诊断 ========= */}
      {layer === 'l5' && (
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input value={stockCode} onChange={e => setStockCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchStock(stockCode.trim())}
              placeholder="股票代码 如 600519"
              style={{ padding: '8px 12px', fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 6, background: C.card, color: C.bright, width: 180 }} />
            <button onClick={() => searchStock(stockCode.trim())}
              style={{ padding: '8px 16px', fontSize: 14, border: `1px solid #475569`, borderRadius: 6, background: '#334155', color: C.bright, cursor: 'pointer' }}>
              {loading ? '分析中…' : '诊断'}
            </button>
          </div>

          {stock ? (
            <div>
              {/* 一句话诊断（L5 断点4修复） */}
              <div style={{ padding: '14px 20px', marginBottom: 14, borderRadius: 10,
                background: phaseData.level >= 2 ? '#22c55e10' : phaseData.level <= -1 ? '#ef444410' : '#1e293b',
                border: `1px solid ${phaseData.level >= 2 ? '#22c55e44' : phaseData.level <= -1 ? '#ef444444' : C.border}` }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: phaseData.color }}>
                  {phaseData.level >= 2 ? '🟢 可操作' : phaseData.level <= -1 ? '🔴 回避' : '🟡 观望'}
                </span>
                <span style={{ fontSize: 14, color: '#ccc', marginLeft: 10 }}>
                  {stockCode} · {phaseData.phase} · PE {stock.pe?.toFixed(1)} (分位{stock.pe_rank?.toFixed(0)}%)
                  · 承接力{'⭐'.repeat(supportData.stars)}
                </span>
                <span style={{ fontSize: 13, color: '#aaa', marginLeft: 10 }}>{phaseData.advice}</span>
              </div>
              {/* 主力阶段卡片 */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ background: C.card, borderRadius: 8, padding: '14px 18px', minWidth: 200 }}>
                  <div style={{ fontSize: 12, color: C.muted }}>🏷️ 主力阶段</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: phaseData.color }}>{phaseData.phase}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{phaseData.advice}</div>
                </div>
                {/* 承接力 */}
                <div style={{ background: C.card, borderRadius: 8, padding: '14px 18px', minWidth: 200 }}>
                  <div style={{ fontSize: 12, color: C.muted }}>💪 承接力</div>
                  <div style={{ fontSize: 22, color: '#fbbf24' }}>{'⭐'.repeat(supportData.stars)}{'☆'.repeat(5 - supportData.stars)}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa' }}>{supportData.label} — {supportData.desc}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    {supportData.reasons.length > 0 ? supportData.reasons.join(' · ') : '数据不足'}
                  </div>
                </div>
                {/* 近5日主力 */}
                {(() => {
                  const mf = stock.moneyflow || []
                  const r5 = mf.slice(-5)
                  const sm = r5.reduce((s: number, r: any) => s + (Number(r.super_net || 0) + Number(r.large_net || 0)), 0)
                  return (
                    <div style={{ background: C.card, borderRadius: 8, padding: '14px 18px', minWidth: 180 }}>
                      <div style={{ fontSize: 12, color: C.muted }}>近5日超大+大单</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c(sm) }}>{fmtMoney(sm)}</div>
                      <div style={{ fontSize: 11, color: sm > 0 ? C.green : C.red, marginTop: 2 }}>{sm > 0 ? '主力净买入' : '主力净卖出'}</div>
                    </div>
                  )
                })()}
                {/* PE分位 */}
                <div style={{ background: C.card, borderRadius: 8, padding: '14px 18px', minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: C.muted }}>PE(TTM)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: stock.pe_rank > 80 ? C.red : stock.pe_rank < 30 ? C.green : C.amber }}>
                    {stock.pe?.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    历史分位 {stock.pe_rank?.toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* K线图 */}
              <div id="chart-l5" style={{ width: '100%', height: 400, marginBottom: 16 }} />

              {/* 关键价位 */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <InfoCard label="主力成本 VWAP(60日)" value={vwap?.toFixed(2) || '-'} valueColor={C.teal} />
                {stock.moneyflow?.length > 0 && (() => {
                  const lastClose = stock.valuation?.length ? Number(stock.valuation[stock.valuation.length - 1].close) : null
                  return lastClose ? <InfoCard label="最新收盘" value={lastClose.toFixed(2)} valueColor={lastClose > (vwap || 0) ? C.green : C.red} /> : null
                })()}
              </div>

              {/* 四档资金流表格 */}
              {stock.moneyflow?.length > 0 && (
                <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>📋 四档资金流（最近20日）</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ color: '#888', borderBottom: `1px solid ${C.border}` }}>
                        <th style={th}>日期</th><th style={th}>超大单</th><th style={th}>大单</th><th style={th}>中单</th><th style={th}>小单</th><th style={th}>净额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.moneyflow.slice(-20).reverse().map((r: any, i: number) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={td}>{String(r.date).slice(0, 10)}</td>
                          <td style={{ ...td, color: c(r.super_net) }}>{fmtMoney(r.super_net)}</td>
                          <td style={{ ...td, color: c(r.large_net) }}>{fmtMoney(r.large_net)}</td>
                          <td style={{ ...td, color: c(r.mid_net) }}>{fmtMoney(r.mid_net)}</td>
                          <td style={{ ...td, color: Number(r.small_net) > 0 ? C.rose : C.teal }}>{fmtMoney(r.small_net)}</td>
                          <td style={{ ...td, color: c(r.netamount), fontWeight: 600 }}>{fmtMoney(r.netamount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 大单明细 + 大宗 + 融资 */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, fontSize: 12 }}>
                {stock.big_deals?.length > 0 && (
                  <div style={{ color: C.muted }}>
                    📋 大单明细 {stock.big_deals.length} 笔 |
                    买盘 {stock.big_deals.filter((d: any) => d.deal_type?.includes('买')).length} vs
                    卖盘 {stock.big_deals.filter((d: any) => d.deal_type?.includes('卖')).length}
                  </div>
                )}
                {stock.blocktrade?.length > 0 && (
                  <div style={{ color: C.amber }}>
                    🤝 大宗近{stock.blocktrade.length}笔 |
                    溢价 {stock.blocktrade.filter((d: any) => Number(d.premium_pct) > 0).length} 笔 |
                    折价 {stock.blocktrade.filter((d: any) => Number(d.premium_pct) < 0).length} 笔
                  </div>
                )}
              </div>

              {/* 股东人数 */}
              {stock.holders?.length > 1 && (
                <div style={{ padding: '10px 14px', background: C.card, borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                  <span style={{ color: C.muted }}>👥 股东人数: </span>
                  {stock.holders.map((h: any, i: number) => {
                    const prev = i > 0 ? stock.holders[i - 1].total_num : h.total_num
                    const change = h.total_num - prev
                    return (
                      <span key={i} style={{ marginRight: 12 }}>
                        {String(h.report_date).slice(0, 7)}: {h.total_num.toLocaleString()}
                        {i > 0 && <span style={{ color: change < 0 ? C.green : C.red, marginLeft: 4 }}>{change < 0 ? '↓' : '↑'}</span>}
                      </span>
                    )
                  })}
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    {(() => {
                      const first = stock.holders[0]?.total_num || 0
                      const last = stock.holders[stock.holders.length - 1]?.total_num || 1
                      return last < first ? '→ 筹码集中 ✅' : '→ 筹码分散 ⚠️'
                    })()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
              {loading ? '分析中...' : '输入股票代码开始诊断'}
            </div>
          )}

          {/* 龙虎榜整合 */}
          {stockTopList?.summary?.length > 0 && (
            <div style={{ marginBottom: 16, padding: '14px 18px', background: C.card, borderRadius: 10, border: `1px solid ${C.amber}44` }}>
              <div style={{ fontSize: 14, color: C.amber, marginBottom: 10 }}>🐉 龙虎榜（近60日）</div>
              {stockTopList.summary.slice(-5).reverse().map((r: any, i: number) => (
                <div key={i} style={{ fontSize: 12, color: '#aaa', marginBottom: 6, padding: '6px 8px', background: '#0f172a', borderRadius: 4 }}>
                  <span style={{ color: '#888' }}>{String(r.trade_date).slice(0, 10)}</span>
                  {' '}涨跌: <span style={{ color: Number(r.change_rate) > 0 ? C.green : C.red, fontWeight: 600 }}>{fmtPct(r.change_rate)}</span>
                  {' '}买入: <span style={{ color: C.green }}>{fmtMoney(r.billboard_buy)}</span>
                  {' '}卖出: <span style={{ color: C.red }}>{fmtMoney(r.billboard_sell)}</span>
                  {' '}净额: <span style={{ color: Number(r.billboard_net) > 0 ? C.green : C.red, fontWeight: 600 }}>{fmtMoney(r.billboard_net)}</span>
                  {r.explain_text && (
                    <span style={{ color: (r.explain_text || '').includes('机构') ? C.teal : C.rose, marginLeft: 8, fontWeight: 600 }}>
                      {r.explain_text}
                    </span>
                  )}
                  <div style={{ color: '#666', fontSize: 11 }}>{r.explanation}</div>
                </div>
              ))}
              {/* 席位明细 */}
              {stockTopList.seats?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>席位明细（近60日）</div>
                  {stockTopList.seats.slice(-10).reverse().map((s: any, i: number) => (
                    <div key={i} style={{ fontSize: 11, color: '#666', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>{s.seat_name?.slice(0, 20)}</span>
                      <span>
                        买 <span style={{ color: C.green }}>{fmtMoney(s.buy_amt)}</span>
                        {' '}卖 <span style={{ color: C.red }}>{fmtMoney(s.sell_amt)}</span>
                        {' '}成功率 <span style={{ color: s.rise_prob_3d > 50 ? C.green : C.muted }}>{s.rise_prob_3d?.toFixed(0)}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 选股器 */}
          <div style={{ marginTop: 24, padding: 16, background: C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, color: C.amber, marginBottom: 10 }}>🔍 跟庄选股器</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {screenerModels.map(m => (
                <button key={m.id} onClick={() => setScreenerModel(screenerModel === m.id ? '' : m.id)}
                  style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${screenerModel === m.id ? C.amber : C.border}`,
                    background: screenerModel === m.id ? '#334155' : 'transparent',
                    color: screenerModel === m.id ? C.amber : '#aaa' }}>
                  {m.label}
                </button>
              ))}
            </div>
            {screenerModel && (
              <div style={{ fontSize: 12, color: C.muted }}>
                ⚠️ 选股器需要全市场扫描（5000+股票 × 资金流+股东数据），当前为前端逻辑框架。<br/>
                后端扫描接口 `/api/replay/screen?model={screenerModel}` 待开发。当前可手动逐个诊断。
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========= Layer 6: 交易计划 ========= */}
      {layer === 'l6' && (
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>📋 明日作战计划</div>

          {/* 仓位 */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ background: C.card, borderRadius: 8, padding: '14px 18px', minWidth: 200 }}>
              <div style={{ fontSize: 12, color: C.muted }}>💰 仓位建议</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: pos.color }}>{pos.pct}% — {pos.label}</div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{pos.strategy}</div>
            </div>
            <div style={{ background: C.card, borderRadius: 8, padding: '14px 18px', minWidth: 240 }}>
              <div style={{ fontSize: 12, color: C.muted }}>🎯 策略方向</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: pos.color, marginTop: 4 }}>
                {mainOk ? (bRatio > 2 ? '主力在场但散户过热 → 回调低吸不追高' : '主力积极做多 → 进攻') : '主力撤离 → 严格防守'}
              </div>
            </div>
            {/* 情绪策略 */}
            <div style={{ background: C.card, borderRadius: 8, padding: '14px 18px', minWidth: 200 }}>
              <div style={{ fontSize: 12, color: C.muted }}>🧠 情绪策略</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: sentimentColor, marginTop: 4 }}>
                {bRatio > 3 ? '散户狂热 → 谨慎追高' : bRatio < 0.3 ? '散户恐慌 → 积极低吸' : '情绪中性 → 按技术位操作'}
              </div>
            </div>
          </div>

          {/* 板块优先级 */}
          <div style={{ padding: '12px 16px', background: C.card, borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: C.amber, marginBottom: 6 }}>🔥 板块优先级</div>
            {sectors?.sectors?.slice(0, 3).map((r: any, i: number) => (
              <div key={i} style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>
                {i + 1}. {r.name} — 主力{fmtMoney(r.main)}，5日涨幅{fmtPct(r.chg5d)}
              </div>
            ))}
            {/* Q2 观察池 */}
            {sectors?.sectors && (() => {
              const q2 = sectors.sectors.filter((r: any) => Number(r.main) > 1e8 && (Number(r.chg5d) || 0) <= 1).slice(0, 3)
              return q2.length > 0 ? (
                <div style={{ fontSize: 12, color: C.teal, marginTop: 6 }}>
                  👀 观察池（主力加+未涨）：{q2.map((r: any) => r.name).join(' · ')}
                </div>
              ) : null
            })()}
            {!sectors?.sectors?.length && <div style={{ color: C.muted, fontSize: 12 }}>板块数据加载中...</div>}
          </div>

          {/* 操作清单（L6 断点5修复） */}
          <div style={{ padding: '12px 16px', background: C.card, borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: C.amber, marginBottom: 8 }}>📋 明日操作清单</div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#888', borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ ...th, width: '20%' }}>动作</th>
                  <th style={{ ...th, width: '30%' }}>标的/板块</th>
                  <th style={{ ...th, width: '25%' }}>条件</th>
                  <th style={{ ...th, width: '25%' }}>仓位</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ ...td, color: C.green, fontWeight: 600 }}>低吸</td>
                  <td style={td}>{sectors?.sectors?.[0]?.name || '—'} 板块龙头</td>
                  <td style={{ ...td, color: '#aaa' }}>回踩VWAP不破</td>
                  <td style={{ ...td, color: pos.color }}>{pos.pct > 50 ? '30%' : '20%'}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ ...td, color: C.amber, fontWeight: 600 }}>观察</td>
                  <td style={td}>{sectors?.sectors?.filter((r: any) => Number(r.main) > 1e8 && (Number(r.chg5d) || 0) <= 1)[0]?.name || '—'}</td>
                  <td style={{ ...td, color: '#aaa' }}>放量突破前高</td>
                  <td style={{ ...td, color: C.muted }}>试仓 10%</td>
                </tr>
                <tr>
                  <td style={{ ...td, color: C.red, fontWeight: 600 }}>止损</td>
                  <td style={td}>所有持仓</td>
                  <td style={{ ...td, color: '#aaa' }}>跌破成本 -3%</td>
                  <td style={{ ...td, color: C.red }}>无条件离场</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 风险预警 */}
          <div style={{ padding: '12px 16px', background: C.card, borderRadius: 8, border: `1px solid ${C.red}44` }}>
            <div style={{ fontSize: 13, color: C.red, marginBottom: 6 }}>🚨 风险预警</div>
            <div style={{ fontSize: 12, color: '#aaa' }}>
              {mainOk ? '✅ 主力在场' : '⚠️ 主力离场'}
              {' · '}
              {bRatio > 3 ? '⚠️ 散户过热' : bRatio < 0.3 ? '✅ 散户恐慌=机会' : '🟡 情绪中性'}
              {' · '}
              止损纪律：单票-3%无条件离场 · 总回撤-5%减半仓
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===================== 小组件 =====================
function InfoCard({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div style={{ background: C.card, borderRadius: 8, padding: '12px 16px', minWidth: 140 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: valueColor }}>{value}</div>
    </div>
  )
}
function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: color + '22', color, border: `1px solid ${color}44`, marginLeft: 6 }}>
      {text}
    </span>
  )
}
const th: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '7px 12px', textAlign: 'left' }
