import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'makeupmore',
  description: 'find your perfect makeup products',
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
