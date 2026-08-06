'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// 缠论全集：文章列表 + 预览
const TAG_LIST = ['教你炒股票108课', '时政经济（缠中说禅经济学）', '文史哲学（《论语》详解）', '论语详解', '诗词曲赋', '诗人画廊', '白话杂文', '教你打坐', '缠非缠、禅非禅，枯木龙吟照大千', '那一夜，他的体液喷了我一身', '顶翻东西经济学', '数理科技（缠中说禅医学）', '捍卫马克思', '货币战争和人民币战略', '音乐艺术', '周末音乐会', '流行娱乐']

export default function ArticlesPage() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [poemOnly, setPoemOnly] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selFile, setSelFile] = useState<string | null>(null)
  const [article, setArticle] = useState<any>(null)
  const [artLoading, setArtLoading] = useState(false)
  const size = 50

  // 拉列表
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ size: String(size), page: String(page) })
    if (q) params.set('q', q)
    if (poemOnly) params.set('poem', '1')
    if (tagFilter) params.set('tag', tagFilter)
    fetch(`/api/chanlun?path=articles&${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setTotal(d.total || 0); setLoading(false) })
      .catch(() => { setLoading(false) })
  }, [page, q, poemOnly, tagFilter])

  // 选文章 → 拉预览
  const openArticle = (file: string) => {
    setSelFile(file)
    setArtLoading(true)
    setArticle(null)
    fetch(`/api/chanlun?path=article&file=${encodeURIComponent(file)}`)
      .then(r => r.json())
      .then(d => setArticle(d))
      .catch(() => setArticle({ found: false }))
      .finally(() => setArtLoading(false))
  }

  const totalPages = Math.max(1, Math.ceil(total / size))

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-100">缠中说禅 · 全集文章</h1>
            <p className="text-xs text-slate-500 mt-1">共 {total} 篇 · {poemOnly ? '只看诗词' : '全部文章'} · 来源：缠论全集.chm</p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1) }}
              placeholder="搜索标题…"
              className="bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={() => { setPoemOnly(!poemOnly); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${poemOnly ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-800/60 text-slate-400 border-slate-700'}`}
            >
              🎋 诗词
            </button>
          </div>
        </div>

        {/* 标签筛选栏 */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => { setTagFilter(''); setPage(1) }}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${!tagFilter ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:text-slate-300'}`}
          >全部</button>
          {TAG_LIST.map(t => (
            <button
              key={t}
              onClick={() => { setTagFilter(tagFilter === t ? '' : t); setPage(1) }}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${tagFilter === t ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:text-slate-300'}`}
            >{t}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: 'calc(100vh - 160px)' }}>
          {/* 左：列表 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {loading && <p className="p-4 text-sm text-slate-500">加载中…</p>}
              {!loading && items.length === 0 && <p className="p-4 text-sm text-slate-500">无匹配文章</p>}
              {items.map((it: any) => (
                <button
                  key={it.file}
                  onClick={() => openArticle(it.file)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-800/60 transition-colors ${selFile === it.file ? 'bg-slate-800/80 border-l-2 border-amber-500' : 'border-l-2 border-transparent'}`}
                >
                  <div className="flex items-start gap-2">
                    {it.poem && <span className="text-emerald-500 text-sm mt-0.5">🎋</span>}
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 leading-snug truncate">{it.poem ? it.title.replace(/^🎋\s*/, '') : it.title}</p>
                      {it.date && <p className="text-[10px] text-slate-600 mt-0.5">{it.date}</p>}
                      {it.tags && it.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {it.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-500 border border-slate-700/60">{t.length > 10 ? t.slice(0, 9) + '…' : t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {/* 分页 */}
            <div className="border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
              <span>{page} / {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded bg-slate-800 disabled:opacity-30">← 上一页</button>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded bg-slate-800 disabled:opacity-30">下一页 →</button>
              </div>
            </div>
          </div>

          {/* 右：预览 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              {artLoading && <p className="text-sm text-slate-500">加载中…</p>}
              {!artLoading && !article && (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                  ← 点左侧文章查看全文
                </div>
              )}
              {!artLoading && article?.found === false && (
                <div className="h-full flex items-center justify-center text-red-400 text-sm">文章不存在</div>
              )}
              {!artLoading && article?.found && (
                <article>
                  <h1 className="text-lg font-bold text-slate-100 mb-2">{article.poem ? '🎋 ' : ''}{article.file.replace(/\.md$/, '').replace(/^🎋\s*/, '')}</h1>
                  <div className="border-b border-slate-800 mb-4 pb-3">
                    <span className="text-[11px] text-slate-600">来源：缠论全集.chm{article.poem ? ' · 诗词' : ''}</span>
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {article.tags.map((t: string) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/70 text-slate-400 border border-slate-700/60">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none [&_a]:text-amber-500 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm whitespace-pre-wrap break-words text-slate-300 leading-relaxed text-[13px]">
                    {article.content}
                  </div>
                </article>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
