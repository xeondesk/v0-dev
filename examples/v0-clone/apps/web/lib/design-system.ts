/**
 * Design System 2.0 information model.
 * Kept informational and local — no external API calls, no persisted skills,
 * no credentials.
 */

export type DesignSystemSource = 'starter' | 'project' | 'none'
export type DesignSystemConnectStatus = 'connected' | 'local-only' | 'unavailable'

export type DesignSystemTokenSummary = {
  readonly totalTokens: number
  readonly typographyTokens: number
  readonly colorTokens: number
  readonly spacingTokens: number
  readonly borderTokens: number
  readonly shadowTokens: number
  readonly radiusTokens: number
}

export type DesignSystemMetadata = {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly source: DesignSystemSource
  readonly connectStatus: DesignSystemConnectStatus
  readonly provider: string
  readonly starterLabel: string
  readonly description: string
  readonly tokens: DesignSystemTokenSummary
  readonly connectedAt?: string
}

export const CURRENT_DESIGN_SYSTEM: DesignSystemMetadata = {
  id: 'design-system-local',
  name: 'Geist Starter',
  version: '1.0.0',
  source: 'starter',
  connectStatus: 'local-only',
  provider: 'Vercel Geist',
  starterLabel: 'geist-starter',
  description: 'Built-in warm-neutral starter theme with teal/green accents, no external packages.',
  tokens: {
    totalTokens: 56,
    typographyTokens: 12,
    colorTokens: 22,
    spacingTokens: 8,
    borderTokens: 6,
    shadowTokens: 4,
    radiusTokens: 4,
  },
}

export type TokenGroup = {
  name: string
  tokens: readonly Token[]
}

export type Token = {
  readonly name: string
  readonly value: string
  readonly variable: string
}

export const DESIGN_SYSTEM_TOKENS: readonly TokenGroup[] = [
  {
    name: 'Color',
    tokens: [
      { name: 'Background', variable: '--background', value: 'oklch(0.985 0.003 85)' },
      { name: 'Foreground', variable: '--foreground', value: 'oklch(0.21 0.012 85)' },
      { name: 'Primary', variable: '--primary', value: 'oklch(0.28 0.05 190)' },
      { name: 'Accent', variable: '--accent', value: 'oklch(0.935 0.01 170)' },
      { name: 'Muted', variable: '--muted', value: 'oklch(0.955 0.004 85)' },
      { name: 'Border', variable: '--border', value: 'oklch(0.905 0.006 85)' },
      { name: 'Destructive', variable: '--destructive', value: 'oklch(0.577 0.195 27)' },
      { name: 'Success', variable: '--success', value: 'oklch(0.6 0.11 160)' },
    ],
  },
  {
    name: 'Typography',
    tokens: [
      { name: 'Sans', variable: '--font-sans', value: 'Geist Sans' },
      { name: 'Mono', variable: '--font-mono', value: 'Geist Mono' },
      { name: 'Base', variable: 'text-size-base', value: '14px' },
      { name: 'Radius', variable: '--radius', value: '0.625rem' },
    ],
  },
  {
    name: 'Spacing',
    tokens: [
      { name: 'xs', variable: 'spacing-xs', value: '2px' },
      { name: 'sm', variable: 'spacing-sm', value: '4px' },
      { name: 'md', variable: 'spacing-md', value: '8px' },
      { name: 'lg', variable: 'spacing-lg', value: '16px' },
      { name: 'xl', variable: 'spacing-xl', value: '24px' },
    ],
  },
]

export function isDesignSystemUnavailable(): boolean {
  return CURRENT_DESIGN_SYSTEM.connectStatus === 'unavailable'
}
