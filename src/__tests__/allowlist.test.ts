import { describe, it, expect } from 'vitest'

// Simulate the allowlist logic extracted from the login route
function isAllowedEmail(email: string, ownerEmail: string): boolean {
  return email === ownerEmail
}

describe('email allowlist', () => {
  const ownerEmail = 'owner@example.com'

  it('accepts the owner email', () => {
    expect(isAllowedEmail(ownerEmail, ownerEmail)).toBe(true)
  })

  it('rejects any other email', () => {
    expect(isAllowedEmail('attacker@evil.com', ownerEmail)).toBe(false)
    expect(isAllowedEmail('OWNER@example.com', ownerEmail)).toBe(false)
    expect(isAllowedEmail('', ownerEmail)).toBe(false)
    expect(isAllowedEmail(' owner@example.com', ownerEmail)).toBe(false)
  })
})
