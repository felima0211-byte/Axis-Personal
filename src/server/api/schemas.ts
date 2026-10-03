import { z } from 'zod'

export const uuid = z.string().uuid()
export const idParam = z.object({ id: uuid })

const iso = z.string().datetime({ offset: true })
const csv = <T extends z.ZodTypeAny>(item: T) =>
  z.string().transform((s, ctx) => {
    const parts = s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    const results: z.infer<T>[] = []
    for (const part of parts) {
      const parsed = item.safeParse(part)
      if (!parsed.success) {
        ctx.addIssue({ code: 'custom', message: `Invalid value: ${part}` })
        return z.NEVER
      }
      results.push(parsed.data)
    }
    return results
  })
const bool = z.enum(['true', 'false']).transform((v) => v === 'true')
const page = {
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(500).optional(),
}

export const statusEnum = z.enum(['draft', 'confirmed', 'in_progress', 'done', 'archived'])
export const priorityEnum = z.enum(['low', 'normal', 'high', 'urgent'])

// seções
export const sectionCreate = z.object({
  name: z.string().trim().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  kind: z.enum(['general', 'spreadsheet']).optional(),
  sortOrder: z.number().int().optional(),
})
export const sectionPatch = sectionCreate.partial().extend({ archived: z.boolean().optional() })

// solicitantes
export const requesterCreate = z.object({
  name: z.string().trim().min(1).max(120),
  notes: z.string().max(2000).nullish(),
})
export const requesterPatch = requesterCreate.partial()
export const requesterListQuery = z.object({
  ...page,
  name: z.string().trim().max(120).optional(),
})

// tarefas
export const taskCreate = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).nullish(),
  sectionId: uuid.nullish(),
  requesterId: uuid.nullish(),
  priority: priorityEnum.optional(),
  dueAt: iso.nullish(),
  status: z.enum(['draft', 'confirmed']).optional(),
})
export const taskPatch = taskCreate
  .omit({ status: true })
  .partial()
  .extend({ status: statusEnum.optional() })
export const taskListQuery = z.object({
  ...page,
  status: csv(statusEnum).optional(),
  priority: csv(priorityEnum).optional(),
  section_id: uuid.optional(),
  requester_id: uuid.optional(),
  due_from: iso.optional(),
  due_to: iso.optional(),
})
export const confirmEdit = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    dueAt: iso.nullish(),
    sectionId: uuid.nullish(),
    priority: priorityEnum.optional(),
  })
  .optional()
export const confirmBulk = z.object({ ids: z.array(uuid).min(1).max(50) })

// lembretes
export const reminderCreate = z.object({
  title: z.string().trim().min(1).max(200),
  remindAt: iso,
  taskId: uuid.nullish(),
  sectionId: uuid.nullish(),
  recurrence: z.string().max(100).nullish(),
})
export const reminderPatch = reminderCreate.partial()
export const reminderListQuery = z.object({
  ...page,
  remind_from: iso.optional(),
  remind_to: iso.optional(),
  include_done: bool.optional(),
})

// mensagens e ingestão
export const messageListQuery = z.object({
  ...page,
  requester_id: uuid.optional(),
  extraction_status: z.enum(['pending_extraction', 'extracted', 'failed']).optional(),
})
export const ingestBody = z.object({
  text: z.string().min(1).max(20_000),
  requesterId: uuid.optional(),
  requesterName: z.string().trim().min(1).max(120).optional(),
  sectionId: uuid.optional(),
  source: z.enum(['pasted', 'whatsapp', 'email', 'other']).default('pasted'),
})
export const upcomingQuery = z.object({
  until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})
