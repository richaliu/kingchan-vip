'use client'

import { useCallback, useEffect, useState } from 'react'

function fmtMoney(v: any): string {
  const n = Number(v)
  if (!isFinite(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (abs >= 1e4) return (n / 1e4).toFixed(1) + '万'
  return n.toFixed(0)
}

function flowColor(v: any): string {
  return Number(v) >= 0 ? '#c00' : '#0a8'
}

export default function CapitalPage() {
  const [tab, setTab] = useState<'stock' | 'concept' | 'north'>('stock')
  const [query, setQuery] = useState('600519')
  const [flow, setFlow] = useState<any[]>([])
  const [concepts, setConcepts] = useState<any[]>([])
  const [conceptDate, setConceptDate] = useState('')
  const [north, setNorth] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const loadFlow = useCallback((code: string) => {
    setLoading(true)
    setErr('')
    fetch(`/api/capital_flow?code=${encodeURIComponent(code)}&limit=60`)
      .then((r) => r.json())
      .then((d) => {
        setLoading(false)
        if (d.error || !Array.isArray(d.rows)) {
          setErr(d.error || '无数据')
          setFlow([])
        } else {
          setFlow(d.rows)
        }
      })
      .catch(() => {
        setLoading(false)
        setErr('加载失败')
      })
  }, [])

  useEffect(() => {
    loadFlow('600519')
    fetch('/api/concept_flow?limit=80')
      .then((r) => r.json())
      .then((d) => {
        setConcepts(Array.isArray(d.rows) ? d.rows : [])
        setConceptDate(d.date || '')
      })
    fetch('/api/capital_flow/northbound?limit=30')
      .then((r) => r.json())
      .then((d) => setNorth(Array.isArray(d.rows) ? d.rows : []))
  }, [loadFlow])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px', fontFamily: 'var(--font-serif-sc), serif' }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>资金流动</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { k: 'stock', label: '个股资金流' },
          { k: 'concept', label: '概念资金流' },
          { k: 'north', label: '北向资金' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            style={{
              padding: '6px 14px',
              fontSize: 14,
              border: '1px solid #ccc',
              borderRadius: 6,
              cursor: 'pointer',
              background: tab === t.k ? '#333' : '#fff',
              color: tab === t.k ? '#fff' : '#333',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadFlow(query.trim())}
              placeholder="股票代码，如 600519"
              style={{ flex: 1, maxWidth: 300, padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 6 }}
            />
            <button
              onClick={() => loadFlow(query.trim())}
              style={{ padding: '8px 16px', fontSize: 14, border: '1px solid #888', borderRadius: 6, background: '#f5f5f5', cursor: 'pointer' }}
            >
              查询
            </button>
          </div>
          {loading && <div style={{ color: '#888', padding: 8 }}>加载中…</div>}
          {err && <div style={{ color: '#c00', padding: 8 }}>⚠️ {err}</div>}
          {!loading && flow.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f2ea', color: '#555' }}>
                    <th style={th}>日期</th>
                    <th style={th}>收盘</th>
                    <th style={th}>主力净流入</th>
                    <th style={th}>超大单</th>
                    <th style={th}>大单</th>
                    <th style={th}>中单</th>
                    <th style={th}>小单</th>
                    <th style={th}>净额</th>
                  </tr>
                </thead>
                <tbody>
                  {flow.slice(-40).reverse().map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0ece2' }}>
                      <td style={td}>{r.date}</td>
                      <td style={td}>{Number(r.trade).toFixed(2)}</td>
                      <td style={{ ...td, color: flowColor(r.main), fontWeight: 600 }}>{fmtMoney(r.main)}</td>
                      <td style={{ ...td, color: flowColor(r.super_net) }}>{fmtMoney(r.super_net)}</td>
                      <td style={{ ...td, color: flowColor(r.large_net) }}>{fmtMoney(r.large_net)}</td>
                      <td style={{ ...td, color: flowColor(r.mid_net) }}>{fmtMoney(r.mid_net)}</td>
                      <td style={{ ...td, color: flowColor(r.small_net) }}>{fmtMoney(r.small_net)}</td>
                      <td style={{ ...td, color: flowColor(r.netamount) }}>{fmtMoney(r.netamount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'concept' && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>
            概念成分股资金流聚合（{conceptDate} · 主力 = 超大单 + 大单）
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ea', color: '#555' }}>
                <th style={th}>#</th>
                <th style={th}>概念板块</th>
                <th style={th}>成分数</th>
                <th style={th}>主力净流入</th>
                <th style={th}>超大单</th>
                <th style={th}>大单</th>
                <th style={th}>净额</th>
              </tr>
            </thead>
            <tbody>
              {concepts.map((r, i) => (
                <tr key={r.board_code} style={{ borderBottom: '1px solid #f0ece2' }}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.board_name}</td>
                  <td style={td}>{r.covered}/{r.stock_count}</td>
                  <td style={{ ...td, color: flowColor(r.main), fontWeight: 600 }}>{fmtMoney(r.main)}</td>
                  <td style={{ ...td, color: flowColor(r.super) }}>{fmtMoney(r.super)}</td>
                  <td style={{ ...td, color: flowColor(r.large) }}>{fmtMoney(r.large)}</td>
                  <td style={{ ...td, color: flowColor(r.netamount) }}>{fmtMoney(r.netamount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'north' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ea', color: '#555' }}>
                <th style={th}>日期</th>
                <th style={th}>类型</th>
                <th style={th}>买入</th>
                <th style={th}>卖出</th>
                <th style={th}>净额</th>
              </tr>
            </thead>
            <tbody>
              {north.slice(-30).reverse().map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ece2' }}>
                  <td style={td}>{r.date}</td>
                  <td style={td}>{r.type}</td>
                  <td style={td}>{fmtMoney(r.buy_amt)}</td>
                  <td style={td}>{fmtMoney(r.sell_amt)}</td>
                  <td style={{ ...td, color: flowColor(r.net_amt), fontWeight: 600 }}>{fmtMoney(r.net_amt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #ddd' }
const td: React.CSSProperties = { padding: '6px 10px', textAlign: 'left' }
