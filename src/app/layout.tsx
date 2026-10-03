import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Axis Personal',
  description: 'Painel pessoal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  )
}
