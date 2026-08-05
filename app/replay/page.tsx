'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const LAYERS = [
  { id: 'l1', label: '大盘方向' },
  { id: 'l2', label: '日线·资金' },
  { id: 'l3', label: '情绪温度' },
  { id: 'l4', label: '板块轮动' },
  { id: 'l5', label: '个股诊断' },
  { id: 'l6', label: '交易计划' },
]

const INDICES: Record<string, { name: string; color: string }> = {
  sh000001: { name: '上证综指', color: '#ef4444' },
  sz399001: { name: '深证成指', color: '#3b82f6' },
  sz399006: { name: '创业板指', color: '#22c55e' },
}

function fmtMoney(v: any): string {
  const n = Number(v)
  if (!isFinite(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (abs >= 1e4) return (n / 1e4).toFixed(0) + '万'
  return n.toFixed(0)
}

export default function ReplayPage() {
  const [layer, setLayer] = useState('l1')
  const [macro, setMacro] = useState<any>(null)
  const [sectors, setSectors] = useState<any>(null)
  const [sentiment, setSentiment] = useState<any>(null)
  const [stock, setStock] = useState<any>(null)
  const [sq, setSq] = useState('600519')
  const [loading, setLoading] = useState(false)
  const [dateBase, setDateBase] = useState('2026-08-05')
  const ecReady = useRef(false)

  useEffect(() => {
    // 加载 ECharts
    const w = window as any
    if (w.echarts) { ecReady.current = true; loadData(); return }
    const s = document.createElement('script')
    s.src = 'https://registry.npmmirror.com/echarts/5.5.0/files/dist/echarts.min.js'
    s.onload = () => { ecReady.current = true; loadData() }
    document.head.appendChild(s)
  }, [])

  const loadData = () => {
    fetch('/api/replay/macro').then(r=>r.json()).then(setMacro)
    fetch('/api/replay/sectors').then(r=>r.json()).then(setSectors)
    fetch('/api/replay/sentiment').then(r=>r.json()).then(setSentiment)
  }

  const searchStock = (code: string) => {
    setLoading(true)
    fetch(`/api/replay/stock?code=${encodeURIComponent(code)}&days=60`)
      .then(r=>r.json()).then(d=>{ setStock(d); setLoading(false) })
      .catch(()=>setLoading(false))
  }

  // Layer 1: 周线图
  useEffect(() => {
    if (layer !== 'l1' || !macro?.index_weekly?.length || !ecReady.current) return
    const el = document.getElementById('chart-l1')
    if (!el) return
    const ec = (window as any).echarts
    const dom = ec.init(el)
    const codes = ['sh000001','sz399001','sz399006']
    const byCode: Record<string,any[]> = {}
    macro.index_weekly.forEach((r:any) => {
      const c = r.code || ''
      if (codes.includes(c)) { if (!byCode[c]) byCode[c] = []; byCode[c].push(r) }
    })
    const series = codes.map(code => {
      const data = (byCode[code]||[]).map((r:any) => [String(r.d), r.close]).reverse()
      return { name: INDICES[code]?.name || code, type:'line', data, smooth: true, symbol:'none',
        lineStyle: { color: INDICES[code]?.color || '#999', width:2 }, }
    })
    dom.setOption({
      backgroundColor:'#0f172a', title:{ text:'大盘周线方向（52周）', textStyle:{color:'#ccc',fontSize:14} },
      tooltip:{trigger:'axis'}, legend:{data: series.map(s=>s.name), textStyle:{color:'#aaa'}, bottom:0},
      grid:{top:40,left:50,right:10,bottom:40},
      xAxis:{ type:'time', axisLabel:{color:'#888',fontSize:10} },
      yAxis:{ type:'value', axisLabel:{color:'#888',fontSize:10}, splitLine:{lineStyle:{color:'#1e293b'}} },
      series,
    })
    return () => dom.dispose()
  }, [layer, macro])

  // Layer 2: 日K + 资金流
  useEffect(() => {
    if (layer !== 'l2' || !macro?.index_kline?.length || !ecReady.current) return
    const el = document.getElementById('chart-l2')
    if (!el) return
    const ec = (window as any).echarts
    const dom = ec.init(el)
    const sh = (macro.index_kline||[]).filter((r:any)=>r.code==='sh000001').reverse().slice(-60)
    // 全市场资金流
    const mf = (macro.fund_flow_all||[]).slice(-10).reverse()
    dom.setOption({
      backgroundColor:'#0f172a', title:{ text:'上证综指日线 + 全市场资金流（60日）', textStyle:{color:'#ccc',fontSize:14} },
      tooltip:{trigger:'axis'},
      grid:{top:40,left:50,right:10,bottom:30,height:'55%'},
      xAxis:{ type:'category', data: sh.map((r:any)=>String(r.d).slice(0,10)), axisLabel:{color:'#888',fontSize:9} },
      yAxis:{ type:'value', axisLabel:{color:'#888',fontSize:10}, splitLine:{lineStyle:{color:'#1e293b'}} },
      series:[
        { type:'candlestick', data: sh.map((r:any)=>[r.open||r.close,r.close,r.close*0.98||0,r.close*1.02||0].map(Number)), itemStyle:{color:'#ef4444',color0:'#22c55e'}, name:'上证' },
        { type:'bar', name:'主力净流入', data: mf.map((r:any)=>(r.main||0)/1e8), yAxisIndex:1, itemStyle:{color:'#f59e0b'} },
      ],
    })
    return () => dom.dispose()
  }, [layer, macro])

  // 主力阶段判断
  const judgePhase = (mf: any[]) => {
    if (!mf?.length) return { phase:'数据不足', color:'#666', advice:'—' }
    const recent5 = mf.slice(-5)
    const main5 = recent5.reduce((s:number,r:any)=> s + (r.main||0), 0)
    const totalNet = mf.reduce((s:number,r:any)=> s + Number(r.netamount||0), 0)
    const upDays = recent5.filter((r:any)=>Number(r.netamount||0)>0).length
    if (main5 > 1e8 && upDays >= 3) return { phase:'吸筹/拉升', color:'#22c55e', advice:'主力持续买入，可持有或回调加仓' }
    if (main5 < -1e8 && upDays <= 1) return { phase:'出货/派发', color:'#ef4444', advice:'主力出逃，减仓或回避' }
    if (Math.abs(main5) < 5e7 && Math.abs(totalNet/mf.length) < 1e7) return { phase:'震荡博弈', color:'#f59e0b', advice:'筹码交换期，等方向确认' }
    return { phase:'洗盘/观望', color:'#f59e0b', advice:'缩量波动，等待放量方向' }
  }

  const phaseData = judgePhase(stock?.moneyflow||[])

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#e2e8f0', fontFamily:'var(--font-serif-sc),system-ui,sans-serif' }}>
      {/* 顶部栏 */}
      <div style={{ display:'flex', gap:8, alignItems:'center', padding:'12px 20px', borderBottom:'1px solid #1e293b', flexWrap:'wrap' }}>
        <span style={{ fontSize:20, fontWeight:700, color:'#f59e0b', marginRight:16 }}>主力行为复盘</span>
        <span style={{ fontSize:13, color:'#888' }}>基准日 {dateBase}</span>
        <span style={{ marginLeft:'auto', fontSize:12, color:'#666', display:'flex', gap:12 }}>
          <span style={{color:'#22c55e'}}>🟢 主力买</span>
          <span style={{color:'#ef4444'}}>🔴 散户接</span>
          <span style={{color:'#f59e0b'}}>🟡 观望</span>
        </span>
      </div>

      {/* Tab 导航 */}
      <div style={{ display:'flex', gap:2, borderBottom:'1px solid #1e293b', overflowX:'auto', whiteSpace:'nowrap', padding:'0 20px' }}>
        {LAYERS.map(l => (
          <button key={l.id} onClick={()=>setLayer(l.id)}
            style={{ padding:'10px 18px', fontSize:13, border:'none', background:layer===l.id?'#1e293b':'transparent',
              color:layer===l.id?'#f59e0b':'#888', cursor:'pointer', borderBottom:layer===l.id?'2px solid #f59e0b':'2px solid transparent' }}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Layer 1: 大盘方向 */}
      {layer==='l1' && (
        <div style={{ padding:'20px' }}>
          <div id="chart-l1" style={{ width:'100%', height:450, marginBottom:16 }} />
          {/* 方向标签卡 */}
          {macro?.latest_main && (
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {[{ label:'主力控盘', val:Number(macro.latest_main.main_net)>0?'主力在场':'主力离场', color:Number(macro.latest_main.main_net)>0?'#22c55e':'#ef4444' },
                { label:'全市场主力', val:(Number(macro.latest_main.main_net)/1e8).toFixed(1)+'亿', color:Number(macro.latest_main.main_net)>0?'#22c55e':'#ef4444' },
                { label:'数据日期', val:macro.latest_main.date, color:'#888' },
              ].map((c,i)=>(
                <div key={i} style={{ background:'#1e293b', borderRadius:8, padding:'12px 16px', minWidth:150 }}>
                  <div style={{ fontSize:12, color:'#888' }}>{c.label}</div>
                  <div style={{ fontSize:18, fontWeight:700, color:c.color }}>{c.val}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ color:'#666', fontSize:12, marginTop:10 }}>
            ⚠️ Layer 1 完整版需周均线+周成交量判断——当前展示基础日线方向。缺失数据：竞价、龙虎榜。
          </div>
        </div>
      )}

      {/* Layer 2: 日线+资金流 */}
      {layer==='l2' && (
        <div style={{ padding:'20px' }}>
          <div id="chart-l2" style={{ width:'100%', height:400, marginBottom:12 }} />
          <div style={{ color:'#666', fontSize:12 }}>日K蜡烛图 + 全市场主力净流入柱（黄色=主力买/卖）——资金流 2024.8 起始</div>
        </div>
      )}

      {/* Layer 3: 情绪温度计 */}
      {layer==='l3' && sentiment?.breadth && (
        <div style={{ padding:'20px' }}>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[
              { label:'涨跌家数', val:`${sentiment.breadth.up}↑ / ${sentiment.breadth.down}↓`, color: sentiment.breadth.up>sentiment.breadth.down?'#22c55e':'#ef4444' },
              { label:'涨跌比', val:(sentiment.breadth.up/Math.max(1,sentiment.breadth.down)).toFixed(2), color:'#f59e0b' },
              { label:'涨停', val:sentiment.breadth.limit_up, color:'#ef4444' },
              { label:'跌停', val:sentiment.breadth.limit_down, color:'#22c55e' },
              { label:'平均涨跌', val:(Number(sentiment.breadth.avg_chg)*100).toFixed(2)+'%', color:Number(sentiment.breadth.avg_chg)>0?'#ef4444':'#22c55e' },
              { label:'全市场量', val:fmtMoney(sentiment.breadth.total_vol), color:'#888' },
            ].map((c,i)=>(
              <div key={i} style={{ background:'#1e293b', borderRadius:8, padding:'14px 18px', minWidth:130 }}>
                <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:20, fontWeight:700, color:c.color }}>{c.val}</div>
              </div>
            ))}
          </div>
          {/* 散户情绪判断 */}
          {(() => {
            const b = sentiment.breadth
            const ratio = b.up / Math.max(1, b.down)
            let label = '情绪中性'; let color = '#f59e0b'
            if (ratio > 3) { label = '散户狂热（警惕追高风险）'; color = '#ef4444' }
            else if (ratio < 0.5) { label = '散户恐慌（主力可能吸筹）'; color = '#22c55e' }
            return <div style={{ marginTop:14, padding:'12px 18px', background:'#1e293b', borderRadius:8, fontSize:15, fontWeight:600, color }}>🧠 {label}</div>
          })()}
          <div style={{ color:'#666', fontSize:12, marginTop:8 }}>⚠️ 连板高度/炸板率需实时数据源。</div>
        </div>
      )}

      {/* Layer 4: 板块轮动 */}
      {layer==='l4' && sectors?.sectors && (
        <div style={{ padding:'20px', overflowX:'auto' }}>
          <div style={{ fontSize:14, color:'#888', marginBottom:8 }}>📊 板块主力强度排行榜（按超大单+大单净额排序）</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ color:'#888', borderBottom:'1px solid #1e293b' }}>
                <th style={th}>#</th><th style={th}>板块</th><th style={th}>主力净流入</th>
                <th style={th}>超大单</th><th style={th}>5日涨跌</th>
              </tr>
            </thead>
            <tbody>
              {sectors.sectors.slice(0,30).map((r:any) => (
                <tr key={r.rank} style={{ borderBottom:'1px solid #1e293b' }}>
                  <td style={td}>{r.rank}</td>
                  <td style={{...td, fontWeight:600, color:r.bk?'#60a5fa':'#888'}}>{r.name}</td>
                  <td style={{...td, color:Number(r.main)>0?'#22c55e':'#ef4444'}}>{fmtMoney(r.main)}</td>
                  <td style={{...td, color:Number(r.super)>0?'#22c55e':'#ef4444'}}>{fmtMoney(r.super)}</td>
                  <td style={{...td, color:Number(r.chg5d)>0?'#ef4444':'#22c55e'}}>{r.chg5d!=null ? r.chg5d.toFixed(1)+'%' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Layer 5: 个股诊断 */}
      {layer==='l5' && (
        <div style={{ padding:'20px' }}>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <input value={sq} onChange={e=>setSq(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchStock(sq.trim())}
              placeholder="股票代码 如 600519" style={{ padding:'8px 12px', fontSize:14, border:'1px solid #334155', borderRadius:6, background:'#1e293b', color:'#e2e8f0', width:200 }} />
            <button onClick={()=>searchStock(sq.trim())} style={{ padding:'8px 16px', fontSize:14, border:'1px solid #475569', borderRadius:6, background:'#334155', color:'#e2e8f0', cursor:'pointer' }}>
              {loading?'分析中…':'诊断'}
            </button>
          </div>
          {stock && (
            <div>
              {/* 主力阶段卡片 */}
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
                <div style={{ background:'#1e293b', borderRadius:8, padding:'14px 18px', minWidth:180 }}>
                  <div style={{ fontSize:12, color:'#888' }}>主力阶段</div>
                  <div style={{ fontSize:20, fontWeight:700, color:phaseData.color }}>{phaseData.phase}</div>
                  <div style={{ fontSize:12, color:'#aaa', marginTop:4 }}>{phaseData.advice}</div>
                </div>
                {currentMF()}
              </div>
              {/* 资金流表格 */}
              {stock.moneyflow?.length > 0 && (
                <div style={{ overflowX:'auto', marginBottom:16 }}>
                  <div style={{ fontSize:13, color:'#888', marginBottom:6 }}>四档资金流（最近20日）</div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr style={{ color:'#888', borderBottom:'1px solid #1e293b' }}>
                      <th style={th}>日期</th><th style={th}>主力</th><th style={th}>超大单</th><th style={th}>大单</th><th style={th}>净额</th>
                    </tr></thead>
                    <tbody>
                      {stock.moneyflow.slice(-20).reverse().map((r:any,i:number)=>(
                        <tr key={i} style={{ borderBottom:'1px solid #1e293b' }}>
                          <td style={td}>{String(r.date)}</td>
                          <td style={{...td, color:Number(r.main||0)>0?'#22c55e':'#ef4444'}}>{fmtMoney(r.main)}</td>
                          <td style={{...td, color:Number(r.super_net)>0?'#22c55e':'#ef4444'}}>{fmtMoney(r.super_net)}</td>
                          <td style={{...td, color:Number(r.large_net)>0?'#22c55e':'#ef4444'}}>{fmtMoney(r.large_net)}</td>
                          <td style={{...td, color:Number(r.netamount)>0?'#22c55e':'#ef4444'}}>{fmtMoney(r.netamount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* 大单明细 */}
              {stock.big_deals?.length > 0 && (
                <div style={{ marginBottom:16, color:'#888', fontSize:12 }}>
                  📋 大单明细最近 {stock.big_deals.length} 笔 | 买盘 vs 卖盘：{
                    stock.big_deals.filter((d:any)=>d.deal_type?.includes('买')).length
                  } vs {stock.big_deals.filter((d:any)=>d.deal_type?.includes('卖')).length}
                </div>
              )}
              {/* PE分位 */}
              <div style={{ fontSize:13, color:'#666', marginBottom:8 }}>
                PE(TTM): {stock.pe?.toFixed(1)} | 历史分位: {stock.pe_rank?.toFixed(1)}% 
                {stock.pe_rank>80 ? ' ⚠️ 估值偏高' : stock.pe_rank<30 ? ' ✅ 估值偏低' : ''}
              </div>
            </div>
          )}
          <div style={{ color:'#666', fontSize:12, marginTop:8 }}>
            ⚠️ 缺失：竞价数据、龙虎榜、盘中30分钟大单细节。承接力评级待扩充。
          </div>
        </div>
      )}

      {/* Layer 6: 交易计划板 */}
      {layer==='l6' && (
        <div style={{ padding:'20px' }}>
          <div style={{ color:'#888', fontSize:14, marginBottom:10 }}>📋 明日作战计划（2026-08-06）</div>
          {(() => {
            const mainOk = macro?.latest_main?.main_net > 0
            const breadth = sentiment?.breadth
            const ratio = breadth ? breadth.up / Math.max(1, breadth.down) : 1
            const pos = mainOk ? (ratio > 2 ? '半仓 50%' : '重仓 80%') : '轻仓 30%'
            return (
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16 }}>
                <div style={{ background:'#1e293b', borderRadius:8, padding:'14px 18px', minWidth:180 }}>
                  <div style={{ fontSize:12, color:'#888' }}>仓位建议</div>
                  <div style={{ fontSize:22, fontWeight:700, color: pos.includes('重')?'#22c55e':'#f59e0b' }}>{pos}</div>
                </div>
                <div style={{ background:'#1e293b', borderRadius:8, padding:'14px 18px', minWidth:200 }}>
                  <div style={{ fontSize:12, color:'#888' }}>策略方向</div>
                  <div style={{ fontSize:16, fontWeight:600, color: mainOk?'#22c55e':'#ef4444' }}>
                    {mainOk ? (ratio > 2 ? '散户偏热→回调低吸不追' : '主力积极→进攻') : '主力撤离→防守'}
                  </div>
                </div>
              </div>
            )
          })()}
          <div style={{ color:'#666', fontSize:12 }}>⚠️ 完整计划需结合持仓股诊断 + 板块优先级。缺失：竞价、龙虎榜确认主力意图。</div>
        </div>
      )}
    </div>
  )

  function currentMF() {
    const mf = stock?.moneyflow || []
    const recent5 = mf.slice(-5)
    const s5 = recent5.reduce((s:number,r:any)=>s+Number(r.super_net||0),0)
    const l5 = recent5.reduce((s:number,r:any)=>s+Number(r.large_net||0),0)
    return (
      <div style={{ background:'#1e293b', borderRadius:8, padding:'14px 18px', minWidth:180 }}>
        <div style={{ fontSize:12, color:'#888' }}>近5日超大+大单</div>
        <div style={{ fontSize:16, fontWeight:700, color: s5+l5>0?'#22c55e':'#ef4444' }}>{fmtMoney(s5+l5)}</div>
      </div>
    )
  }
}

const th: React.CSSProperties = { padding:'8px 12px', textAlign:'left', whiteSpace:'nowrap' }
const td: React.CSSProperties = { padding:'7px 12px', textAlign:'left' }
