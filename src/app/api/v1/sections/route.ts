import { route } from '@/server/api/route'
import { sectionCreate } from '@/server/api/schemas'
import { sectionsRepo } from '@/server/repositories/sections'

export const GET = route({}, async ({ db }) => ({
  items: await sectionsRepo.list(db),
  nextCursor: null,
}))

export const POST = route({ body: sectionCreate, status: 201 }, async ({ db, body, audit }) => {
  const s = await sectionsRepo.create(db, body)
  audit({ action: 'section.create', entity: 'section', entityId: s.id })
  return s
})
