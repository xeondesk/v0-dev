'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  CURRENT_DESIGN_SYSTEM,
  DESIGN_SYSTEM_TOKENS,
  isDesignSystemUnavailable,
  type DesignSystemTokenSummary,
} from '@/lib/design-system'
import {
  CloudIcon,
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
  LayersIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@/lib/icons'
import { useState } from 'react'

export function DesignSystemPanel() {
  const [expanded, setExpanded] = useState(true)
  const system = CURRENT_DESIGN_SYSTEM
  const isUnavailable = isDesignSystemUnavailable()

  return (
    <div className="border-t border-border bg-background">
      <button
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded((e) => !e)}
        type="button"
      >
        <span className="flex items-center gap-1.5">
          <LayersIcon className="size-3.5" />
          Design System
        </span>
        {expanded ? (
          <ChevronDownIcon className="size-3.5" />
        ) : (
          <ChevronRightIcon className="size-3.5" />
        )}
      </button>

      {expanded ? (
        <div className="px-3 pb-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{system.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{system.description}</p>
            </div>
            <Badge variant="secondary">{system.version}</Badge>
          </div>

          <div className="mb-2 rounded-md border border-border bg-muted/40 p-2.5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <span className="text-muted-foreground">Source</span>
              <span className="text-right font-medium text-foreground capitalize">
                {system.source}
              </span>
              <span className="text-muted-foreground">Provider</span>
              <span className="text-right font-medium text-foreground">{system.provider}</span>
              <span className="text-muted-foreground">Starter</span>
              <span className="font-mono text-[10px] text-foreground">{system.starterLabel}</span>
              <span className="text-muted-foreground">Tokens</span>
              <span className="text-right font-medium text-foreground">
                {system.tokens.totalTokens}
              </span>
            </div>
          </div>

          {isUnavailable ? (
            <div className="mb-2 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-2">
              <WarningIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <div className="min-w-0 text-[11px] text-foreground">
                <p className="font-medium">Connection required</p>
                <p className="text-muted-foreground">
                  Install or connect the external design system package to access token definitions.
                  The built-in starter is available locally.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-2 flex items-center gap-1.5 text-[11px] text-success">
              <CheckCircleIcon className="size-3" />
              Tokens available locally
            </div>
          )}

          <TokenSummary summary={system.tokens} />

          <Separator className="my-2" />

          <TokenPreview groups={DESIGN_SYSTEM_TOKENS} />
        </div>
      ) : null}
    </div>
  )
}

function TokenSummary({ summary }: { summary: DesignSystemTokenSummary }) {
  const items = [
    { label: 'Typography', count: summary.typographyTokens },
    { label: 'Color', count: summary.colorTokens },
    { label: 'Spacing', count: summary.spacingTokens },
    { label: 'Border', count: summary.borderTokens },
    { label: 'Shadow', count: summary.shadowTokens },
    { label: 'Radius', count: summary.radiusTokens },
  ]

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item.label} className="gap-1 text-[10px]" variant="outline">
          {item.label}
          <span className="font-mono text-muted-foreground">{item.count}</span>
        </Badge>
      ))}
    </div>
  )
}

function TokenPreview({
  groups,
}: {
  groups: readonly {
    name: string
    tokens: readonly { name: string; value: string; variable: string }[]
  }[]
}) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  return (
    <div className="space-y-1">
      {groups.map((group) => (
        <div key={group.name}>
          <button
            className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() =>
              setExpandedGroup((current) => (current === group.name ? null : group.name))
            }
            type="button"
          >
            <span>{group.name}</span>
            <span className="text-[10px] text-muted-foreground">{group.tokens.length} tokens</span>
          </button>
          {expandedGroup === group.name ? (
            <div className="ml-2 mt-1 space-y-1">
              {group.tokens.map((token) => (
                <div
                  className="flex items-center justify-between rounded-md px-2 py-1 text-[10px] hover:bg-accent/50"
                  key={token.variable}
                >
                  <span className="text-muted-foreground">{token.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-foreground">{token.value}</span>
                    <span className="font-mono text-[9px] text-muted-foreground/70">
                      {token.variable}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
