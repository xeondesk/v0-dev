import { describe, expect, test } from 'bun:test'
import {
  computeChangedFiles,
  hasUnsavedChanges,
  languageForPath,
  validateFilePath,
  findInFiles,
  lineCount,
  type FileEntry,
  type EditorFileChange,
} from '@/lib/editor-state'

const baseFiles: FileEntry[] = [
  {
    path: 'app/page.tsx',
    content: 'export default function Home() {\n return <main />\n}',
    encoding: 'utf8',
  },
  {
    path: 'app/layout.tsx',
    content: 'export default function RootLayout() {\n return <html></html>\n}',
    encoding: 'utf8',
  },
]

describe('computeChangedFiles', () => {
  test('detects modified files', () => {
    const working = [
      { ...baseFiles[0]!, content: 'export default function Home() {\n return <div />\n}' },
      baseFiles[1]!,
    ]
    const result = computeChangedFiles({ files: working, savedFiles: baseFiles })
    expect(result.length).toBe(1)
    expect(result[0]!.path).toBe('app/page.tsx')
    expect(result[0]!.status).toBe('modified')
  })

  test('returns empty list when unchanged', () => {
    expect(computeChangedFiles({ files: baseFiles, savedFiles: baseFiles })).toEqual([])
  })

  test('detects added and deleted files', () => {
    const working = [
      ...baseFiles,
      { path: 'app/new.ts', content: 'export const x = 1', encoding: 'utf8' },
    ]
    const added = computeChangedFiles({ files: working, savedFiles: baseFiles })
    expect(added.some((change) => change.path === 'app/new.ts' && change.status === 'added')).toBe(
      true,
    )

    const withDeleted = [baseFiles[1]!]
    const deleted = computeChangedFiles({ files: withDeleted, savedFiles: baseFiles })
    expect(
      deleted.some((change) => change.path === 'app/page.tsx' && change.status === 'deleted'),
    ).toBe(true)
  })
})

describe('hasUnsavedChanges', () => {
  test('returns true when content differs', () => {
    const working = [{ ...baseFiles[0]!, content: 'changed' }, baseFiles[1]!]
    expect(hasUnsavedChanges({ files: working, savedFiles: baseFiles })).toBe(true)
  })

  test('returns false when identical', () => {
    expect(hasUnsavedChanges({ files: baseFiles, savedFiles: baseFiles })).toBe(false)
  })
})

describe('languageForPath', () => {
  test('maps common extensions', () => {
    expect(languageForPath('app/page.tsx')).toBe('typescript-react')
    expect(languageForPath('app/page.ts')).toBe('typescript')
    expect(languageForPath('app/globals.css')).toBe('css')
    expect(languageForPath('package.json')).toBe('json')
    expect(languageForPath('README.md')).toBe('markdown')
    expect(languageForPath('script.py')).toBe('python')
    expect(languageForPath('index.html')).toBe('html')
  })

  test('returns plaintext for unknown extensions', () => {
    expect(languageForPath('fixture.xyz')).toBe('plaintext')
  })
})

describe('validateFilePath', () => {
  test('accepts safe relative paths', () => {
    expect(validateFilePath('app/page.tsx')).toBeNull()
    expect(validateFilePath('lib/utils.ts')).toBeNull()
  })

  test('rejects traversal and absolute paths', () => {
    expect(validateFilePath('../../etc/passwd')).not.toBeNull()
    expect(validateFilePath('/etc/passwd')).not.toBeNull()
  })

  test('rejects non-editable dotfiles', () => {
    expect(validateFilePath('.env')).not.toBeNull()
  })
})

describe('findInFiles', () => {
  test('finds matches across all files', () => {
    const result = findInFiles(baseFiles, 'Home', null)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]!.path).toBe('app/page.tsx')
    expect(result[0]!.lineContent).toContain('Home')
  })

  test('scopes to current path when provided', () => {
    const result = findInFiles(baseFiles, 'RootLayout', 'app/page.tsx')
    expect(result.filter((match) => match.path !== 'app/page.tsx')).toEqual([])
  })

  test('returns empty when no matches', () => {
    expect(findInFiles(baseFiles, 'zzznope', null)).toEqual([])
  })
})

describe('lineCount', () => {
  test('counts lines in content', () => {
    expect(lineCount('one\ntwo\nthree')).toBe(3)
    expect(lineCount('single')).toBe(1)
  })
})
