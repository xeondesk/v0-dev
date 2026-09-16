import { describe, expect, test } from 'bun:test'
import {
  CURRENT_DESIGN_SYSTEM,
  DESIGN_SYSTEM_TOKENS,
  isDesignSystemUnavailable,
} from '@/lib/design-system'

describe('CURRENT_DESIGN_SYSTEM', () => {
  test('is the Geist starter', () => {
    expect(CURRENT_DESIGN_SYSTEM.name).toBe('Geist Starter')
    expect(CURRENT_DESIGN_SYSTEM.source).toBe('starter')
    expect(CURRENT_DESIGN_SYSTEM.connectStatus).toBe('local-only')
  })

  test('has a token summary that sums to totalTokens', () => {
    const { tokens } = CURRENT_DESIGN_SYSTEM
    const sum =
      tokens.typographyTokens +
      tokens.colorTokens +
      tokens.spacingTokens +
      tokens.borderTokens +
      tokens.shadowTokens +
      tokens.radiusTokens
    expect(sum).toBe(tokens.totalTokens)
  })
})

describe('DESIGN_SYSTEM_TOKENS', () => {
  test('has color, typography, and spacing groups', () => {
    const names = DESIGN_SYSTEM_TOKENS.map((group) => group.name)
    expect(names).toContain('Color')
    expect(names).toContain('Typography')
    expect(names).toContain('Spacing')
  })

  test('every token has a name, value, and variable', () => {
    for (const group of DESIGN_SYSTEM_TOKENS) {
      for (const token of group.tokens) {
        expect(token.name).toBeTruthy()
        expect(token.value).toBeTruthy()
        expect(token.variable).toBeTruthy()
      }
    }
  })
})

describe('isDesignSystemUnavailable', () => {
  test('is false for the local starter', () => {
    expect(isDesignSystemUnavailable()).toBe(false)
  })
})
