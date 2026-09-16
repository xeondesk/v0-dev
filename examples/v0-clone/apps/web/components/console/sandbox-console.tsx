'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  addToHistory,
  createTerminalEntry,
  formatCommandTimestamp,
  isClearCommand,
  navigateHistory,
  validateCommand,
  type TerminalCommandEntry,
} from '@/lib/terminal-command'
import {
  ArrowUpIcon,
  CheckCircleIcon,
  CrossCircleIcon,
  PauseIcon,
  SpinnerIcon,
  TerminalIcon,
  TrashIcon,
  RewindIcon,
} from '@/lib/icons'

type SandboxConsoleProps = {
  chatId: string
  isReadOnly?: boolean
}

export function SandboxConsole({ chatId, isReadOnly = false }: SandboxConsoleProps) {
  const [command, setCommand] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'terminal' | 'logs'>('terminal')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [entries, setEntries] = useState<TerminalCommandEntry[]>([])

  const visibleEntries = useMemo(() => [...entries].reverse(), [entries])

  function logOutput(output: string, status: TerminalCommandEntry['status']) {
    setEntries((current) =>
      current.map((entry, i) => (i === current.length - 1 ? { ...entry, output, status } : entry)),
    )
  }

  async function runCommand(next = command) {
    const validation = validateCommand(next)
    if (!validation.ok || isRunning) return

    if (isClearCommand(next)) {
      setEntries([])
      setCommand('')
      setHistoryIndex(-1)
      return
    }

    setHistory((current) => addToHistory(current, next))
    setHistoryIndex(-1)
    setEntries((current) => [...current, createTerminalEntry(next)])
    setIsRunning(true)
    setCommand('')

    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}/sandbox/command`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command: next }),
      })
      const result = (await response.json()) as { output?: string; message?: string; ok?: boolean }
      const ok = response.ok && result.ok !== false
      logOutput(result.output ?? result.message ?? 'No output', ok ? 'success' : 'error')
    } catch {
      logOutput('Unable to reach the sandbox.', 'error')
    }
  }

  function rerun(entry: TerminalCommandEntry) {
    if (!isReadOnly) void runCommand(entry.command)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'ArrowUp' && history.length > 0) {
      event.preventDefault()
      const { command: next, index } = navigateHistory(history, historyIndex, 'up')
      setCommand(next)
      setHistoryIndex(index)
      return
    }
    if (event.key === 'ArrowDown' && historyIndex >= 0) {
      event.preventDefault()
      const { command: next, index } = navigateHistory(history, historyIndex, 'down')
      setCommand(next)
      setHistoryIndex(index)
      return
    }
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      event.keyCode !== 229
    ) {
      event.preventDefault()
      void runCommand()
    }
  }

  const statusClass = (status: TerminalCommandEntry['status']) =>
    cn(
      status === 'success' && 'text-success',
      status === 'error' && 'text-destructive',
      status === 'cancelled' && 'text-warning',
      status === 'running' && 'text-muted-foreground animate-pulse',
      status === 'pending' && 'text-muted-foreground',
    )

  const statusIcon = (status: TerminalCommandEntry['status']) => {
    if (status === 'success') return <CheckCircleIcon className="size-3 shrink-0 text-success" />
    if (status === 'error') return <CrossCircleIcon className="size-3 shrink-0 text-destructive" />
    if (status === 'cancelled') return <PauseIcon className="size-3 shrink-0 text-warning" />
    if (status === 'running' || status === 'pending')
      return <SpinnerIcon className="size-3 shrink-0 animate-spin" />
    return null
  }

  return (
    <section aria-label="Sandbox console" className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <TerminalIcon className="size-3.5 text-muted-foreground" />
          Sandbox
          <span aria-label="Connected" className="size-1.5 rounded-full bg-success" />
        </div>
        <div className="flex items-center gap-1">
          {isReadOnly ? (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Read-only
            </span>
          ) : null}
          <Button
            aria-label="Clear console"
            onClick={() => setEntries([])}
            size="icon-xs"
            variant="ghost"
          >
            <TrashIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex shrink-0 border-b border-border px-3">
        {(['terminal', 'logs'] as const).map((tab) => (
          <button
            aria-selected={activeTab === tab}
            className={cn(
              'border-b-2 px-3 py-2 text-xs capitalize',
              activeTab === tab
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground',
            )}
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs">
        {activeTab === 'logs' && visibleEntries.length === 0 ? (
          <p className="text-muted-foreground">No sandbox activity yet.</p>
        ) : activeTab === 'logs' ? (
          <div className="flex flex-col gap-2">
            {visibleEntries.map((entry) => (
              <div data-status={entry.status} key={entry.timestamp} role="log">
                <div className="flex gap-3">
                  <span className="shrink-0 text-muted-foreground">
                    {formatCommandTimestamp(entry.timestamp)}
                  </span>
                  <span className={statusClass(entry.status)}>
                    <span className="font-semibold">$ {entry.command}</span>
                  </span>
                  {entry.status !== 'pending' ? (
                    <RerunButton disabled={isReadOnly} onRun={() => rerun(entry)} />
                  ) : null}
                </div>
                {entry.output ? (
                  <div className="mt-1 pl-[3.5rem] text-muted-foreground">{entry.output}</div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleEntries
              .filter((entry) => entry.output !== null || entry.status === 'success')
              .map((entry) => (
                <div className="flex gap-3" data-status={entry.status} key={entry.timestamp}>
                  <span className="shrink-0 text-muted-foreground">
                    {formatCommandTimestamp(entry.timestamp)}
                  </span>
                  <span className={cn('flex items-center gap-1', statusClass(entry.status))}>
                    {statusIcon(entry.status)}
                    <span className="whitespace-pre">{entry.output ?? entry.command}</span>
                  </span>
                  {entry.status === 'error' ? (
                    <RerunButton disabled={isReadOnly} onRun={() => rerun(entry)} />
                  ) : null}
                </div>
              ))}
          </div>
        )}
      </div>
      {activeTab === 'terminal' && (
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2 rounded-md border border-border bg-muted/30 p-2">
            <Textarea
              aria-label="Sandbox command"
              className="min-h-8 resize-none border-0 bg-transparent p-1 font-mono text-xs shadow-none focus-visible:ring-0"
              disabled={isReadOnly}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Run a command in the sandbox..."
              value={command}
            />
            <Button
              aria-label="Run command"
              disabled={!command.trim() || isRunning || isReadOnly}
              onClick={() => void runCommand()}
              size="icon-sm"
            >
              {isRunning ? <SpinnerIcon className="animate-spin" /> : <ArrowUpIcon />}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Commands run in the chat-scoped sandbox.
          </p>
        </div>
      )}
    </section>
  )
}

function RerunButton({ onRun, disabled }: { onRun: () => void; disabled: boolean }) {
  return (
    <Button
      aria-label="Re-run command"
      className="h-4 px-1 text-muted-foreground hover:text-foreground"
      disabled={disabled}
      onClick={onRun}
      size="icon-xs"
      variant="ghost"
      title="Re-run"
    >
      <RewindIcon className="size-2.5" />
    </Button>
  )
}

export function ConsoleLoading() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading sandbox...
    </div>
  )
}
