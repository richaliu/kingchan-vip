'use client'

import { useEffect, useMemo, useState } from 'react'

const th: React.CSSProperties = { padding: '6px 10px', borderBottom: '2px solid #d8cfc0', textAlign: 'left', fontSize: 12, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #f0ece2', fontSize: 12.5, verticalAlign: 'top' }

const LINE_MAP: [string, string][] = [
  ['line_01', '①国内治理'],
  ['line_02', '②外交突围'],
  ['line_03', '③中美博弈'],
  ['line_04', '④金融防线'],
]

const BB_COLOR: Record<string, string> = { 多方: '#c00', 空方: '#0a8', 中性: '#888' }

export default function CctvPage() {
  const [months, setMonths] = useState<{ month: string; cnt: number }[]>([])
  const [month, setMonth] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/cctv_labels?limit=1')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.months) && d.months.length) {
          const ms = d.months
          setMonths(ms)
          setMonth(ms[0].month) // 默认最新月份
        }
      })
      .catch(() => setErr('数据源不可达'))
  }, [])

  useEffect(() => {
    if (!month) return
    setLoading(true)
    setErr('')
    fetch(`/api/cctv_labels?month=${month}&limit=600`)
      .then((r) => r.json())
      .then((d) => {
        setLoading(false)
        setRows(Array.isArray(d.rows) ? d.rows : [])
      })
      .catch(() => {
        setLoading(false)
        setErr('加载失败')
      })
  }, [month])

  const stat = useMemo(() => {
    const s = { total: rows.length, line: { line_01: 0, line_02: 0, line_03: 0, line_04: 0 }, bull: { 多方: 0, 空方: 0, 中性: 0 }, top: rows[0] }
    for (const r of rows) {
      for (const [k] of LINE_MAP) if (r[k]) s.line[k as keyof typeof s.line]++
      if (r.bull_bear) s.bull[r.bull_bear as keyof typeof s.bull]++
    }
    return s
  }, [rows])

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px', fontFamily: 'var(--font-serif-sc), serif' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22 }}>新闻联播 · 雁型打标</h1>
        <span style={{ fontSize: 13, color: '#8b4513' }}>政策K线：谁发起 → 哪个领域 → 哪个方向 → 多还是空 → 潜台词</span>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 14 }}>月份</label>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ padding: '7px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 6, background: '#fff' }}
        >
          {months.map((m) => (
            <option key={m.month} value={m.month}>
              {m.month.slice(0, 4)}-{m.month.slice(4)}（{m.cnt}条）
            </option>
          ))}
        </select>
        {loading && <span style={{ color: '#888', fontSize: 13 }}>加载中…</span>}
        {err && <span style={{ color: '#c00', fontSize: 13 }}>⚠️ {err}</span>}
      </div>

      {stat.total > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ border: '1px solid #e8e0d0', borderRadius: 8, padding: '8px 14px', background: '#fdfbf6', fontSize: 13 }}>
            共 <b style={{ color: '#8b4513' }}>{stat.total}</b> 条
          </div>
          {LINE_MAP.map(([k, label]) => (
            <div key={k} style={{ border: '1px solid #e8e0d0', borderRadius: 8, padding: '8px 14px', background: '#fdfbf6', fontSize: 13 }}>
              {label} <b style={{ color: '#8b4513' }}>{stat.line[k as keyof typeof stat.line]}</b>
            </div>
          ))}
          {(Object.keys(stat.bull) as (keyof typeof stat.bull)[]).map((k) => (
            <div key={k} style={{ border: '1px solid #e8e0d0', borderRadius: 8, padding: '8px 14px', background: '#fdfbf6', fontSize: 13 }}>
              {k} <b style={{ color: BB_COLOR[k] }}>{stat.bull[k]}</b>
            </div>
          ))}
        </div>
      )}

      {stat.top && (
        <div style={{ border: '1px solid #e8d8c0', borderRadius: 8, padding: '10px 14px', background: '#faf5ea', marginBottom: 14, fontSize: 13 }}>
          <b style={{ color: '#8b4513' }}>本月头条：</b>
          {stat.top.title || '（无标题）'} · {stat.top.summary || ''}
          {stat.top.subtext && <span style={{ color: '#666' }}> ｜ 潜台词：{stat.top.subtext}</span>}
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid #e8e0d0', borderRadius: 8, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
          <thead>
            <tr style={{ background: '#f5f2ea' }}>
              <th style={th}>日期</th>
              <th style={th}>标题</th>
              <th style={th}>板块</th>
              <th style={th}>人物</th>
              <th style={th}>部门</th>
              <th style={th}>方向</th>
              <th style={th}>多空</th>
              <th style={th}>雁型</th>
              <th style={th}>性质</th>
              <th style={th}>信号</th>
              <th style={th}>潜台词</th>
              <th style={th}>摘要</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? '#fcfaf5' : '#fff' }}>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.date?.slice(5)}</td>
                <td style={{ ...td, minWidth: 260 }}>
                  {r.title || '—'}
                  {r.keywords && <span style={{ color: '#b8860b', fontSize: 11 }}> ⚑{r.keywords.split(',')[0]}</span>}
                  {r.anomaly && <span style={{ color: '#c00', fontSize: 11 }}> ⚠{r.anomaly}</span>}
                </td>
                <td style={td}>{r.section}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  {r.p1_name ? `${r.p1_name}(${r.p1_level})` : '—'}
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  {r.dept_l2 || r.dept_l1 || '—'}
                </td>
                <td style={td}>
                  {LINE_MAP.filter(([k]) => r[k]).map(([, label]) => (
                    <div key={label} style={{ fontSize: 11, color: '#8b4513' }}>{label}</div>
                  ))}
                </td>
                <td style={{ ...td, color: BB_COLOR[r.bull_bear] || '#888', fontWeight: 600 }}>{r.bull_bear || '—'}</td>
                <td style={td}>{r.yanxing_part}</td>
                <td style={td}>{r.nature}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  <div>
                    {r.pos_weight}/{r.char_class}
                    <span style={{ fontSize: 11, color: '#999' }}> · score={r.score}</span>
                  </div>
                  {r.meeting && (
                    <div style={{ fontSize: 11, color: '#8b4513', marginTop: 2 }}>📌{r.meeting}</div>
                  )}
                  {(r.country || r.province || r.triangle) && (
                    <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                      {[r.country && `🌏${r.country}`, r.province && `📍${r.province}`, r.triangle && `△${r.triangle}`]
                        .filter(Boolean)
                        .join(' ')}
                    </div>
                  )}
                </td>
                <td style={{ ...td, minWidth: 200, color: '#555' }}>{r.subtext || '—'}</td>
                <td style={td}>{r.summary || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 && !err && (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>该月暂无打标数据</div>
      )}
    </div>
  )
}
