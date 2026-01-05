import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Two Person Chat',
  description: 'Simple chat application for two people',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
