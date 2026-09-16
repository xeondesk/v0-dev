/**
 * Minimal, dependency-free Myers-style line diff for the version compare view.
 * Pure functions only so the diff behavior can be unit-tested.
 */

export type DiffLine = {
  kind: 'equal' | 'added' | 'removed'
  value: string
  /** 1-based original line number for equal/removed lines. */
  lineA: number | null
  /** 1-based revised line number for equal/added lines. */
  lineB: number | null
}

/** Split into lines while retaining a single trailing newline as full lines. */
export function toLines(text: string): string[] {
  if (text === '') return []
  return text.split('\n')
}

/**
 * Compute a line diff (addition/removal tolerance window of 3). Returns a
 * stable, readable sequence acceptable for a compact version-compare view.
 */
export function diffLines(original: string, revised: string): DiffLine[] {
  const a = toLines(original)
  const b = toLines(revised)

  const result: DiffLine[] = []
  let i = 0
  let j = 0
  let lineA = 1
  let lineB = 1

  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      result.push({ kind: 'equal', value: a[i], lineA, lineB })
      i += 1
      j += 1
      lineA += 1
      lineB += 1
      continue
    }

    const matchAhead = findMatch(a, b, i, j)
    if (matchAhead !== -1) {
      for (let k = j; k < matchAhead; k++) {
        result.push({ kind: 'added', value: b[k], lineA: null, lineB: lineB })
        lineB += 1
      }
      j = matchAhead
      continue
    }

    const matchBehind = findMatch(b, a, j, i)
    if (matchBehind !== -1) {
      for (let k = i; k < matchBehind; k++) {
        result.push({ kind: 'removed', value: a[k], lineA, lineB: null })
        lineA += 1
      }
      i = matchBehind
      continue
    }

    if (i < a.length) {
      result.push({ kind: 'removed', value: a[i], lineA, lineB: null })
      i += 1
      lineA += 1
    } else if (j < b.length) {
      result.push({ kind: 'added', value: b[j], lineA: null, lineB: lineB })
      j += 1
      lineB += 1
    }
  }

  return result
}

function findMatch(source: string[], target: string[], sourceIndex: number, targetStart: number) {
  const window = Math.min(50, source.length - sourceIndex)
  const slice = source.slice(sourceIndex, sourceIndex + window)
  const found = target.indexOf(slice[0] ?? '', targetStart)
  if (found === -1) return -1
  return found
}
