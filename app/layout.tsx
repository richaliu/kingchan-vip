import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Noto_Serif_SC, Ma_Shan_Zheng } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif-sc',
})

const maShanZheng = Ma_Shan_Zheng({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-brush',
})

export const metadata: Metadata = {
  title: '临江仙',
  description: '浊水倾波三万里，愀然独坐孤峰。',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#faf7f0',
}

const NAV = [
  { href: '/', label: '临江仙' },
  { href: '/article', label: '缠论原文' },
  { href: '/articles', label: '缠论全集' },
  { href: '/chanlun', label: '缠论图谱' },
  { href: '/kline', label: 'K线图' },
  { href: '/capital', label: '资金流动' },
  { href: '/political', label: '政治基本面' },
  { href: '/fundamentals', label: '估值财务' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSerifSC.variable} ${maShanZheng.variable} font-serif`}>
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
        {children}
        <footer style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: 12 }}>
          浊水倾波三万里，愀然独坐孤峰。
        </footer>
      </body>
    </html>
  )
}
