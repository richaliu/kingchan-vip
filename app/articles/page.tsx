'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// 缠论全集：左侧漂浮文章清单 + 右侧全文总览（小字排版）
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
  const [panelOpen, setPanelOpen] = useState(true)
  const size = 50

  // 打开默认加载开篇（神州自有中天日）
  useEffect(() => {
    openArticle('神州自有中天日，万国衣冠舞九韶.md')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // 渲染正文（高端排版：诗句居中、评论区小字、链接小字）
  const renderContent = (content: string) => {
    const idx = content.indexOf('## 💬 评论区')
    const body = idx >= 0 ? content.slice(0, idx) : content
    const comments = idx >= 0 ? content.slice(idx) : ''
    const linkM = content.match(/<sub>([\s\S]*?)<\/sub>/)
    const linkText = linkM ? linkM[1] : ''

    // 诗句识别：连续短行（去掉标点 5/7 字）→ 居中展示
    const lines = body.split('\n')
    const blocks: { type: 'para' | 'poem'; text: string }[] = []
    let i = 0
    const isShort = (ln: string) => {
      const s = ln.trim().replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '')
      return s.length >= 3 && s.length <= 16 && ln.trim() !== ''
    }
    while (i < lines.length) {
      const ln = lines[i]
      // 跳过日期行（标题区已显示）
      if (/^>\s*📅/.test(ln.trim()) || /^\s*$/.test(ln)) {
        i++
        continue
      }
      if (isShort(ln) && i + 1 < lines.length && isShort(lines[i + 1])) {
        const poem = [ln.trim()]
        let j = i + 1
        while (j < lines.length && isShort(lines[j])) {
          poem.push(lines[j].trim())
          j++
        }
        blocks.push({ type: 'poem', text: poem.join('\n') })
        i = j
      } else {
        if (ln.trim()) blocks.push({ type: 'para', text: ln })
        i++
      }
    }

    return (
      <>
        <div className="space-y-5">
          {blocks.map((b, bi) =>
            b.type === 'poem' ? (
              <div key={bi} className="my-8 text-center">
                <div className="inline-block border-y border-[#8b4513]/20 py-4 px-8">
                  {b.text.split('\n').map((pl, pi) => (
                    <p key={pi} className="font-kai text-[15px] leading-[2.2] tracking-[0.2em] text-[#8b4513]/90 whitespace-pre">
                      {pl}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p key={bi} className="font-kai text-[14px] leading-[2.1] tracking-[0.05em] text-[#4a4238]/90 text-justify">
                {b.text}
              </p>
            )
          )}
        </div>
        {comments && (
          <div className="mt-8 pt-3 border-t border-dashed border-[#8b4513]/25">
            <p className="text-[11px] text-[#8b4513]/50 mb-2 tracking-widest">💬 评论区</p>
            <div className="whitespace-pre-wrap break-words text-[11px] text-[#8b4513]/45 leading-relaxed">
              {comments.replace(/^## 💬 评论区/, '').replace(/---\s*$/, '')}
            </div>
          </div>
        )}
        {linkText && (
          <div className="mt-6 pt-2 border-t border-dashed border-[#8b4513]/20">
            <span className="text-[10px] text-[#8b4513]/35">{linkText}</span>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf6ef] text-[#3d3428]">
      {/* 顶部极简：返回主页 */}
      <div className="fixed top-3 left-4 z-50">
        <Link href="/" className="text-[11px] text-[#8b4513]/60 hover:text-[#8b4513] font-kai border-b border-dashed border-[#8b4513]/30 pb-0.5">
          ← 返回主页
        </Link>
      </div>

      {/* 左侧漂浮窗：文章清单 */}
      <aside className={`fixed left-3 top-12 bottom-3 z-40 transition-all duration-200 ${panelOpen ? 'w-52' : 'w-9'}`}>
        <div className="h-full bg-white/85 backdrop-blur border border-[#8b4513]/20 rounded-xl shadow-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#8b4513]/15">
            {panelOpen && <span className="text-[11px] text-[#8b4513] font-kai tracking-widest">📜 文章清单（{total}）</span>}
            <button onClick={() => setPanelOpen(!panelOpen)} className="text-[#8b4513]/50 hover:text-[#8b4513] text-xs">
              {panelOpen ? '«' : '»'}
            </button>
          </div>
          {panelOpen && (
            <>
              <div className="px-2 pt-1.5 flex gap-1">
                <input
                  value={q}
                  onChange={e => { setQ(e.target.value); setPage(1) }}
                  placeholder="搜标题…"
                  className="flex-1 min-w-0 bg-white border border-[#8b4513]/25 rounded px-2 py-0.5 text-[11px] focus:outline-none focus:border-[#8b4513]/50"
                />
                <button
                  onClick={() => { setPoemOnly(!poemOnly); setPage(1) }}
                  className={`px-1.5 rounded text-[10px] border ${poemOnly ? 'bg-[#8b4513]/15 text-[#8b4513] border-[#8b4513]/40' : 'text-[#8b4513]/60 border-[#8b4513]/25'}`}
                >🌺</button>
              </div>
              {/* 分类标签滚动条 */}
              <div className="px-2 py-1 border-b border-[#8b4513]/10 overflow-x-auto whitespace-nowrap">
                <button
                  onClick={() => { setTagFilter(''); setPage(1) }}
                  className={`inline-block px-1.5 py-0.5 mr-1 rounded text-[10px] ${!tagFilter ? 'bg-[#8b4513]/15 text-[#8b4513]' : 'text-[#8b4513]/50 hover:bg-[#8b4513]/8'}`}
                >全部</button>
                {TAG_GROUPS.flatMap(g => g.tags).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTagFilter(tagFilter === t ? '' : t); setPage(1) }}
                    className={`inline-block px-1.5 py-0.5 mr-1 rounded text-[10px] ${tagFilter === t ? 'bg-[#8b4513]/15 text-[#8b4513]' : 'text-[#8b4513]/50 hover:bg-[#8b4513]/8'}`}
                  >{t.length > 8 ? t.slice(0, 7) + '…' : t}</button>
                ))}
              </div>
              {/* 文章列表 */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#8b4513]/8">
                {loading && <p className="p-3 text-[11px] text-[#8b4513]/50">加载中…</p>}
                {!loading && items.length === 0 && <p className="p-3 text-[11px] text-[#8b4513]/50">无匹配</p>}
                {items.map((it: any, idx: number) => (
                  <button
                    key={it.file}
                    onClick={() => openArticle(it.file)}
                    className={`w-full text-left px-2.5 py-1.5 hover:bg-[#8b4513]/5 transition-colors ${selFile === it.file ? 'bg-[#8b4513]/10 border-l-2 border-[#8b4513]' : 'border-l-2 border-transparent'}`}
                  >
                    <div className="flex items-start gap-1.5">
                      <span className="text-[10px] text-[#8b4513]/40 mt-0.5 shrink-0">{((page - 1) * size + idx + 1).toString().padStart(3, '0')}</span>
                      {it.poem && <span className="text-rose-500 text-[11px] mt-0.5 shrink-0">🌺</span>}
                      <div className="min-w-0">
                        <p className="text-[12px] leading-snug truncate font-kai">{it.poem ? it.title.replace(/^[🎋🌺]\s*/, '') : it.title}</p>
                        {it.date && <p className="text-[9px] text-[#8b4513]/40 mt-0.5">{it.date}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {/* 分页 */}
              <div className="border-t border-[#8b4513]/15 px-2 py-1.5 flex items-center justify-between text-[10px] text-[#8b4513]/60">
                <span>{page}/{totalPages}</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-1.5 py-0.5 rounded bg-white border border-[#8b4513]/20 disabled:opacity-30">←</button>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-1.5 py-0.5 rounded bg-white border border-[#8b4513]/20 disabled:opacity-30">→</button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* 右侧：全文总览 */}
      <main className={`transition-all duration-200 ${panelOpen ? 'pl-60' : 'pl-12'} pr-4 pt-12`}>
        <div className="max-w-3xl mx-auto py-6 px-4">
          {artLoading && <p className="text-[12px] text-[#8b4513]/50 font-kai">加载中…</p>}
          {!artLoading && !article && (
            <div className="text-center text-[#8b4513]/40 text-sm font-kai py-20">
              点左侧文章，细品原文
            </div>
          )}
          {!artLoading && article?.found === false && (
            <div className="text-center text-red-500 text-sm py-20">文章不存在</div>
          )}
          {!artLoading && article?.found && (
            <article>
              {/* 标题区：高端大气 */}
              <header className="mb-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-4" aria-hidden="true">
                  <span className="h-px w-12 bg-[#8b4513]/30" />
                  <span className="text-[#8b4513]/40 text-xs">{article.no || '缠中说禅'}</span>
                  <span className="h-px w-12 bg-[#8b4513]/30" />
                </div>
                <h1 className="font-brush text-3xl md:text-4xl text-[#8b4513] leading-snug tracking-widest">
                  {article.poem ? '🌺 ' : ''}{article.file.replace(/\.md$/, '').replace(/^[🎋🌺]\s*/, '')}
                </h1>
                <div className="flex items-center justify-center gap-3 mt-4 text-[11px] text-[#8b4513]/50 font-kai">
                  {article.date && <span>📅 {article.date}</span>}
                  {article.tags && article.tags.length > 0 && (
                    <span className="flex gap-1.5">
                      {article.tags.slice(0, 3).map((t: string) => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-[#8b4513]/8 border border-[#8b4513]/15">{t}</span>
                      ))}
                    </span>
                  )}
                </div>
                <div className="mx-auto mt-6 h-px w-24 bg-[#8b4513]/25" aria-hidden="true" />
              </header>
              {/* 正文（高端排版） */}
              {renderContent(article.content)}
            </article>
          )}
        </div>
      </main>
    </div>
  )
}
