import { describe, it, expect } from 'vitest'
import { startOfDay, endOfDay, nowInTz, mondayOf, localYmd } from './time'

const tz = 'America/Sao_Paulo'

describe('fuso America/Sao_Paulo', () => {
  it('limites do dia', () => {
    expect(startOfDay('2026-10-03', tz).toISOString()).toBe('2026-10-03T03:00:00.000Z')
    expect(endOfDay('2026-10-03', tz).toISOString()).toBe('2026-10-04T02:59:59.999Z')
  })
  it('agora no fuso, com offset', () => {
    expect(nowInTz(tz, new Date('2026-10-03T15:30:00Z'))).toBe('2026-10-03T12:30:00-03:00')
  })
  it('data local cruza a meia-noite UTC', () => {
    expect(localYmd(new Date('2026-10-04T01:00:00Z'), tz)).toBe('2026-10-03')
  })
  it('segunda-feira da semana', () => {
    expect(mondayOf('2026-10-03')).toBe('2026-09-28') // sábado
    expect(mondayOf('2026-09-28')).toBe('2026-09-28')
  })
})
