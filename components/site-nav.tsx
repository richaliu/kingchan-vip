'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: '临江仙' },
  { href: '/article', label: '缠论原文' },
  { href: '/articles', label: '缠论全集' },
  { href: '/chanlun', label: '缠论图谱' },
  { href: '/kline', label: 'K线图' },
  { href: '/cctv', label: '新闻联播' },
  { href: '/capital', label: '资金流动' },
  { href: '/political', label: '政治基本面' },
  { href: '/fundamentals', label: '估值财务' },
]

export function Header() {
  const pathname = usePathname()
  if (pathname?.startsWith('/articles')) return null
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(250,247,240,0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e8e0d0',
      }}
    >
      <nav
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '10px 20px',
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {NAV.map((n, i) => (
          <Link
            key={n.href}
            href={n.href}
            style={{
              fontSize: i === 0 ? 20 : 15,
              fontWeight: i === 0 ? 700 : 400,
              color: i === 0 ? '#8b4513' : '#4a4a4a',
              textDecoration: 'none',
              letterSpacing: i === 0 ? 2 : 1,
              fontFamily: i === 0 ? 'var(--font-brush), serif' : 'inherit',
            }}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

export function Footer() {
  const pathname = usePathname()
  if (pathname?.startsWith('/articles')) return null
  return (
    <footer style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: 12 }}>
      浊水倾波三万里，愀然独坐孤峰。
    </footer>
  )
}
