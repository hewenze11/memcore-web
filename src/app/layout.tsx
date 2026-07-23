import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mnemo — 记忆女神',
  description: 'MemCore 记忆管理中心',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
