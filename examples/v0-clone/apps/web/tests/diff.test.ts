import { describe, expect, test } from 'bun:test'
import { diffLines, toLines } from '@/lib/diff'

describe('toLines', () => {
  test('splits content into lines', () => {
    expect(toLines('a\nb\nc')).toEqual(['a', 'b', 'c'])
  })

  test('normalizes empty content to an empty list', () => {
    expect(toLines('')).toEqual([])
  })
})

describe('diffLines', () => {
  test('returns equal lines for identical content', () => {
    const result = diffLines('same', 'same')
    expect(result.map((line) => line.kind)).toEqual(['equal'])
    expect(result[0]!.value).toBe('same')
  })

  test('detects added lines', () => {
    const result = diffLines('a\nb', 'a\nb\nc')
    const added = result.filter((line) => line.kind === 'added')
    expect(added.length).toBe(1)
    expect(added[0]!.value).toBe('c')
  })

  test('detects removed lines', () => {
    const result = diffLines('a\nb\nc', 'a\nb')
    const removed = result.filter((line) => line.kind === 'removed')
    expect(removed.length).toBe(1)
    expect(removed[0]!.value).toBe('c')
  })

  test('preserves line numbers for context', () => {
    const result = diffLines('a\nb', 'a\nb\nc')
    const addedLine = result.find((line) => line.kind === 'added')
    expect(addedLine).toBeDefined()
    expect(addedLine!.lineB).toBe(3)
  })
})
