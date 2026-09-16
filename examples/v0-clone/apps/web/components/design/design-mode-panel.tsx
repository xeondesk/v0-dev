import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  applyDesignChange,
  DESIGN_LAYERS,
  serializeDesignEdit,
  type DesignChange,
  type DesignEdit,
} from '@/lib/design-serialization'
import { CheckIcon, InspectIcon, RedoIcon, TrashIcon, UndoIcon } from '@/lib/icons'

type DesignModePanelProps = {
  chatId: string
  previewReady: boolean
  isReadOnly: boolean
  onIterationCreated: () => void
}

const initialSelection = 'page.root'

export function DesignModePanel({
  chatId,
  previewReady,
  isReadOnly,
  onIterationCreated,
}: DesignModePanelProps) {
  const [inspectEnabled, setInspectEnabled] = React.useState(true)
  const [selectedLayerId, setSelectedLayerId] = React.useState(initialSelection)
  const [changes, setChanges] = React.useState<DesignChange[]>([])
  const [past, setPast] = React.useState<DesignChange[][]>([])
  const [future, setFuture] = React.useState<DesignChange[][]>([])
  const [instruction, setInstruction] = React.useState('')
  const [applied, setApplied] = React.useState(false)
  const [applyError, setApplyError] = React.useState<string | null>(null)

  const selectedLayer = DESIGN_LAYERS.find((layer) => layer.id === selectedLayerId)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i'
      if (isCmdK) {
        event.preventDefault()
        setInspectEnabled((enabled) => !enabled)
      }
      if (event.key === 'Escape') setInspectEnabled((enabled) => (enabled ? false : enabled))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleChange = (change: DesignChange) => {
    if (isReadOnly) return
    setPast((p) => [...p, changes])
    setChanges((c) => {
      const existing = c.findIndex(
        (item) => item.elementId === change.elementId && item.property === change.property,
      )
      if (existing === -1) return [...c, change]
      const next = [...c]
      next[existing] = change
      return next
    })
    setFuture([])
    if (applied) setApplied(false)
  }

  const undo = () => {
    if (past.length === 0) return
    setFuture((f) => [changes, ...f])
    setChanges(past[past.length - 1] ?? [])
    setPast((p) => p.slice(0, -1))
    setApplied(false)
  }

  const redo = () => {
    if (future.length === 0) return
    setPast((p) => [...p, changes])
    setChanges(future[0] ?? [])
    setFuture((f) => f.slice(1))
    setApplied(false)
  }

  const reset = () => {
    if (changes.length > 0) setPast((p) => [...p, changes])
    setChanges([])
    setFuture([])
    setApplied(false)
  }

  const hasChanges = changes.length > 0
  const canApply = hasChanges && previewReady && !isReadOnly

  const apply = async () => {
    if (!canApply) return
    setApplyError(null)
    try {
      const instructionText = instruction.trim()
      const payload: DesignEdit = {
        version: 1,
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
        createdAt: new Date().toISOString(),
        source: 'design-mode',
        changes,
      }
      const serialized = serializeDesignEdit(payload)
      const message = instructionText
        ? `${serialized}\n\nAdditional instruction: ${instructionText}`
        : serialized
      const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message,
          modelConfiguration: {
            modelId: 'v0-pro',
            imageGenerations: false,
          },
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'Failed to apply design edits.')
      }
      onIterationCreated()
      setPast((p) => [...p, changes])
      setApplied(true)
      setChanges([])
      setInstruction('')
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Failed to apply design edits.')
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <InspectIcon className="size-3.5 text-muted-foreground" />
          Design mode
          <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
        </div>
        <Button
          aria-label="Toggle inspect mode (⌘/Ctrl+I)"
          aria-pressed={inspectEnabled}
          onClick={() => setInspectEnabled((enabled) => !enabled)}
          size="xs"
          variant={inspectEnabled ? 'secondary' : 'ghost'}
        >
          <InspectIcon className="size-3" />
          Inspect
        </Button>
      </div>

      {!previewReady ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">Preview is still loading.</div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border sm:flex">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
            Layers{' '}
            <span className="text-[10px] text-muted-foreground/70">({DESIGN_LAYERS.length})</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {DESIGN_LAYERS.map((layer) => {
              const dirty = changes.some((change) => change.elementId === layer.id)
              return (
                <button
                  aria-selected={layer.id === selectedLayerId}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground',
                    layer.id === selectedLayerId && 'bg-accent text-foreground',
                  )}
                  key={layer.id}
                  onClick={() => {
                    setSelectedLayerId(layer.id)
                  }}
                  type="button"
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-border" />
                  <span className="min-w-0 flex-1 truncate">{layer.name}</span>
                  {dirty ? (
                    <span
                      aria-label="Has pending changes"
                      className="size-1.5 rounded-full bg-primary"
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
          <div className="border-t border-border px-3 py-2">
            <p className="mb-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
              {selectedLayer ? `${selectedLayer.tag} · ${selectedLayer.id}` : 'No selection'}
            </p>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mesh-bg relative min-h-64 shrink-0 border-b border-border">
            <BeforeAfterStage changes={changes} selectedLayerId={selectedLayerId} />
            {inspectEnabled ? (
              <div className="absolute top-2 left-2 flex items-center gap-2 rounded-md bg-background/90 p-1 pr-2 text-[11px] shadow-xs ring-1 ring-border backdrop-blur">
                <InspectIcon className="size-3.5 text-primary" />
                Selection mode
                <kbd className="rounded-sm border border-border bg-muted px-1 font-mono text-[10px]">
                  esc
                </kbd>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1">
            {selectedLayer ? (
              <div className="flex flex-col gap-4 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-medium">{selectedLayer.name}</h2>
                    <p className="text-[11px] text-muted-foreground">
                      &lt;{selectedLayer.tag}&gt; element
                    </p>
                  </div>
                  <Badge aria-label="Change count" variant={hasChanges ? 'default' : 'outline'}>
                    {changes.filter((c) => c.elementId === selectedLayer.id).length} change
                    {changes.length === 1 ? '' : 's'}
                  </Badge>
                </div>

                <PropertyGroups
                  changes={changes}
                  onCommit={handleChange}
                  readOnly={isReadOnly}
                  selectedLayerId={selectedLayer.id}
                />
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Select a layer to edit.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Undo design change"
            disabled={past.length === 0 || isReadOnly}
            onClick={undo}
            size="icon-sm"
            title="Undo (⌘/Ctrl+Z)"
            variant="ghost"
          >
            <UndoIcon className="size-3.5" />
          </Button>
          <Button
            aria-label="Redo design change"
            disabled={future.length === 0 || isReadOnly}
            onClick={redo}
            size="icon-sm"
            title="Redo (⌘/Ctrl+Shift+Z)"
            variant="ghost"
          >
            <RedoIcon className="size-3.5" />
          </Button>
          <Button
            aria-label="Reset design changes"
            disabled={!hasChanges || isReadOnly}
            onClick={reset}
            size="icon-sm"
            title="Reset"
            variant="ghost"
          >
            <TrashIcon className="size-3.5" />
          </Button>

          <div className="min-w-0 flex-1">
            <Input
              aria-label="Design instruction"
              className="h-8 text-xs"
              disabled={isReadOnly}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Add instruction for this iteration…"
              value={instruction}
            />
          </div>

          <Button
            aria-label="Apply design changes"
            className="h-8"
            disabled={!canApply}
            onClick={() => void apply()}
            size="sm"
            title={
              isReadOnly
                ? 'This chat is read-only.'
                : !hasChanges
                  ? 'Make a design change first.'
                  : previewReady
                    ? 'Apply creates a new iteration.'
                    : 'Preview is still loading.'
            }
          >
            {applied ? <CheckIcon className="size-3.5" /> : null}
            {applied ? 'Applied' : `Apply${hasChanges ? ` (${changes.length})` : ''}`}
          </Button>
        </div>
        {applyError ? <p className="mt-2 text-xs text-destructive">{applyError}</p> : null}
      </div>
    </div>
  )
}

function BeforeAfterStage({
  changes,
  selectedLayerId,
}: {
  changes: DesignChange[]
  selectedLayerId: string
}) {
  const before = DESIGN_LAYERS.find((layer) => layer.id === 'page.root')
  const afterRoot = afterLayer('page.root', changes)
  const cardBefore = DESIGN_LAYERS.find((layer) => layer.id === 'page.buttonPrimary')
  const cardAfter = afterLayer('page.buttonPrimary', changes)
  const isSelected = (id: string) => selectedLayerId === id

  return (
    <div className="flex h-full items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Before</span>
        <div
          className={cn(
            'w-44 rounded-lg border p-3 transition-colors',
            isSelected('page.root') && 'ring-2 ring-primary/70',
          )}
          style={{
            background: before?.background ?? 'var(--background)',
            color: before?.textColor ?? 'var(--foreground)',
            fontSize: before?.fontSize,
            borderColor: before?.borderColor ?? 'var(--border)',
          }}
        >
          <div className="mb-2 h-3 w-2/3 rounded-sm bg-muted" />
          <div className="flex justify-end">
            <span
              className="rounded-md px-3 py-1.5 text-[11px]"
              style={{
                background: cardBefore?.background,
                color: cardBefore?.textColor,
                borderRadius: cardBefore?.borderRadius,
              }}
            >
              Button
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">After</span>
        <div
          className={cn(
            'w-44 rounded-lg border p-3 transition-colors',
            isSelected('page.root') && 'ring-2 ring-primary/70',
          )}
          style={{
            background: afterRoot?.background ?? 'var(--background)',
            color: afterRoot?.textColor ?? 'var(--foreground)',
            fontSize: afterRoot?.fontSize,
            borderColor: afterRoot?.borderColor ?? 'var(--border)',
          }}
        >
          <div
            className="mb-2 h-3 w-2/3 rounded-sm bg-muted"
            style={afterRoot?.gap ? { gap: afterRoot.gap } : undefined}
          />
          <div className="flex justify-end">
            <span
              className="rounded-md px-3 py-1.5 text-[11px]"
              style={{
                background: cardAfter?.background,
                color: cardAfter?.textColor,
                borderRadius: cardAfter?.borderRadius,
                borderWidth: cardAfter?.borderWidth,
                borderColor: cardAfter?.borderColor,
                padding: cardAfter?.padding,
              }}
            >
              Button
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function afterLayer(layerId: string, changes: DesignChange[]) {
  let layer = DESIGN_LAYERS.find((l) => l.id === layerId)
  if (!layer) return undefined
  for (const change of changes.filter((c) => c.elementId === layerId)) {
    layer = applyDesignChange(layer, change)
  }
  return layer
}

const PROPERTY_GROUPS = [
  { group: 'typography', label: 'Typography', properties: ['fontSize', 'fontWeight'] },
  { group: 'color', label: 'Color', properties: ['textColor', 'background'] },
  { group: 'layout', label: 'Layout', properties: ['padding', 'gap'] },
  { group: 'border', label: 'Border', properties: ['borderWidth', 'borderColor', 'borderRadius'] },
  { group: 'appearance', label: 'Appearance', properties: ['opacity'] },
] as const

function PropertyGroups({
  selectedLayerId,
  changes,
  onCommit,
  readOnly,
}: {
  selectedLayerId: string
  changes: DesignChange[]
  onCommit: (change: DesignChange) => void
  readOnly: boolean
}) {
  const layer = DESIGN_LAYERS.find((l) => l.id === selectedLayerId)
  if (!layer) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PROPERTY_GROUPS.map((group) => (
        <div
          aria-label={`${group.label} properties`}
          className="space-y-2 rounded-lg border border-border p-3"
          key={group.group}
        >
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h3>
          {group.properties.map((property) => (
            <PropertyEditor
              changes={changes}
              key={property}
              layerId={selectedLayerId}
              onCommit={onCommit}
              property={property}
              readOnly={readOnly}
              value={stringValue(layer, property)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function stringValue(layer: (typeof DESIGN_LAYERS)[number], property: string) {
  return String((layer as unknown as Record<string, string>)[property] ?? '')
}

function PropertyEditor({
  property,
  value,
  layerId,
  changes,
  onCommit,
  readOnly,
}: {
  property: string
  value: string
  layerId: string
  changes: DesignChange[]
  onCommit: (change: DesignChange) => void
  readOnly: boolean
}) {
  const labelMap: Record<string, string> = {
    fontSize: 'Font size',
    fontWeight: 'Font weight',
    textColor: 'Text color',
    background: 'Background',
    padding: 'Padding',
    gap: 'Gap',
    borderWidth: 'Border width',
    borderColor: 'Border color',
    borderRadius: 'Radius',
    opacity: 'Opacity',
  }
  const groupOf = (prop: string): DesignChange['group'] => {
    if (['fontSize', 'fontWeight'].includes(prop)) return 'typography'
    if (['textColor', 'background'].includes(prop)) return 'color'
    if (['padding', 'gap'].includes(prop)) return 'layout'
    if (['borderWidth', 'borderColor', 'borderRadius'].includes(prop)) return 'border'
    return 'appearance'
  }

  const current = changes.find(
    (change) => change.elementId === layerId && change.property === property,
  )?.value
  const shownValue = current ?? value
  const [draft, setDraft] = React.useState(shownValue)
  React.useEffect(() => setDraft(current ?? value), [current, value])

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground" htmlFor={`prop-${property}`}>
          {labelMap[property] ?? property}
        </Label>
        {property === 'textColor' || property === 'background' || property === 'borderColor' ? (
          <input
            aria-label={`${labelMap[property] ?? property} swatch`}
            className="h-5 w-6 cursor-pointer rounded border border-border"
            onChange={(event) =>
              onCommit({
                id: `${layerId}:${property}`,
                elementId: layerId,
                group: groupOf(property),
                property,
                value: event.target.value,
              })
            }
            type="color"
            value={
              shownValue.startsWith('#') ||
              shownValue.startsWith('rgb') ||
              shownValue.startsWith('oklch')
                ? shownValue
                : '#38bdf8'
            }
          />
        ) : null}
      </div>
      <Input
        aria-label={`${labelMap[property] ?? property} value`}
        className="h-7 font-mono text-[11px]"
        disabled={readOnly}
        id={`prop-${property}`}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onCommit({
              id: `${layerId}:${property}`,
              elementId: layerId,
              group: groupOf(property),
              property,
              value: draft,
            })
            ;(event.target as HTMLInputElement).blur()
          }
        }}
        onChange={(event) => setDraft(event.target.value)}
        value={draft}
      />
    </div>
  )
}
