export type DesignPropertyGroup = 'typography' | 'color' | 'layout' | 'border' | 'appearance'

export type DesignChange = {
  readonly id: string
  readonly elementId: string
  readonly group: DesignPropertyGroup
  readonly property: string
  readonly value: string
}

export type DesignEdit = {
  readonly version: 1
  readonly id: string
  readonly createdAt: string
  readonly source: 'design-mode'
  readonly changes: DesignChange[]
}

export type DesignLayerModel = {
  readonly id: string
  readonly name: string
  readonly tag: string
  readonly role: string
  readonly background: string
  readonly textColor: string
  readonly fontSize: string
  readonly fontWeight: string
  readonly fontFamily: string
  readonly padding: string
  readonly gap: string
  readonly borderRadius: string
  readonly borderWidth: string
  readonly borderColor: string
  readonly textAlign: string
  readonly opacity: string
}

export const DESIGN_LAYERS: readonly DesignLayerModel[] = [
  {
    id: 'page.root',
    name: 'Page',
    tag: 'main',
    role: 'region',
    background: '--background',
    textColor: '--foreground',
    fontSize: '14px',
    fontWeight: '400',
    fontFamily: 'Geist Sans',
    padding: '0',
    gap: '0',
    borderRadius: '0',
    borderWidth: '0',
    borderColor: 'transparent',
    textAlign: 'left',
    opacity: '1',
  },
  {
    id: 'page.header',
    name: 'Header',
    tag: 'header',
    role: 'banner',
    background: '--card',
    textColor: '--foreground',
    fontSize: '14px',
    fontWeight: '500',
    fontFamily: 'Geist Sans',
    padding: '12px 16px',
    gap: '8px',
    borderRadius: '0',
    borderWidth: '0 0 1px',
    borderColor: '--border',
    textAlign: 'left',
    opacity: '1',
  },
  {
    id: 'page.buttonPrimary',
    name: 'Primary button',
    tag: 'button',
    role: 'button',
    background: '--primary',
    textColor: '--primary-foreground',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: 'Geist Sans',
    padding: '8px 16px',
    gap: '6px',
    borderRadius: '8px',
    borderWidth: '1px',
    borderColor: '--primary',
    textAlign: 'center',
    opacity: '1',
  },
  {
    id: 'page.card',
    name: 'Card',
    tag: 'article',
    role: 'article',
    background: '--card',
    textColor: '--foreground',
    fontSize: '14px',
    fontWeight: '400',
    fontFamily: 'Geist Sans',
    padding: '24px',
    gap: '12px',
    borderRadius: '12px',
    borderWidth: '1px',
    borderColor: '--border',
    textAlign: 'left',
    opacity: '1',
  },
  {
    id: 'page.heading',
    name: 'Heading',
    tag: 'h1',
    role: 'heading',
    background: 'transparent',
    textColor: '--foreground',
    fontSize: '24px',
    fontWeight: '600',
    fontFamily: 'Geist Sans',
    padding: '0',
    gap: '0',
    borderRadius: '0',
    borderWidth: '0',
    borderColor: 'transparent',
    textAlign: 'left',
    opacity: '1',
  },
  {
    id: 'page.input',
    name: 'Text input',
    tag: 'input',
    role: 'textbox',
    background: '--card',
    textColor: '--foreground',
    fontSize: '14px',
    fontWeight: '400',
    fontFamily: 'Geist Sans',
    padding: '8px 12px',
    gap: '0',
    borderRadius: '8px',
    borderWidth: '1px',
    borderColor: '--input',
    textAlign: 'left',
    opacity: '1',
  },
]

export function getDesignLayer(elementId: string): DesignLayerModel | undefined {
  return DESIGN_LAYERS.find((layer) => layer.id === elementId)
}

export function getDesignLayerByName(name: string): DesignLayerModel | undefined {
  return DESIGN_LAYERS.find((layer) => layer.name === name)
}

export const DESIGN_PROPERTY_GROUPS: Record<DesignPropertyGroup, readonly string[]> = {
  typography: ['fontSize', 'fontWeight', 'fontFamily'],
  color: ['textColor', 'background'],
  layout: ['padding', 'gap', 'textAlign'],
  border: ['borderWidth', 'borderColor', 'borderRadius'],
  appearance: ['opacity'],
}

export const DESIGN_PROPERTY_LABELS: Record<string, string> = {
  fontSize: 'Font size',
  fontWeight: 'Font weight',
  fontFamily: 'Font family',
  textColor: 'Text color',
  background: 'Background',
  padding: 'Padding',
  gap: 'Gap',
  textAlign: 'Text align',
  borderWidth: 'Border width',
  borderColor: 'Border color',
  borderRadius: 'Radius',
  opacity: 'Opacity',
}

/** Apply a single change to a copy of a layer model. */
export function applyDesignChange(layer: DesignLayerModel, change: DesignChange): DesignLayerModel {
  if (change.elementId !== layer.id) return layer

  const updaters: Partial<
    Record<string, (layer: DesignLayerModel, value: string) => DesignLayerModel>
  > = {
    fontSize: (l, v) => ({ ...l, fontSize: v }),
    fontWeight: (l, v) => ({ ...l, fontWeight: v }),
    fontFamily: (l, v) => ({ ...l, fontFamily: v }),
    textColor: (l, v) => ({ ...l, textColor: v }),
    background: (l, v) => ({ ...l, background: v }),
    padding: (l, v) => ({ ...l, padding: v }),
    gap: (l, v) => ({ ...l, gap: v }),
    textAlign: (l, v) => ({ ...l, textAlign: v }),
    borderWidth: (l, v) => ({ ...l, borderWidth: v }),
    borderColor: (l, v) => ({ ...l, borderColor: v }),
    borderRadius: (l, v) => ({ ...l, borderRadius: v }),
    opacity: (l, v) => ({ ...l, opacity: v }),
  }

  const update = updaters[change.property]
  return update ? update(layer, change.value) : layer
}

export const ALLOWED_DESIGN_EDIT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
]

export function validateDesignEditMimeType(mimeType: string): boolean {
  return ALLOWED_DESIGN_EDIT_MIME_TYPES.includes(mimeType)
}

export function serializeDesignEdit(edit: DesignEdit): string {
  const sections: string[] = []
  const order: DesignPropertyGroup[] = ['typography', 'color', 'layout', 'border', 'appearance']

  for (const group of order) {
    const changes = edit.changes.filter((change) => change.group === group)
    if (changes.length === 0) continue

    sections.push(group.toUpperCase())
    for (const change of changes) {
      const layer = getDesignLayer(change.elementId)
      const label = DESIGN_PROPERTY_LABELS[change.property] ?? change.property
      sections.push(`- ${layer?.name ?? change.elementId} ${label}: ${change.value}`)
    }
  }

  return [
    'Apply the following design changes to the current iteration:',
    '',
    ...sections,
    '',
    'Preserve existing behavior and overall layout while applying these style updates.',
  ].join('\n')
}

export function parseDesignEditText(text: string): DesignEdit | null {
  const changes: DesignChange[] = []
  const lines = text.split('\n')
  let currentGroup: DesignPropertyGroup | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const groupLabel = trimmed.toUpperCase()
    if (groupLabel === 'TYPOGRAPHY') {
      currentGroup = 'typography'
      continue
    }
    if (groupLabel === 'COLOR' || groupLabel === 'COLOUR') {
      currentGroup = 'color'
      continue
    }
    if (groupLabel === 'LAYOUT') {
      currentGroup = 'layout'
      continue
    }
    if (groupLabel === 'BORDER') {
      currentGroup = 'border'
      continue
    }
    if (groupLabel === 'APPEARANCE') {
      currentGroup = 'appearance'
      continue
    }

    if (!currentGroup || !trimmed.startsWith('-')) continue
    const content = trimmed.slice(1).trim()

    const parsed = parseChangeLine(content)
    if (!parsed || parsed.group !== currentGroup) continue

    changes.push({
      id: `${editId()}-${changes.length}`,
      elementId: parsed.layer.id,
      group: currentGroup,
      property: parsed.property,
      value: parsed.value,
    })
  }

  if (changes.length === 0) return null

  return {
    version: 1,
    id: editId(),
    createdAt: new Date().toISOString(),
    source: 'design-mode',
    changes,
  }
}

function parseChangeLine(content: string): {
  layer: DesignLayerModel
  property: string
  value: string
  group: DesignPropertyGroup
} | null {
  const entries = Object.entries(DESIGN_PROPERTY_LABELS)
    .map(([property, label]) => ({ property, label }))
    .sort((a, b) => b.label.length - a.label.length)

  for (const { property, label } of entries) {
    const marker = `${label}:`
    const markerIndex = content.indexOf(marker)
    if (markerIndex === -1) continue

    const elementName = content.slice(0, markerIndex).trim()
    const value = content.slice(markerIndex + marker.length).trim()
    const layer = getDesignLayerByName(elementName)
    if (!layer) continue

    const group = (Object.entries(DESIGN_PROPERTY_GROUPS).find(([, properties]) =>
      properties.includes(property),
    )?.[0] ?? 'appearance') as DesignPropertyGroup

    return { layer, property, value, group }
  }

  return null
}

const editId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
