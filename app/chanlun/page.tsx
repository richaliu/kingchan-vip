'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// 缠论知识图谱页：图谱可视化 + 原文追溯 + 对话
export default function ChanlunPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const [libReady, setLibReady] = useState(false)
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null)
  const [totalInfo, setTotalInfo] = useState('')
  const [selNode, setSelNode] = useState<string>('')
  const [entityData, setEntityData] = useState<any>(null)
  const [entityLoading, setEntityLoading] = useState(false)
  const [q, setQ] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatAnswer, setChatAnswer] = useState('')
  const [chatError, setChatError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // 加载 ECharts（CDN，min 版）
  useEffect(() => {
    const w = window as any
    if (w.echarts) { setLibReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js'
    s.onload = () => { (window as any).echarts ? setLibReady(true) : setErr('ECharts 加载失败') }
    s.onerror = () => setErr('ECharts 加载失败')
    document.head.appendChild(s)
  }, [])

  // 拉图谱数据
  useEffect(() => {
    fetch('/api/chanlun?path=graph&limit=120')
      .then(r => r.json())
      .then(d => {
        setGraph(d)
        setTotalInfo(`图谱共 ${d.total_nodes} 节点 / ${d.total_edges} 边，当前显示核心 ${d.nodes.length} 节点`)
        setLoading(false)
      })
      .catch(() => { setLoading(false); setErr('图谱数据加载失败') })
  }, [])

  // 渲染图谱
  useEffect(() => {
    if (!libReady || !graph || !chartRef.current) return
    const w = window as any
    const chart = w.echarts.init(chartRef.current)
    const nodes = graph.nodes.map(n => ({
      id: n.id,
      name: n.name,
      symbolSize: Math.min(8 + Math.sqrt(n.degree) * 2, 40),
      category: n.type || 'concept',
      value: n.degree,
    }))
    const cats = [...new Set(nodes.map(n => n.category))].map(c => ({ name: c }))
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { formatter: (p: any) => `${p.data.name}<br/>度数: ${p.data.value || ''}` },
      legend: { show: false },
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        data: nodes,
        links: graph.edges.map(e => ({ source: e.source, target: e.target })),
        categories: cats,
        force: { repulsion: 220, edgeLength: 90, gravity: 0.05 },
        label: { show: true, position: 'right', fontSize: 11, color: '#cbd5e1', formatter: (p: any) => (p.data.name || '').slice(0, 10) },
        lineStyle: { color: '#475569', width: 0.8, opacity: 0.6 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 2, color: '#f59e0b' } },
      }],
    })
    chart.on('click', (p: any) => { if (p.data?.name) setSelNode(p.data.name) })
    return () => { chart.dispose() }
  }, [libReady, graph])

  // 查实体（点击节点触发）
  useEffect(() => {
    if (!selNode) { setEntityData(null); return }
    setEntityLoading(true)
    setEntityData(null)
    fetch(`/api/chanlun?path=entity&name=${encodeURIComponent(selNode)}`)
      .then(r => r.json())
      .then(d => setEntityData(d))
      .catch(() => setEntityData({ error: '查询失败' }))
      .finally(() => setEntityLoading(false))
  }, [selNode])

  // 查关系证据链
  const [relData, setRelData] = useState<any>(null)
  const [relLoading, setRelLoading] = useState(false)
  const queryRelation = (other: string) => {
    if (!selNode) return
    setRelLoading(true)
    setRelData(null)
    fetch(`/api/chanlun?path=relation&source=${encodeURIComponent(selNode)}&target=${encodeURIComponent(other)}`)
      .then(r => r.json())
      .then(d => setRelData(d))
      .catch(() => setRelData({ error: '关系查询失败' }))
      .finally(() => setRelLoading(false))
  }

  const searchNode = () => {
    if (searchTerm.trim()) setSelNode(searchTerm.trim())
  }

  const ask = async () => {
    const question = q.trim()
    if (!question || chatLoading) return
    setChatLoading(true)
    setChatAnswer('')
    setChatError('')
    try {
      const r = await fetch('/api/chanlun?path=chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const d = await r.json()
      if (d.answer) setChatAnswer(d.answer)
      else setChatError(d.error || '无回答')
    } catch {
      setChatError('对话服务超时或不可达')
    } finally {
      setChatLoading(false)
    }
  }

  function setErr(msg: string) { setChatError(msg) }

  return (
    <main className="min-h-screen bg-[#0a0f1a] text-slate-200">
      <header className="border-b border-slate-800 bg-[#0d1424] px-6 py-4">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-400">缠中说禅 · 知识图谱</h1>
            <p className="text-xs text-slate-400 mt-1">{totalInfo || '加载中…'}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchNode()}
              placeholder="搜索关键词（如：中枢、背驰）"
              className="rounded-md bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-amber-500"
            />
            <button onClick={searchNode} className="rounded-md bg-amber-500/90 hover:bg-amber-400 text-black px-3 py-1.5 text-sm font-medium">
              搜索
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 图谱 */}
        <section className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0d1424] overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-800 text-sm text-slate-400 flex justify-between">
            <span>概念关系图（点击节点查看原文）</span>
            <span className="text-slate-500">拖拽漫游 · 滚轮缩放</span>
          </div>
          <div ref={chartRef} className="h-[560px] w-full" />
          {loading && <div className="h-[560px] flex items-center justify-center text-slate-500">图谱加载中…</div>}
        </section>

        {/* 右侧：原文追溯 + 对话 */}
        <section className="flex flex-col gap-4">
          {/* 原文追溯 */}
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-800 text-sm text-slate-400">
              {selNode ? <>原文追溯：<span className="text-amber-400">{selNode}</span></> : '原文追溯（点击图谱节点或搜索关键词）'}
            </div>
            <div className="max-h-[300px] overflow-y-auto p-4 space-y-3">
              {entityLoading && <p className="text-slate-500 text-sm">加载中…</p>}
              {entityData?.error && <p className="text-red-400 text-sm">{entityData.error}</p>}
              {entityData?.found === false && <p className="text-slate-500 text-sm">未找到「{entityData.query}」，试试 中枢/背驰/买卖点/走势终完美</p>}

              {/* 实体概要 */}
              {entityData?.found && (
                <>
                  <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 p-3">
                    <p className="text-sm text-slate-300">
                      <span className="text-amber-400 font-semibold">{entityData.name}</span>
                      <span className="text-slate-500"> · 关联 {entityData.degree} 个概念 · 共提及 {entityData.total_relation_mentions} 次</span>
                    </p>
                  </div>

                  {/* 关系列表（按出现次数排序） */}
                  <div className="space-y-1.5">
                    {entityData.relations?.slice(0, 15).map((r: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => queryRelation(r.other)}
                        className="w-full text-left rounded-lg bg-slate-800/60 border border-slate-700/50 px-3 py-2 hover:border-amber-500/60 hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-200">
                            {r.direction === 'out' ? '→' : '←'} {r.other}
                          </span>
                          <span className="text-xs text-amber-400 font-mono">{r.weight}次</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* 关系证据链 */}
                  {relLoading && <p className="text-slate-500 text-sm animate-pulse">查关系证据…</p>}
                  {relData?.found && (
                    <div className="rounded-lg bg-slate-900/60 border border-amber-500/30 p-3 space-y-2">
                      <p className="text-xs text-amber-400">
                        {relData.source} —{relData.weight}次→ {relData.target}
                        {relData.keywords && <span className="text-slate-500"> · {relData.keywords.split(',')[0]}</span>}
                      </p>
                      {relData.chunks?.map((c: any, j: number) => (
                        <div key={j} className="border-l-2 border-slate-700 pl-2">
                          <p className="text-xs text-slate-400 leading-relaxed">{c.text}</p>
                          <p className="text-[10px] text-slate-600 mt-1">📄 {c.file}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {relData?.found === false && <p className="text-slate-500 text-sm">{relData.note || '无直接关系'}</p>}
                </>
              )}
            </div>
          </div>

          {/* 对话 */}
          <div className="rounded-xl border border-slate-800 bg-[#0d1424] overflow-hidden flex-1 flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 text-sm text-slate-400">向缠师提问（服务器 Hermes 回答）</div>
            <div className="flex-1 p-4 space-y-3 min-h-[140px]">
              {chatAnswer && (
                <div className="rounded-lg bg-slate-800/60 border border-slate-700/50 p-3 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {chatAnswer}
                </div>
              )}
              {chatError && <p className="text-red-400 text-sm">{chatError}</p>}
              {chatLoading && <p className="text-slate-500 text-sm animate-pulse">缠师思考中…（约 1-2 分钟）</p>}
              {!chatAnswer && !chatError && !chatLoading && (
                <p className="text-slate-600 text-sm">例：什么是第三类买点？第一类买点和第二类买点的区别？</p>
              )}
            </div>
            <div className="p-3 border-t border-slate-800 flex gap-2">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && ask()}
                placeholder="输入你的问题…"
                className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={ask}
                disabled={chatLoading}
                className="rounded-md bg-amber-500/90 hover:bg-amber-400 disabled:opacity-50 text-black px-4 py-2 text-sm font-medium"
              >
                {chatLoading ? '…' : '提问'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
