'use client'

import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate'

export function RealtimeInit() {
  useRealtimeInvalidate()
  return null
}
