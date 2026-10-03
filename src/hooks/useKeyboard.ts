'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Options = {
  onNewConversation?: () => void
  onPalette?: () => void
}

export function useKeyboard({ onNewConversation, onPalette }: Options = {}) {
  const router = useRouter()
  const pendingKey = useRef<string | null>(null)
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target as HTMLElement).isContentEditable
      if (isInput) return

      const key = e.key

      // Ctrl/Cmd+K → command palette
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault()
        onPalette?.()
        return
      }

      // Chord: G P, G H, G R
      if (pendingKey.current === 'g') {
        if (pendingTimer.current) clearTimeout(pendingTimer.current)
        pendingKey.current = null
        if (key === 'p') { router.push('/dashboard'); return }
        if (key === 'h') { router.push('/dashboard/hoje'); return }
        if (key === 'r') { router.push('/dashboard/rascunhos'); return }
        return
      }

      if (key === 'g') {
        pendingKey.current = 'g'
        pendingTimer.current = setTimeout(() => { pendingKey.current = null }, 800)
        return
      }

      if (key === 'n' || key === 'N') { onNewConversation?.(); return }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [router, onNewConversation, onPalette])
}
