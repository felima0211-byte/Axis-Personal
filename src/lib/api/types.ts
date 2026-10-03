export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'

export type Project = {
  id: string
  name: string
  slug: string
  color: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export type ProjectOverview = Project & {
  openTasks: number
  overdueTasks: number
  progress: number
  fileCount: number
  nextDueAt: string | null
}

export type TaskStatus = 'draft' | 'confirmed' | 'in_progress' | 'done' | 'archived'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'

export type Task = {
  id: string
  projectId: string | null
  sectionId: string | null
  requesterId: string | null
  messageId: string | null
  title: string
  description: string | null
  sourceExcerpt: string | null
  status: TaskStatus
  priority: Priority
  dueAt: string | null
  aiConfidence: number | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type Message = {
  id: string
  projectId: string | null
  requesterId: string | null
  extractionStatus: string
  source: string
  taskCount: number
  createdAt: string
}

export type ProjectFile = {
  id: string
  projectId: string
  name: string
  kind: 'upload' | 'google_sheet'
  mimeType: string | null
  sizeBytes: number | null
  syncStatus: string
  lastError: string | null
  googleSheetId: string | null
  createdAt: string
  updatedAt: string
}

export type Page<T> = {
  items: T[]
  nextCursor: string | null
}

export type TodayData = {
  overdue: Task[]
  today: { sectionName: string | null; projectName: string | null; tasks: Task[] }[]
  reminders: unknown[]
  draftCount: number
}
