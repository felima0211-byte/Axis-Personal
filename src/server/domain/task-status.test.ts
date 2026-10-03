import { describe, it, expect } from 'vitest'
import { assertTransition } from './task-status'

describe('transições de status', () => {
  it('permite draft → confirmed e confirmed → done', () => {
    expect(() => assertTransition('draft', 'confirmed')).not.toThrow()
    expect(() => assertTransition('confirmed', 'done')).not.toThrow()
  })
  it('bloqueia done → draft e qualquer saída de archived', () => {
    expect(() => assertTransition('done', 'draft')).toThrow()
    expect(() => assertTransition('archived', 'confirmed')).toThrow()
  })
})
