/**
 * Pure editor state helpers for the code iteration surface.
 * Extracted so editor logic is independently testable without React.
 */

export type FileEntry = {
  path: string
  content: string
  encoding: string
}

export type EditorFileChange = {
  path: string
  original: string
  current: string
  status: 'added' | 'modified' | 'deleted'
}

export type EditorState = {
  files: FileEntry[]
  savedFiles: FileEntry[]
}

export function computeChangedFiles(state: EditorState): EditorFileChange[] {
  const changes: EditorFileChange[] = []
  for (const file of state.files) {
    if (file.encoding !== 'utf8') continue
    const saved = state.savedFiles.find((f) => f.path === file.path)
    if (!saved) {
      changes.push({
        path: file.path,
        original: '',
        current: file.content,
        status: 'added',
      })
      continue
    }
    if (saved.content !== file.content) {
      changes.push({
        path: file.path,
        original: saved.content,
        current: file.content,
        status: 'modified',
      })
    }
  }
  for (const saved of state.savedFiles) {
    if (saved.encoding !== 'utf8') continue
    if (!state.files.find((f) => f.path === saved.path)) {
      changes.push({
        path: saved.path,
        original: saved.content,
        current: '',
        status: 'deleted',
      })
    }
  }
  return changes
}

export function hasUnsavedChanges(state: EditorState): boolean {
  return computeChangedFiles(state).length > 0
}

export function languageForPath(path: string): string {
  const ext = path.split('.').pop() ?? ''
  const map: Record<string, string> = {
    tsx: 'typescript-react',
    ts: 'typescript',
    jsx: 'javascript-react',
    js: 'javascript',
    css: 'css',
    scss: 'scss',
    json: 'json',
    html: 'html',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    py: 'python',
    go: 'go',
    rs: 'rust',
    mdx: 'mdx',
  }
  return map[ext] ?? 'plaintext'
}

export function lineCount(content: string): number {
  return content.split('\n').length
}

/** Validates a proposed file path for create/rename/delete actions. */
export function validateFilePath(path: string): string | null {
  if (!path || path.trim().length === 0) return 'Path must not be empty.'
  if (path.startsWith('/') || path.startsWith('..') || path.includes('..'))
    return 'Path must be relative and must not escape the project root.'
  if (path.includes('\n') || path.includes('\r')) return 'Path must not contain newlines.'
  if (path.includes('\\') || path.includes('\t')) return 'Path contains invalid characters.'
  if (/\s{2,}/.test(path)) return 'Path must not contain multiple consecutive spaces.'
  if (/\.(git|env|env\.local|DS_Store)$/.test(path)) return 'This path is not editable.'
  return null
}

export function findInFiles(
  files: FileEntry[],
  query: string,
  currentPath: string | null,
): Array<{ path: string; line: number; column: number; lineContent: string }> {
  if (!query) return []
  const results: Array<{ path: string; line: number; column: number; lineContent: string }> = []
  const lower = query.toLowerCase()

  for (const file of files) {
    if (file.encoding !== 'utf8') continue
    if (currentPath !== null && file.path !== currentPath) continue
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const idx = lines[i].toLowerCase().indexOf(lower)
      if (idx === -1) continue
      results.push({
        path: file.path,
        line: i + 1,
        column: idx + 1,
        lineContent: lines[i],
      })
    }
  }
  return results
}
