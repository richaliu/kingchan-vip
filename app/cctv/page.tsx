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

// 潜台词精简（用户规则 2026-08）："——"前是标题复述/事实罗列，后面才是讲人话的潜台词 → 只留横杠后
// 无横杠（如"十五五开局年+地方换届前…"）说明整段已是潜台词，保留全文
function cleanSubtext(sub: string | null | undefined, _sum: string | null | undefined): string {
  if (!sub) return ''
  const s = sub.trim()
  if (s.includes('——')) return s.split('——').slice(1).join('——').trim()
  return s
}

export default function CctvPage() {
  const [months, setMonths] = useState<{ month: string; cnt: number }[]>([])
  const [year, setYear] = useState('')
  const [monthMode, setMonthMode] = useState('') // ''=全年, 'YYYYMM'=单月
  const [yearPage, setYearPage] = useState(0) // 年份九宫格翻页（每页4年）
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [filters, setFilters] = useState<{ line?: string; bull?: string }>({})

  // 从月份列表推导年份 + 该年有数据的月份
  const years = useMemo(() => {
    const ys = Array.from(new Set(months.map((m) => m.month.slice(0, 4)))).sort().reverse()
    return ys
  }, [months])

  const monthOptions = useMemo(() => {
    if (!year) return []
    return months.filter((m: { month: string; cnt: number }) => m.month.startsWith(year)).sort()
  }, [months, year])

  // 年份九宫格：每页4年
  const yearPageYears = useMemo(() => {
    if (!years.length) return []
    const start = yearPage * 4
    return years.slice(start, start + 4)
  }, [years, yearPage])

  const yearPageMax = useMemo(() => Math.max(0, Math.ceil(years.length / 4) - 1), [years])

  useEffect(() => {
    fetch('/api/cctv_labels?limit=1')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.months) && d.months.length) {
          const ms = d.months
          setMonths(ms)
          const ys = Array.from(new Set(ms.map((m) => m.month.slice(0, 4)))).sort().reverse()
          setYear(ys[0] || '') // 默认最新年份
          setMonthMode('') // 默认全年
        }
      })
      .catch(() => setErr('数据源不可达'))
  }, [])

  useEffect(() => {
    if (!year) return
    setLoading(true)
    setErr('')
    // 全年 → 传年份(4位)；单月 → 传 YYYYMM
    const q = monthMode || year
    const limit = monthMode ? 600 : 5000
    fetch(`/api/cctv_labels?month=${q}&limit=${limit}`)
      .then((r) => r.json())
      .then((d) => {
        setLoading(false)
        setRows(Array.isArray(d.rows) ? d.rows : [])
      })
      .catch(() => {
        setLoading(false)
        setErr('加载失败')
      })
  }, [year, monthMode])

  // 表头标签筛选
  const visibleRows = useMemo(() => {
    if (!filters.line && !filters.bull) return rows
    return rows.filter((r) => {
      if (filters.line && !r[filters.line]) return false
      if (filters.bull && r.bull_bear !== filters.bull) return false
      return true
    })
  }, [rows, filters])

  const toggleFilter = (kind: 'line' | 'bull', key: string) => {
    setFilters((f) => (f[kind] === key ? { ...f, [kind]: undefined } : { ...f, [kind]: key }))
  }

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {/* 年份九宫格翻页 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setYearPage((p) => Math.max(0, p - 1))}
            disabled={yearPage === 0}
            style={{ padding: '6px 12px', fontSize: 16, border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: yearPage === 0 ? 'not-allowed' : 'pointer', opacity: yearPage === 0 ? 0.4 : 1 }}
          >
            ‹
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {yearPageYears.map((y) => (
              <button
                key={y}
                onClick={() => {
                  setYear(y)
                  setMonthMode('')
                }}
                style={{
                  padding: '8px 18px',
                  fontSize: 14,
                  borderRadius: 6,
                  border: `1px solid ${year === y ? '#8b4513' : '#e0d8c8'}`,
                  background: year === y ? '#8b4513' : '#fdfbf6',
                  color: year === y ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontWeight: year === y ? 600 : 400,
                }}
              >
                {y}
              </button>
            ))}
          </div>
          <button
            onClick={() => setYearPage((p) => Math.min(yearPageMax, p + 1))}
            disabled={yearPage >= yearPageMax}
            style={{ padding: '6px 12px', fontSize: 16, border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: yearPage >= yearPageMax ? 'not-allowed' : 'pointer', opacity: yearPage >= yearPageMax ? 0.4 : 1 }}
          >
            ›
          </button>
          <span style={{ fontSize: 13, color: '#888', marginLeft: 4 }}>
            {yearPage * 4 + 1}-{Math.min(yearPage * 4 + 4, years.length)} / {years.length} 年
          </span>
        </div>

        {/* 月份固定标签 1-12 + 全年 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#666' }}>月份</span>
          <button
            onClick={() => setMonthMode('')}
            style={{
              padding: '5px 12px',
              fontSize: 13,
              borderRadius: 20,
              border: `1px solid ${monthMode === '' ? '#8b4513' : '#e0d8c8'}`,
              background: monthMode === '' ? '#8b4513' : '#fdfbf6',
              color: monthMode === '' ? '#fff' : '#333',
              cursor: 'pointer',
            }}
          >
            全年
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
            const mm = `${year}${String(m).padStart(2, '0')}`
            const monthData = months.find((x) => x.month === mm)
            const active = monthMode === mm
            const hasData = !!monthData
            return (
              <button
                key={m}
                onClick={() => {
                  if (!hasData) return
                  setMonthMode(active ? '' : mm)
                }}
                title={monthData ? `${m}月（${monthData.cnt}条）` : `${m}月（无数据）`}
                style={{
                  padding: '5px 11px',
                  fontSize: 13,
                  borderRadius: 20,
                  border: `1px solid ${active ? '#8b4513' : hasData ? '#d8cbb0' : '#eee'}`,
                  background: active ? '#8b4513' : hasData ? '#fdfbf6' : '#f5f5f5',
                  color: active ? '#fff' : hasData ? '#333' : '#bbb',
                  cursor: hasData ? 'pointer' : 'not-allowed',
                }}
              >
                {m}月{monthData ? `·${monthData.cnt}` : ''}
              </button>
            )
          })}
        </div>
        {loading && <span style={{ color: '#888', fontSize: 13 }}>加载中…</span>}
        {err && <span style={{ color: '#c00', fontSize: 13 }}>⚠️ {err}</span>}
        {(filters.line || filters.bull) && (
          <button
            onClick={() => setFilters({})}
            style={{ alignSelf: 'flex-start', padding: '5px 12px', fontSize: 13, border: '1px solid #c00', borderRadius: 6, background: '#fff', color: '#c00', cursor: 'pointer' }}
          >
            清除筛选 ✕
          </button>
        )}
      </div>

      {stat.total > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ border: '1px solid #e8e0d0', borderRadius: 8, padding: '8px 14px', background: '#fdfbf6', fontSize: 13 }}>
            共 <b style={{ color: '#8b4513' }}>{stat.total}</b> 条
            {visibleRows.length !== stat.total && <span style={{ color: '#c00' }}>（筛出 {visibleRows.length}）</span>}
          </div>
          {LINE_MAP.map(([k, label]) => (
            <div
              key={k}
              onClick={() => toggleFilter('line', k)}
              style={{
                border: `1px solid ${filters.line === k ? '#8b4513' : '#e8e0d0'}`,
                borderRadius: 8,
                padding: '8px 14px',
                background: filters.line === k ? '#f3e9d8' : '#fdfbf6',
                fontSize: 13,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {label} <b style={{ color: '#8b4513' }}>{stat.line[k as keyof typeof stat.line]}</b>
              {filters.line === k && ' ✓'}
            </div>
          ))}
          {(Object.keys(stat.bull) as (keyof typeof stat.bull)[]).map((k) => (
            <div
              key={k}
              onClick={() => toggleFilter('bull', k)}
              style={{
                border: `1px solid ${filters.bull === k ? BB_COLOR[k] : '#e8e0d0'}`,
                borderRadius: 8,
                padding: '8px 14px',
                background: filters.bull === k ? '#f3e9d8' : '#fdfbf6',
                fontSize: 13,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {k} <b style={{ color: BB_COLOR[k] }}>{stat.bull[k]}</b>
              {filters.bull === k && ' ✓'}
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
              <th style={th}>位置</th>
              <th style={th}>字数</th>
              <th style={th}>分数</th>
              <th style={th}>会议</th>
              <th style={th}>地点</th>
              <th style={th}>关键词①</th>
              <th style={th}>关键词②</th>
              <th style={th}>关键词③</th>
              <th style={th}>潜台词</th>
              <th style={th}>摘要</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? '#fcfaf5' : '#fff' }}>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.date?.slice(5)}</td>
                <td
                  style={{ ...td, minWidth: 260, position: 'relative' }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  <span style={{ cursor: 'help', borderBottom: '1px dashed #b8860b' }}>{r.title || '—'}</span>
                  {r.anomaly && <span style={{ color: '#c00', fontSize: 11 }}> ⚠{r.anomaly}</span>}
                  {hoverIdx === i && r.content && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '100%',
                        zIndex: 50,
                        width: 460,
                        maxHeight: 280,
                        overflowY: 'auto',
                        background: '#fffdf6',
                        border: '1px solid #d8cfc0',
                        borderRadius: 6,
                        padding: '10px 12px',
                        fontSize: 12,
                        lineHeight: 1.7,
                        color: '#333',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                        whiteSpace: 'normal',
                      }}
                    >
                      {r.content}
                    </div>
                  )}
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
                <td style={td}>{r.pos_weight}</td>
                <td style={td}>{r.char_class}</td>
                <td style={{ ...td, fontWeight: 600, color: (r.score ?? 0) >= 60 ? '#8b4513' : '#888' }}>{r.score ?? '—'}</td>
                <td style={{ ...td, fontSize: 11.5, color: '#8b4513' }}>{r.meeting || '—'}</td>
                <td style={{ ...td, fontSize: 11.5, color: '#555' }}>
                  {[r.country && `🌏${r.country}`, r.province && `📍${r.province}`, r.triangle && `△${r.triangle}`]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </td>
                {(() => {
                  const kw = (r.keywords || '').split(',').map((s: string) => s.trim())
                  return (
                    <>
                      <td style={{ ...td, fontSize: 11.5, color: '#b8860b' }}>{kw[0] || '—'}</td>
                      <td style={{ ...td, fontSize: 11.5, color: '#777' }}>{kw[1] || '—'}</td>
                      <td style={{ ...td, fontSize: 11.5, color: '#777' }}>{kw[2] || '—'}</td>
                    </>
                  )
                })()}
                <td style={{ ...td, minWidth: 200, color: '#555' }}>{cleanSubtext(r.subtext, r.summary) || '—'}</td>
                <td style={td}>{r.summary || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && visibleRows.length === 0 && !err && (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>该月暂无打标数据</div>
      )}
    </div>
  )
}
