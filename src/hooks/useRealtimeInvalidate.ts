'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { clientEnv } from '@/lib/env'

const TABLES = ['tasks', 'reminders', 'project_files'] as const

const queryKeyMap: Record<string, string[][]> = {
  tasks: [['tasks'], ['today'], ['upcoming'], ['projects', 'overview']],
  reminders: [['reminders'], ['today'], ['upcoming']],
  project_files: [['files'], ['projects', 'overview']],
}

export function useRealtimeInvalidate() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createBrowserClient(
      clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )

    const channel = supabase
      .channel('realtime-invalidate')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        queryKeyMap.tasks.forEach((k) => queryClient.invalidateQueries({ queryKey: k }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
        queryKeyMap.reminders.forEach((k) => queryClient.invalidateQueries({ queryKey: k }))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_files' }, () => {
        queryKeyMap.project_files.forEach((k) => queryClient.invalidateQueries({ queryKey: k }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
