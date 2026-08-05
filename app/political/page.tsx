'use client'

import { useEffect, useState } from 'react'

export default function PoliticalPage() {
  const [risks, setRisks] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/political')
      .then((r) => r.json())
      .then((d) => setRisks(Array.isArray(d.risks) ? d.risks : []))
  }, [])

  const search = (code: string) => {
    if (!code.trim()) return
    setLoading(true)
    setErr('')
    setDetail(null)
    fetch(`/api/political?code=${encodeURIComponent(code.trim())}`)
      .then((r) => r.json())
      .then((d) => {
        setLoading(false)
        setDetail(d)
      })
      .catch(() => {
        setLoading(false)
        setErr('查询失败')
      })
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px', fontFamily: 'var(--font-serif-sc), serif' }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>政治基本面</h1>

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

      {/* 个股政治基本面 */}
      {detail && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>{detail.code} 政治基本面</h2>

          {detail.managers?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, color: '#8b4513', marginBottom: 6 }}>高管班子</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {detail.managers.map((m: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #e8e0d0', borderRadius: 8, padding: 10, background: '#fdfbf6' }}>
                    <div style={{ fontSize: 12, color: '#999' }}>{m.name}</div>
                    {m.chairman && <div>董事长：{m.chairman}</div>}
                    {m.president && <div>总经理：{m.president}</div>}
                    {m.secretary && <div>董秘：{m.secretary}</div>}
                    {m.legal_person && <div>法人：{m.legal_person}</div>}
                    {m.party_secretary && (
                      <div style={{ color: '#c00', fontWeight: 600 }}>党委书记：{m.party_secretary}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.capital?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, color: '#8b4513', marginBottom: 6 }}>资本归属（缠论：人民币 vs 美元资本）</h3>
              <div style={{ display: 'flex', gap: 12 }}>
                {detail.capital.map((c: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #e8e0d0', borderRadius: 8, padding: 12, background: '#fdfbf6', minWidth: 180 }}>
                    <div style={{ fontSize: 13 }}>
                      人民币浓度 <b style={{ color: '#c00' }}>{c['人民币浓度']}%</b>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      美元浓度 <b style={{ color: '#0a8' }}>{c['美元浓度']}%</b>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      基金浓度 <b>{c['基金浓度']}%</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.control?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, color: '#8b4513', marginBottom: 6 }}>实际控制人</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f2ea' }}>
                    <th style={th}>控制人</th>
                    <th style={th}>持股比例</th>
                    <th style={th}>控制类型</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.control.map((c: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0ece2' }}>
                      <td style={td}>{c.holder_name}</td>
                      <td style={td}>{c.hold_ratio}</td>
                      <td style={td}>{c.ctrl_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {detail.risk?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, color: '#c00', marginBottom: 6 }}>⚠️ 落马/风险记录</h3>
              {detail.risk.map((r: any, i: number) => (
                <div key={i} style={{ border: '1px solid #f0c0c0', borderRadius: 8, padding: 10, background: '#fff8f8', marginBottom: 6, fontSize: 13 }}>
                  <b>{r.person}</b>（{r.former_role}）{r.case_date} · {r.status} {r.note}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 落马名单 */}
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>落马名单（{risks.length}）</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f2ea', color: '#555' }}>
              <th style={th}>股票</th>
              <th style={th}>人物</th>
              <th style={th}>原职务</th>
              <th style={th}>日期</th>
              <th style={th}>状态</th>
              <th style={th}>备注</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0ece2' }}>
                <td style={td}>{r.code}</td>
                <td style={td}><b>{r.person}</b></td>
                <td style={td}>{r.former_role}</td>
                <td style={td}>{r.case_date}</td>
                <td style={{ ...td, color: '#c00' }}>{r.status}</td>
                <td style={td}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #ddd' }
const td: React.CSSProperties = { padding: '6px 10px', textAlign: 'left' }
