import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

const ICON = { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' }

export const metadata: Metadata = {
  title: { default: 'Axis Personal', template: '%s · Axis Personal' },
  description: 'Painel pessoal de gestão integrada',
  icons: { icon: [ICON], shortcut: ICON.url, apple: [ICON] },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = { themeColor: '#000000' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
