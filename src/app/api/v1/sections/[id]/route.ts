import { route } from '@/server/api/route'
import { idParam, sectionPatch } from '@/server/api/schemas'
import { sectionsRepo } from '@/server/repositories/sections'

export const GET = route({ params: idParam }, ({ db, params }) =>
  sectionsRepo.get(db, params.id),
)

export const PATCH = route(
  { params: idParam, body: sectionPatch },
  async ({ db, params, body, audit }) => {
    const s = await sectionsRepo.update(db, params.id, body)
    audit({ action: 'section.update', entity: 'section', entityId: s.id })
    return s
  },
)

export const DELETE = route({ params: idParam }, async ({ db, params, audit }) => {
  const s = await sectionsRepo.archive(db, params.id)
  audit({ action: 'section.archive', entity: 'section', entityId: s.id })
  return s
})
