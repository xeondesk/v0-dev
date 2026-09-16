'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  hasUnsavedChanges,
  computeChangedFiles,
  languageForPath,
  lineCount,
  validateFilePath,
  findInFiles,
  type EditorFileChange,
  type FileEntry,
} from '@/lib/editor-state'
import { cn } from '@/lib/utils'
import {
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  ExternalIcon,
  FileIcon,
  SearchIcon,
  CrossIcon,
  TerminalIcon,
  SidebarRightIcon,
  UndoIcon,
  RedoIcon,
  PlusIcon,
  TrashIcon,
  RenameIcon,
  SplitIcon,
} from '@/lib/icons'

export type EditorProps = {
  chatId: string
  files: FileEntry[]
  isPreviewReady: boolean
  isReadOnly: boolean
  onSaveRequested: (filesToSave: FileEntry[]) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}

export function CodeEditorArea({
  files,
  isPreviewReady,
  isReadOnly,
  onSaveRequested,
}: EditorProps) {
  const [workingFiles, setWorkingFiles] = useState<FileEntry[]>(files)
  const [savedFiles, setSavedFiles] = useState<FileEntry[]>(files)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [explorerOpen, setExplorerOpen] = useState(true)
  const [splitOpen, setSplitOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [officialFindResults, setOfficialFindResults] = useState<
    Array<{ path: string; line: number; column: number; lineContent: string }>
  >([])
  const [sourceId, setSourceId] = useState<number>(0)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [pendingDirty, setPendingDirty] = useState(false)
  const [applying, setApplying] = useState(false)

  const selectedFile = workingFiles.find((f) => f.path === selectedPath)
  const changedList = useMemo(
    () => computeChangedFiles({ files: workingFiles, savedFiles }),
    [workingFiles, savedFiles],
  )
  const dirty = useMemo(
    () => hasUnsavedChanges({ files: workingFiles, savedFiles }),
    [workingFiles, savedFiles],
  )
  const changedPaths = useMemo(() => new Set(changedList.map((c) => c.path)), [changedList])

  const updateSelected = (nextContent: string) => {
    if (!selectedPath || isReadOnly) return
    setWorkingFiles((current) =>
      current.map((file) =>
        file.path === selectedPath ? { ...file, content: nextContent } : file,
      ),
    )
  }

  const save = async () => {
    if (changedList.length === 0) return
    setSaveStatus('Saving…')
    setApplying(true)
    try {
      await onSaveRequested(
        changedList.map((c) => ({ path: c.path, content: c.current, encoding: 'utf8' })),
      )
      setSavedFiles(workingFiles)
      setSaveStatus('Saved')
      window.setTimeout(() => setSaveStatus(null), 2000)
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : 'Failed to save files.')
    } finally {
      setApplying(false)
    }
  }

  const reset = () => {
    setWorkingFiles(savedFiles)
    setSaveStatus(null)
  }

  const duplicate = async () => {
    if (!selectedFile) return
    const dir = selectedFile.path.includes('/')
      ? selectedFile.path.slice(0, selectedFile.path.lastIndexOf('/') + 1)
      : ''
    const baseName = selectedFile.path.split('/').pop() ?? 'file'
    const dot = baseName.lastIndexOf('.')
    const stem = dot === -1 ? baseName : baseName.slice(0, dot)
    const ext = dot === -1 ? '' : baseName.slice(dot)
    const target = `${dir}${stem}-copy${ext}`
    if (workingFiles.some((f) => f.path === target)) {
      setSaveStatus(`Copy of ${selectedFile.path} already exists.`)
      return
    }
    setWorkingFiles((current) => [...current, { ...selectedFile, path: target }])
    setSelectedPath(target)
  }

  const addFile = () => {
    const target = document.createElement('input')
    target.type = 'file'
    target.multiple = false
    target.onchange = async () => {
      const file = target.files?.[0]
      if (!file) return
      const pathError = validateFilePath(file.name)
      if (pathError) {
        setSaveStatus(pathError)
        return
      }
      const text = await file.text()
      setWorkingFiles((current) => [
        ...current,
        { path: file.name, content: text, encoding: 'utf8' },
      ])
      setSelectedPath(file.name)
    }
    target.click()
  }

  const removeFile = () => {
    if (!selectedPath) return
    setWorkingFiles((current) => current.filter((f) => f.path !== selectedPath))
    const nextFile = workingFiles.find((f) => f.path !== selectedPath)
    setSelectedPath(nextFile?.path ?? null)
  }

  const renameFile = () => {
    if (!selectedPath) return
    const nextName = window.prompt('New file path', selectedPath)
    if (!nextName || nextName === selectedPath) return
    const pathError = validateFilePath(nextName)
    if (pathError) {
      setSaveStatus(pathError)
      return
    }
    if (workingFiles.some((f) => f.path === nextName)) {
      setSaveStatus(`A file named ${nextName} already exists.`)
      return
    }
    setWorkingFiles((current) =>
      current.map((file) => (file.path === selectedPath ? { ...file, path: nextName } : file)),
    )
    setSelectedPath(nextName)
  }

  const handleFindChange = (query: string) => {
    setFindQuery(query)
    setOfficialFindResults(findInFiles(workingFiles, query, selectedPath))
  }

  const language = selectedFile ? languageForPath(selectedFile.path) : 'plaintext'

  return (
    <div className="flex h-full min-h-0 bg-editor-bg font-mono text-[13px] leading-5">
      {explorerOpen ? (
        <div className="flex w-56 shrink-0 flex-col border-r border-border bg-background">
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Files
            </span>
            <span className="text-[11px] text-muted-foreground">{workingFiles.length}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {workingFiles.map((file) => (
              <button
                aria-label={
                  changedPaths.has(file.path) ? `${file.path} (unsaved changes)` : file.path
                }
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground',
                  file.path === selectedPath && 'bg-accent text-foreground',
                )}
                key={file.path}
                onClick={() => setSelectedPath(file.path)}
                type="button"
              >
                <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    changedPaths.has(file.path) && 'text-foreground',
                  )}
                >
                  {file.path}
                </span>
                {changedPaths.has(file.path) ? (
                  <span
                    aria-label="Unsaved changes"
                    className="size-1.5 shrink-0 rounded-full bg-warning"
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
          <Button
            aria-label={explorerOpen ? 'Hide explorer' : 'Show explorer'}
            className="size-6 text-muted-foreground"
            onClick={() => setExplorerOpen((open) => !open)}
            size="icon-sm"
            title="Toggle explorer"
            variant="ghost"
          >
            <FileIcon className="size-3.5" />
          </Button>
          <div
            className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-2 py-1"
            role="group"
            aria-label="Current file"
          >
            <span
              className="truncate text-[11px] text-muted-foreground"
              title={selectedPath ?? 'No file selected'}
            >
              {selectedPath ?? 'No file selected'}
            </span>
            <span className="hidden shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground sm:inline">
              {language}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Copy file content"
                    className="size-6 text-muted-foreground"
                    disabled={!selectedFile}
                    onClick={() => {
                      if (!selectedFile) return
                      void navigator.clipboard.writeText(selectedFile.content)
                      setSaveStatus('Copied to clipboard')
                      window.setTimeout(() => setSaveStatus(null), 2000)
                    }}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <CopyIcon className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy file</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              aria-describedby="download-info"
              aria-label="Share or download file"
              className="size-6 text-muted-foreground"
              disabled={!selectedFile}
              onClick={() => {
                if (!selectedFile) return
                const blob = new Blob([selectedFile.content], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = selectedFile.path
                document.body.append(anchor)
                anchor.click()
                anchor.remove()
                window.setTimeout(() => URL.revokeObjectURL(url), 0)
              }}
              size="icon-sm"
              title="Download file"
              variant="ghost"
            >
              <DownloadIcon className="size-3.5" />
            </Button>
            <Button
              aria-label="Split editor"
              className="size-6 text-muted-foreground"
              disabled={!selectedFile}
              onClick={() => setSplitOpen((open) => !open)}
              size="icon-sm"
              title="Toggle split layout"
              variant="ghost"
            >
              <SidebarRightIcon className="size-3.5" />
            </Button>
            <Button
              aria-label="Find in file"
              aria-pressed={findOpen}
              className="size-6 text-muted-foreground"
              onClick={() => setFindOpen((open) => !open)}
              size="icon-sm"
              title="Find in current file"
              variant="ghost"
            >
              <SearchIcon className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="truncate">
            {dirty ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
                Unsaved changes
                {changedList.length > 0
                  ? ` · ${changedList.length} file${changedList.length === 1 ? '' : 's'} changed`
                  : null}
              </span>
            ) : (
              'No unsaved changes'
            )}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {saveStatus ? (
              <span
                className={cn(
                  'text-[11px]',
                  saveStatus === 'Saved' || saveStatus === 'Copied to clipboard'
                    ? 'text-success'
                    : 'text-destructive',
                )}
                role="status"
              >
                {saveStatus}
              </span>
            ) : null}
            {dirty ? (
              <Button
                className="h-5 gap-1 px-1.5 text-[11px]"
                disabled={applying}
                onClick={reset}
                size="xs"
                variant="ghost"
              >
                <UndoIcon className="size-3" />
                Reset
              </Button>
            ) : null}
            <Button
              className="h-5 gap-1 px-1.5 text-[11px]"
              disabled={!dirty || applying || !isPreviewReady || isReadOnly}
              onClick={() => void save()}
              size="xs"
              title={isPreviewReady ? 'Save changes (⌘/Ctrl+S)' : 'Preview is still loading'}
            >
              {applying ? 'Saving' : 'Save'}
            </Button>
          </div>
        </div>

        {findOpen ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2">
            <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              aria-label="Find in current file"
              autoFocus
              className="h-6 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
              onChange={(event) => handleFindChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  const next = document.getElementById('find-result-0')
                  next?.scrollIntoView({ block: 'nearest' })
                }
                if (event.key === 'Escape') setFindOpen(false)
              }}
              placeholder="Find…"
              value={findQuery}
            />
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {officialFindResults.length} match{officialFindResults.length === 1 ? '' : 'es'}
            </span>
          </div>
        ) : null}

        <div className={cn('grid min-h-0 flex-1', splitOpen ? 'grid-cols-2' : 'grid-cols-1')}>
          <EditorView
            changed={changedList.filter((c) => c.path === selectedPath)[0]}
            content={splitOpen ? selectedFile?.content : undefined}
            language={language}
            onChange={(content) => updateSelected(content)}
            readOnly={isReadOnly}
            value={selectedFile?.content ?? ''}
          />
          {splitOpen ? (
            <EditorView
              changed={changedList.filter((c) => c.path === selectedPath)[0]}
              content={splitOpen ? undefined : selectedFile?.content}
              diffMode
              language={language}
              onChange={() => {}}
              readOnly
              value={selectedFile?.content ?? ''}
            />
          ) : null}
        </div>

        <div className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-background px-3 text-[10px] text-muted-foreground">
          <span className="truncate">
            {language} · {selectedFile ? `${lineCount(selectedFile.content)} lines` : ''} ·{' '}
            {splitOpen ? 'split' : 'single'}
          </span>
          <span className="sr-only" id="download-info">
            Downloads the selected file as text.
          </span>
        </div>
      </div>
    </div>
  )
}

function EditorView({
  value,
  content,
  onChange,
  readOnly,
  language,
  changed,
  diffMode = false,
}: {
  value: string
  content?: string
  onChange: (content: string) => void
  readOnly: boolean
  language: string
  changed?: EditorFileChange
  diffMode?: boolean
}) {
  const lineNumbers = Array.from({ length: lineCount(value) }, (_, index) => index + 1)
  const ref = useRef<HTMLDivElement>(null)

  const syncScroll = () => {
    if (!ref.current) return
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="select-none bg-editor-gutter py-3 text-right">
        {lineNumbers.map((line) => (
          <div
            className="px-3 font-mono text-[11px] leading-5 text-editor-line-number"
            key={line}
            data-line={line}
          >
            {line}
          </div>
        ))}
      </div>
      <textarea
        aria-label={`Edit ${''}`}
        autoCapitalize="off"
        autoCorrect="off"
        className="min-w-0 flex-1 resize-none bg-editor-bg px-3 py-3 font-mono text-[13px] leading-5 text-editor-fg outline-none selection:bg-editor-selection placeholder:text-editor-line-number"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault()
            const target = event.currentTarget
            const start = target.selectionStart
            const end = target.selectionEnd
            const next = target.value.slice(0, start) + '  ' + target.value.slice(end)
            onChange(next)
            requestAnimationFrame(() => {
              target.selectionStart = start + 2
              target.selectionEnd = start + 2
            })
          }
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
            event.preventDefault()
            onChange(value)
          }
        }}
        placeholder="// select a file to edit"
        readOnly={readOnly}
        spellCheck={false}
        value={value}
      />
    </div>
  )
}

export type ChatFilesResult = { files: FileEntry[] } | { error: string }

export function CodeEditorPane({
  chatId,
  filesPromise,
  isPreviewReady,
  isReadOnly,
}: {
  chatId: string
  filesPromise: Promise<ChatFilesResult>
  isPreviewReady: boolean
  isReadOnly: boolean
}) {
  const { files, error } = usePromise(filesPromise)
  const [saveMirror, setSaveMirror] = useState<FileEntry[] | null>(null)

  const handleSave = async (filesToSave: FileEntry[]) => {
    const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}/files`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ files: filesToSave }),
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null
      throw new Error(body?.message ?? 'Failed to save files.')
    }
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <CodeEditorArea
      chatId={chatId}
      files={files ?? []}
      isPreviewReady={isPreviewReady}
      isReadOnly={isReadOnly}
      onSaveRequested={handleSave}
    />
  )
}

function usePromise(promise: Promise<ChatFilesResult>): {
  files: FileEntry[] | null
  error: string | null
} {
  const [state, setState] = useState<{ files: FileEntry[] | null; error: string | null }>({
    files: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    promise
      .then((result) => {
        if (cancelled) return
        if ('error' in result) {
          setState({ files: null, error: result.error })
        } else {
          setState({ files: result.files, error: null })
        }
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          files: null,
          error: err instanceof Error ? err.message : 'Failed to load files.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [promise])

  return state
}

export function CodeEditorLoading() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      <Spinner className="size-4 animate-spin" />
      Loading files…
    </div>
  )
}

function Spinner({ className }: { className?: string }) {
  return <ArrowUpIcon className={cn('rotate-180', className)} />
}
