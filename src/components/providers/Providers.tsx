'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }))

  useEffect(() => {
    const saved = localStorage.getItem('axis-theme') ?? 'dark'
    document.documentElement.dataset.theme = saved
  }, [])

  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
