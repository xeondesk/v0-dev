import { describe, expect, test } from 'bun:test'
import {
  serializeDesignEdit,
  parseDesignEditText,
  applyDesignChange,
  getDesignLayer,
  getDesignLayerByName,
  DESIGN_LAYERS,
  DESIGN_PROPERTY_GROUPS,
  DESIGN_PROPERTY_LABELS,
  type DesignChange,
  type DesignEdit,
} from '@/lib/design-serialization'

function makeEdit(changes: DesignChange[]): DesignEdit {
  return {
    version: 1,
    id: 'test-edit-1',
    createdAt: '2026-01-15T00:00:00Z',
    source: 'design-mode',
    changes,
  }
}

function makeChange(overrides: Partial<DesignChange> = {}): DesignChange {
  return {
    id: 'change-1',
    elementId: 'page.root',
    group: 'typography',
    property: 'fontSize',
    value: '16px',
    ...overrides,
  }
}

describe('DESIGN_LAYERS', () => {
  test('has 6 layers', () => {
    expect(DESIGN_LAYERS.length).toBe(6)
  })

  test('all layers have required fields', () => {
    for (const layer of DESIGN_LAYERS) {
      expect(layer.id).toBeTruthy()
      expect(layer.name).toBeTruthy()
      expect(layer.tag).toBeTruthy()
      expect(typeof layer.background).toBe('string')
    }
  })
})

describe('getDesignLayer', () => {
  test('finds layer by id', () => {
    expect(getDesignLayer('page.root')).toBe(DESIGN_LAYERS[0])
  })

  test('returns undefined for unknown id', () => {
    expect(getDesignLayer('nonexistent')).toBeUndefined()
  })
})

describe('getDesignLayerByName', () => {
  test('finds layer by name', () => {
    expect(getDesignLayerByName('Header')).toBe(DESIGN_LAYERS[1])
  })

  test('returns undefined for unknown name', () => {
    expect(getDesignLayerByName('Unknown')).toBeUndefined()
  })
})

describe('applyDesignChange', () => {
  test('applies property change to matching layer', () => {
    const layer = DESIGN_LAYERS[0]!
    const change = makeChange({ elementId: layer.id, property: 'fontSize', value: '20px' })
    const result = applyDesignChange(layer, change)
    expect(result.fontSize).toBe('20px')
    expect(result.id).toBe(layer.id) // original layer unchanged reference
  })

  test('returns unchanged layer for non-matching element', () => {
    const layer = DESIGN_LAYERS[0]!
    const change = makeChange({ elementId: 'page.header', property: 'fontSize', value: '20px' })
    const result = applyDesignChange(layer, change)
    expect(result).toBe(layer) // same reference
  })
})

describe('serializeDesignEdit', () => {
  test('serializes single group changes', () => {
    const edit = makeEdit([
      makeChange({
        group: 'typography',
        property: 'fontSize',
        value: '20px',
        elementId: 'page.root',
      }),
    ])
    const result = serializeDesignEdit(edit)
    expect(result).toContain('TYPOGRAPHY')
    expect(result).toContain('Page Font size: 20px')
    expect(result).toContain('Apply the following design changes')
  })

  test('serializes multiple groups', () => {
    const edit = makeEdit([
      makeChange({
        group: 'typography',
        property: 'fontSize',
        value: '20px',
        elementId: 'page.root',
      }),
      makeChange({
        id: 'change-2',
        group: 'color',
        property: 'textColor',
        value: 'red',
        elementId: 'page.root',
      }),
    ])
    const result = serializeDesignEdit(edit)
    expect(result).toContain('TYPOGRAPHY')
    expect(result).toContain('COLOR')
  })
})

describe('parseDesignEditText', () => {
  test('parses serialized edit text back', () => {
    const edit = makeEdit([
      makeChange({
        group: 'typography',
        property: 'fontSize',
        value: '20px',
        elementId: 'page.root',
      }),
    ])
    const text = serializeDesignEdit(edit)
    const parsed = parseDesignEditText(text)
    expect(parsed).not.toBeNull()
    expect(parsed!.changes.length).toBe(1)
    expect(parsed!.changes[0]!.elementId).toBe('page.root')
    expect(parsed!.changes[0]!.property).toBe('fontSize')
    expect(parsed!.changes[0]!.value).toBe('20px')
  })

  test('returns null for empty text', () => {
    expect(parseDesignEditText('')).toBeNull()
  })
})

describe('DESIGN_PROPERTY_GROUPS', () => {
  test('has 5 property groups', () => {
    const keys = Object.keys(DESIGN_PROPERTY_GROUPS)
    expect(keys.length).toBe(5)
    expect(keys).toContain('typography')
    expect(keys).toContain('color')
    expect(keys).toContain('layout')
    expect(keys).toContain('border')
    expect(keys).toContain('appearance')
  })
})

describe('DESIGN_PROPERTY_LABELS', () => {
  test('has labels for known properties', () => {
    expect(DESIGN_PROPERTY_LABELS['fontSize']).toBe('Font size')
    expect(DESIGN_PROPERTY_LABELS['background']).toBe('Background')
    expect(DESIGN_PROPERTY_LABELS['padding']).toBe('Padding')
  })
})
