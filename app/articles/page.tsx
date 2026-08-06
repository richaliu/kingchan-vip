'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// 缠论全集：古风文章列表 + 左侧分类菜单 + 预览
const TAG_GROUPS: { group: string; tags: string[] }[] = [
  { group: '炒股', tags: ['教你炒股票108课', '时政经济（缠中说禅经济学）'] },
  { group: '国学', tags: ['文史哲学（《论语》详解）', '论语详解'] },
  { group: '诗词', tags: ['诗词曲赋', '诗人画廊'] },
  { group: '禅修', tags: ['教你打坐', '缠非缠、禅非禅，枯木龙吟照大千'] },
  { group: '文学', tags: ['那一夜，他的体液喷了我一身', '白话杂文', '流行娱乐'] },
  { group: '经济', tags: ['顶翻东西经济学', '捍卫马克思', '货币战争和人民币战略'] },
  { group: '医学', tags: ['数理科技（缠中说禅医学）'] },
  { group: '音乐', tags: ['音乐艺术', '周末音乐会'] },
]

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const size = 60

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
  const isPoemTag = tagFilter === '诗词曲赋' || tagFilter === '诗人画廊'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf6ef] to-[#f3ecdd] text-[#3d3428]">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* 头部：古风标题 */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3 border-b-2 border-[#8b4513]/30 pb-4">
          <div>
            <h1 className="font-brush text-3xl tracking-widest text-[#8b4513]">缠中说禅 · 全集</h1>
            <p className="text-xs text-[#8b4513]/60 mt-1 font-kai">共 {total} 篇 · 缠论全集.chm 全量收录{tagFilter ? ` · ${tagFilter}` : ''}</p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1) }}
              placeholder="搜索标题…"
              className="bg-white/70 border border-[#8b4513]/30 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-[#8b4513]/60 text-[#3d3428]"
            />
            <button
              onClick={() => { setPoemOnly(!poemOnly); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors font-kai ${poemOnly || isPoemTag ? 'bg-[#8b4513]/15 text-[#8b4513] border-[#8b4513]/50' : 'bg-white/50 text-[#8b4513]/70 border-[#8b4513]/25 hover:border-[#8b4513]/50'}`}
            >
              🌺 诗词
            </button>
          </div>
        </div>

        <div className="flex gap-4" style={{ height: 'calc(100vh - 170px)' }}>
          {/* 左：分类菜单 */}
          <aside className={`${sidebarOpen ? 'w-44' : 'w-10'} shrink-0 transition-all duration-200`}>
            <div className="h-full bg-white/60 border border-[#8b4513]/20 rounded-xl overflow-hidden flex flex-col">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-[#8b4513]/60 hover:text-[#8b4513] text-sm border-b border-[#8b4513]/15"
              >
                {sidebarOpen ? '« 收起' : '»'}
              </button>
              {sidebarOpen && (
                <div className="flex-1 overflow-y-auto p-2 space-y-3">
                  <button
                    onClick={() => { setTagFilter(''); setPage(1) }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm font-kai transition-colors ${!tagFilter ? 'bg-[#8b4513]/15 text-[#8b4513]' : 'text-[#3d3428]/70 hover:bg-[#8b4513]/8'}`}
                  >📜 全部文章</button>
                  {TAG_GROUPS.map(g => (
                    <div key={g.group}>
                      <p className="px-2.5 pt-1 pb-0.5 text-[10px] tracking-widest text-[#8b4513]/50">{g.group}</p>
                      {g.tags.map(t => (
                        <button
                          key={t}
                          onClick={() => { setTagFilter(tagFilter === t ? '' : t); setPage(1) }}
                          className={`w-full text-left px-2.5 py-1 rounded-md text-xs transition-colors ${tagFilter === t ? 'bg-[#8b4513]/15 text-[#8b4513] font-medium' : 'text-[#3d3428]/60 hover:bg-[#8b4513]/8'}`}
                        >{t.length > 12 ? t.slice(0, 11) + '…' : t}</button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* 中：列表 */}
          <div className="flex-1 bg-white/70 border border-[#8b4513]/20 rounded-xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto divide-y divide-[#8b4513]/8">
              {loading && <p className="p-4 text-sm text-[#8b4513]/60 font-kai">加载中…</p>}
              {!loading && items.length === 0 && <p className="p-4 text-sm text-[#8b4513]/60 font-kai">无匹配文章</p>}
              {items.map((it: any) => (
                <button
                  key={it.file}
                  onClick={() => openArticle(it.file)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-[#8b4513]/5 transition-colors ${selFile === it.file ? 'bg-[#8b4513]/10 border-l-2 border-[#8b4513]' : 'border-l-2 border-transparent'}`}
                >
                  <div className="flex items-start gap-2">
                    {it.poem && <span className="text-rose-500 text-sm mt-0.5">🌺</span>}
                    <div className="min-w-0">
                      <p className="text-sm text-[#3d3428] leading-snug truncate font-kai">{it.poem ? it.title.replace(/^[🎋🌺]\s*/, '') : it.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {it.date && <p className="text-[10px] text-[#8b4513]/50">{it.date}</p>}
                        {it.tags && it.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {it.tags.slice(0, 2).map((t: string) => (
                              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#8b4513]/8 text-[#8b4513]/70 border border-[#8b4513]/15">{t.length > 8 ? t.slice(0, 7) + '…' : t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-[#8b4513]/15 px-4 py-2 flex items-center justify-between text-xs text-[#8b4513]/60 font-kai">
              <span>{page} / {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 py-1 rounded bg-white border border-[#8b4513]/20 disabled:opacity-30">← 上一页</button>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-2 py-1 rounded bg-white border border-[#8b4513]/20 disabled:opacity-30">下一页 →</button>
              </div>
            </div>
          </div>

          {/* 右：预览 */}
          <div className="flex-1 bg-white/80 border border-[#8b4513]/20 rounded-xl overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              {artLoading && <p className="text-sm text-[#8b4513]/60 font-kai">加载中…</p>}
              {!artLoading && !article && (
                <div className="h-full flex items-center justify-center text-[#8b4513]/40 text-sm font-kai">
                  点左侧文章，细品原文
                </div>
              )}
              {!artLoading && article?.found === false && (
                <div className="h-full flex items-center justify-center text-red-500 text-sm">文章不存在</div>
              )}
              {!artLoading && article?.found && (
                <article>
                  <h1 className="font-brush text-xl text-[#8b4513] mb-2">{article.poem ? '🌺 ' : ''}{article.file.replace(/\.md$/, '').replace(/^[🎋🌺]\s*/, '')}</h1>
                  <div className="border-b border-[#8b4513]/15 mb-4 pb-3">
                    <span className="text-[11px] text-[#8b4513]/50 font-kai">来源：缠论全集.chm{article.poem ? ' · 诗词' : ''}</span>
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {article.tags.map((t: string) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#8b4513]/8 text-[#8b4513]/70 border border-[#8b4513]/15">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 正文 */}
                  <div className="font-kai text-[#3d3428] leading-loose text-[14px] whitespace-pre-wrap break-words">
                    {article.content.split('## 💬 评论区')[0]}
                  </div>
                  {/* 评论区小字 */}
                  {article.content.includes('## 💬 评论区') && (
                    <div className="mt-6 pt-3 border-t border-dashed border-[#8b4513]/25">
                      <p className="text-[11px] text-[#8b4513]/50 font-kai mb-2">💬 评论区</p>
                      <div className="text-[11px] text-[#8b4513]/45 leading-relaxed whitespace-pre-wrap break-words">
                        {article.content.split('## 💬 评论区')[1]}
                      </div>
                    </div>
                  )}
                </article>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
