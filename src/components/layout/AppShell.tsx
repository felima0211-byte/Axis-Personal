'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { NewConversationSheet } from '@/components/conversations/NewConversationSheet'
import { CommandPalette } from '@/components/CommandPalette'
import { useKeyboard } from '@/hooks/useKeyboard'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [conversationOpen, setConversationOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useKeyboard({
    onNewConversation: () => setConversationOpen(true),
    onPalette: () => setPaletteOpen(true),
  })

  return (
    <div className="flex h-full min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar onNewConversation={() => setConversationOpen(true)} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <BottomNav onNewConversation={() => setConversationOpen(true)} />
      </div>

      {/* Global overlays */}
      <NewConversationSheet
        open={conversationOpen}
        onClose={() => setConversationOpen(false)}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
