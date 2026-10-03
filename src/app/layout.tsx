import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers/Providers'

export const metadata: Metadata = {
  title: { default: 'Axis Personal', template: '%s · Axis Personal' },
  description: 'Painel pessoal de gestão integrada',
  icons: {
    icon: '/brand/icon-512.png',
    shortcut: '/brand/icon-512.png',
    apple: '/brand/icon-512.png',
  },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = { themeColor: '#000000' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
