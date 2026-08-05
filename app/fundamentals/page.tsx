'use client'

import { useState } from 'react'

function fmtNum(v: any, d = 2): string {
  const n = Number(v)
  if (!isFinite(n)) return '-'
  return n.toFixed(d)
}

function fmtBig(v: any): string {
  const n = Number(v)
  if (!isFinite(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + '万亿'
  if (abs >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (abs >= 1e4) return (n / 1e4).toFixed(1) + '万'
  return n.toFixed(0)
}

export default function FundamentalsPage() {
  const [query, setQuery] = useState('600519')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const search = (code: string) => {
    if (!code.trim()) return
    setLoading(true)
    setErr('')
    setData(null)
    fetch(`/api/fundamentals?code=${encodeURIComponent(code.trim())}`)
      .then((r) => r.json())
      .then((d) => {
        setLoading(false)
        if (d.error) {
          setErr(d.error)
        } else {
          setData(d)
        }
      })
      .catch(() => {
        setLoading(false)
        setErr('查询失败')
      })
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px', fontFamily: 'var(--font-serif-sc), serif' }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>估值财务</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(query)}
          placeholder="股票代码，如 600519"
          style={{ flex: 1, maxWidth: 300, padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button
          onClick={() => search(query)}
          style={{ padding: '8px 16px', fontSize: 14, border: '1px solid #888', borderRadius: 6, background: '#f5f5f5', cursor: 'pointer' }}
        >
          查询
        </button>
      </div>

      {loading && <div style={{ color: '#888', padding: 8 }}>加载中…</div>}
      {err && <div style={{ color: '#c00', padding: 8 }}>⚠️ {err}</div>}

      {data && (
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>{data.code} 估值财务</h2>

          {data.basic?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, color: '#8b4513', marginBottom: 6 }}>估值（日频）</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f5f2ea' }}>
                      <th style={th}>日期</th>
                      <th style={th}>收盘</th>
                      <th style={th}>PE(TTM)</th>
                      <th style={th}>PB</th>
                      <th style={th}>PS</th>
                      <th style={th}>总市值</th>
                      <th style={th}>流通市值</th>
                      <th style={th}>涨跌幅</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.basic.slice(-8).reverse().map((r: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0ece2' }}>
                        <td style={td}>{r.trade_date}</td>
                        <td style={td}>{fmtNum(r.close)}</td>
                        <td style={td}>{fmtNum(r.pe_ttm)}</td>
                        <td style={td}>{fmtNum(r.pb_mrq)}</td>
                        <td style={td}>{fmtNum(r.ps_ttm)}</td>
                        <td style={td}>{fmtBig(r.total_mv)}</td>
                        <td style={td}>{fmtBig(r.circ_mv)}</td>
                        <td style={{ ...td, color: Number(r.change_rate) >= 0 ? '#c00' : '#0a8' }}>
                          {fmtNum(r.change_rate, 2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.fundamentals?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, color: '#8b4513', marginBottom: 6 }}>财务（季报）</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f5f2ea' }}>
                      <th style={th}>报告期</th>
                      <th style={th}>EPS</th>
                      <th style={th}>ROE</th>
                      <th style={th}>营收</th>
                      <th style={th}>净利</th>
                      <th style={th}>营收增速</th>
                      <th style={th}>净利增速</th>
                      <th style={th}>毛利率</th>
                      <th style={th}>负债率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fundamentals.slice(-8).reverse().map((r: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0ece2' }}>
                        <td style={td}>{r.report_date}</td>
                        <td style={td}>{fmtNum(r.eps)}</td>
                        <td style={td}>{fmtNum(r.roe)}%</td>
                        <td style={td}>{fmtBig(r.revenue)}</td>
                        <td style={td}>{fmtBig(r.netprofit)}</td>
                        <td style={{ ...td, color: Number(r.revenue_yoy) >= 0 ? '#c00' : '#0a8' }}>{fmtNum(r.revenue_yoy, 2)}%</td>
                        <td style={{ ...td, color: Number(r.netprofit_yoy) >= 0 ? '#c00' : '#0a8' }}>{fmtNum(r.netprofit_yoy, 2)}%</td>
                        <td style={td}>{fmtNum(r.gross_margin)}%</td>
                        <td style={td}>{fmtNum(r.debt_ratio)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.dividend?.length > 0 && (
            <div>
              <h3 style={{ fontSize: 15, color: '#8b4513', marginBottom: 6 }}>分红送转</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f5f2ea' }}>
                      <th style={th}>日期</th>
                      <th style={th}>分红(元)</th>
                      <th style={th}>送转比例</th>
                      <th style={th}>分红比例</th>
                      <th style={th}>方案</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dividend.map((r: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0ece2' }}>
                        <td style={td}>{r.date}</td>
                        <td style={td}>{fmtNum(r.bonus_rmb)}</td>
                        <td style={td}>{r.transfer_ratio}</td>
                        <td style={td}>{r.bonus_ratio}</td>
                        <td style={td}>{r.plan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #ddd' }
const td: React.CSSProperties = { padding: '6px 10px', textAlign: 'left' }
