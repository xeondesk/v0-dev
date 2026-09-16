'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMessages, useRestoreMessage } from '@v0-sdk/react/swr'
import type { Message } from '@v0-sdk/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  GitBranchIcon,
  GitCommitIcon,
  ClockSmallIcon,
  ClockRewindIcon,
  CheckCircleIcon,
  InfoIcon,
  SpinnerIcon,
  WarningIcon,
  ChevronRightIcon,
  ExternalIcon,
} from '@/lib/icons'
import { diffLines, type DiffLine } from '@/lib/diff'

type VersionsPanelProps = {
  chatId: string
  messages: Message[]
  isReadOnly: boolean
  onRestored: () => void
}

type VersionEntry = {
  id: string
  label: string
  role: 'user' | 'assistant'
  createdAt: Date
  status: 'current' | 'restorable' | 'error' | 'pending'
  content: string
  summary: string
  hasCode: boolean
  finishReason: string | null
  restorable: boolean
}

export function VersionsPanel({ chatId, messages, isReadOnly, onRestored }: VersionsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compareId, setCompareId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const restoreMutation = useRestoreMessage(`/api/chats/${encodeURIComponent(chatId)}/restore`)
  const messagesUrl = `/api/chats/${encodeURIComponent(chatId)}/messages`
  const messagesQuery = useMessages(messagesUrl, { limit: 100 })

  const liveMessages = messagesQuery.data?.messages ?? messages

  const versions: VersionEntry[] = useMemo(() => {
    return liveMessages
      .filter((msg) => msg.role === 'assistant')
      .map((msg, index, all) => {
        const isLatest = index === all.length - 1
        const hasCode = msg.parts.some(
          (part) => part.type === 'file-edit' || part.type === 'file-read' || part.type === 'bash',
        )
        const finishReason = msg.finishReason
        const restorable = msg.restorable
        let status: VersionEntry['status'] = 'pending'
        if (isLatest) status = 'current'
        else if (finishReason === 'error') status = 'error'
        else if (restorable) status = 'restorable'

        return {
          id: msg.id,
          label: `Version ${index + 1}`,
          role: msg.role,
          createdAt: new Date(msg.createdAt),
          status,
          content: msg.content,
          summary: msg.content.slice(0, 120),
          hasCode,
          finishReason,
          restorable,
        }
      })
      .reverse()
  }, [liveMessages])

  const currentVersion = versions.find((v) => v.status === 'current')
  const selectedVersion = versions.find((v) => v.id === selectedId)
  const compareVersion = versions.find((v) => v.id === compareId)
  const expandedVersion = versions.find((v) => v.id === expandedId)

  const diffResult = useMemo(() => {
    if (!selectedVersion || !compareVersion) return null
    return diffLines(compareVersion.content, selectedVersion.content)
  }, [selectedVersion, compareVersion])

  const restoreToVersion = async (messageId: string) => {
    if (isReadOnly) return
    setError(null)
    setRestoring(messageId)
    try {
      await restoreMutation.trigger({ messageId })
      onRestored()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version.')
    } finally {
      setRestoring(null)
    }
  }

  useEffect(() => {
    void messagesQuery.mutate()
  }, [liveMessages.length])

  return (
    <section aria-label="Versions" className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <GitBranchIcon className="size-3.5 text-muted-foreground" />
          Versions
          <Badge className="text-[10px]" variant="secondary">
            {versions.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedVersion && compareVersion ? (
            <Button
              className="h-6 gap-1 px-1.5 text-[11px]"
              onClick={() => {
                setSelectedId(null)
                setCompareId(null)
              }}
              size="xs"
              variant="ghost"
            >
              Clear diff
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="border-b border-border px-3 py-2 text-xs text-destructive">{error}</div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 border-r border-border">
          <ScrollArea className="h-full">
            <div className="p-2">
              {versions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-muted-foreground">
                  <InfoIcon className="size-4" />
                  No versions yet. The first assistant message creates the initial version.
                </div>
              ) : (
                versions.map((version) => {
                  const isSelected = version.id === selectedId
                  const isCompare = version.id === compareId
                  const isExpanded = version.id === expandedId
                  const isRestoringThis = restoring === version.id

                  return (
                    <div className="mb-1" key={version.id}>
                      <button
                        aria-expanded={isExpanded}
                        aria-selected={isSelected}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent',
                          isSelected && 'bg-accent text-foreground',
                          isCompare && 'bg-accent/50',
                          !isSelected && !isCompare && 'text-muted-foreground',
                        )}
                        onClick={() => setSelectedId(isSelected ? null : version.id)}
                        type="button"
                      >
                        <GitCommitIcon className="size-3 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{version.label}</span>
                          <span className="block truncate text-[10px] text-muted-foreground/70">
                            {formatTimestamp(version.createdAt)}
                          </span>
                        </span>
                        {version.status === 'current' ? (
                          <Badge className="text-[9px]" variant="default">
                            Current
                          </Badge>
                        ) : version.status === 'restorable' ? (
                          <Badge className="text-[9px]" variant="outline">
                            Restorable
                          </Badge>
                        ) : version.status === 'error' ? (
                          <Badge className="text-[9px]" variant="destructive">
                            Error
                          </Badge>
                        ) : null}
                        {version.hasCode ? (
                          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                        ) : null}
                      </button>

                      {isSelected ? (
                        <div className="ml-3 mt-1 space-y-1 border-l border-border pl-2">
                          <Button
                            className="h-6 w-full gap-1 text-[11px]"
                            disabled={isReadOnly || isRestoringThis}
                            onClick={() => void restoreToVersion(version.id)}
                            size="xs"
                            variant="outline"
                          >
                            {isRestoringThis ? (
                              <SpinnerIcon className="size-3 animate-spin" />
                            ) : (
                              <ClockRewindIcon className="size-3" />
                            )}
                            {isRestoringThis ? 'Restoring…' : 'Restore'}
                          </Button>
                          {version.id !== compareId ? (
                            <Button
                              className="h-6 w-full gap-1 text-[11px]"
                              onClick={() => setCompareId(isCompare ? null : version.id)}
                              size="xs"
                              variant="ghost"
                            >
                              {isCompare ? 'Remove comparison' : 'Compare to'}
                            </Button>
                          ) : null}
                          <Button
                            className="h-6 w-full gap-1 text-[11px]"
                            onClick={() => setExpandedId(isExpanded ? null : version.id)}
                            size="xs"
                            variant="ghost"
                          >
                            {isExpanded ? 'Collapse' : 'Expand content'}
                          </Button>
                          <Button
                            className="h-6 w-full gap-1 text-[11px]"
                            onClick={() => setExpandedId(null)}
                            size="xs"
                            variant="ghost"
                          >
                            <ExternalIcon className="size-3" />
                            Open in conversation
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          {!selectedVersion && !diffResult ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <ClockSmallIcon className="size-5 text-muted-foreground/50" />
              <p>Select a version to view details or compare.</p>
              <p className="max-w-xs text-[11px] text-muted-foreground/70">
                Versions are linear. Each assistant message that produced code changes represents a
                version. Restore creates a new iteration from the chosen version.
              </p>
            </div>
          ) : null}

          {diffResult ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-medium text-foreground">Diff</h3>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>
                    <span className="text-success">+</span>{' '}
                    {diffResult.filter((d) => d.kind === 'added').length}
                  </span>
                  <span>
                    <span className="text-destructive">-</span>{' '}
                    {diffResult.filter((d) => d.kind === 'removed').length}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto rounded-md border border-border bg-editor-bg">
                {diffResult.map((line, index) => (
                  <DiffLineRow key={index} line={line} />
                ))}
              </div>
            </div>
          ) : selectedVersion ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-foreground">{selectedVersion.label}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatTimestamp(selectedVersion.createdAt)} ·{' '}
                  {selectedVersion.finishReason
                    ? `Finished (${selectedVersion.finishReason})`
                    : 'Pending'}
                  {selectedVersion.hasCode ? ' · Contains code changes' : ''}
                </p>
              </div>
              {selectedVersion.summary ? (
                <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
                  {selectedVersion.content || selectedVersion.summary}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No content summary available.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function DiffLineRow({ line }: { line: DiffLine }) {
  return (
    <div
      className={cn(
        'flex border-l-2 px-2 py-0.5 font-mono text-[11px] leading-5',
        line.kind === 'equal' && 'border-transparent text-foreground',
        line.kind === 'added' && 'border-success bg-success/5 text-success',
        line.kind === 'removed' && 'border-destructive bg-destructive/5 text-destructive',
      )}
    >
      <span className="mr-3 w-12 shrink-0 text-right text-muted-foreground/50">
        {line.kind === 'removed' ? line.lineA : line.kind === 'added' ? '' : (line.lineA ?? '')}
      </span>
      <span className="mr-3 w-12 shrink-0 text-right text-muted-foreground/50">
        {line.kind === 'added' ? line.lineB : line.kind === 'removed' ? '' : (line.lineB ?? '')}
      </span>
      <span className="whitespace-pre">
        {line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' '} {line.value}
      </span>
    </div>
  )
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
