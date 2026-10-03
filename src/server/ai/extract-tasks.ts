import 'server-only'
import { z } from 'zod'

// Anthropic API desativada — extração retorna vazio.

export class ExtractionError extends Error {}

const out = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).nullish(),
  due_at: z.string().datetime({ offset: true }).nullish().catch(undefined),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  suggested_section: z.string().trim().max(80).nullish(),
  requester_name: z.string().trim().max(120).nullish(),
  source_excerpt: z.string().trim().max(300),
  confidence: z.number().min(0).max(1),
})

export type ExtractedTask = z.infer<typeof out>

export async function extractTasks(_a: {
  text: string
  sectionNames: string[]
  tz: string
  now?: Date
}): Promise<ExtractedTask[]> {
  console.warn('[extractTasks] Anthropic API desativada. Retornando lista vazia.')
  return []
}
