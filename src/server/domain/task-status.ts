import { ApiError } from '@/server/api/errors'

export type TaskStatus = 'draft' | 'confirmed' | 'in_progress' | 'done' | 'archived'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'

const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  draft: ['confirmed', 'archived'],
  confirmed: ['in_progress', 'done', 'archived'],
  in_progress: ['confirmed', 'done', 'archived'],
  done: ['in_progress', 'archived'],
  archived: [],
}

export function assertTransition(from: TaskStatus, to: TaskStatus) {
  if (!ALLOWED[from].includes(to))
    throw new ApiError(409, 'CONFLICT', `Transição inválida: ${from} → ${to}`)
}
