import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Isometric Map Editor',
  description: 'Create isometric maps',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
