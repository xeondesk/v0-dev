'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ArrowUpIcon, SpinnerIcon, TerminalIcon, TrashIcon } from '@/lib/icons'

type LogEntry = {
  id: string
  level: 'info' | 'success' | 'error'
  text: string
  timestamp: string
}

export function SandboxConsole({ chatId }: { chatId: string }) {
  const [command, setCommand] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'terminal' | 'logs'>('terminal')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'boot', level: 'success', text: 'Sandbox ready', timestamp: 'now' },
    { id: 'preview', level: 'info', text: 'Preview channel connected', timestamp: 'now' },
  ])

  const visibleLogs = useMemo(() => [...logs].reverse(), [logs])

  async function runCommand() {
    const nextCommand = command.trim()
    if (!nextCommand || isRunning) return

    setIsRunning(true)
    setHistory((current) => [nextCommand, ...current.filter((entry) => entry !== nextCommand)].slice(0, 20))
    setHistoryIndex(-1)
    setLogs((current) => [
      ...current,
      { id: crypto.randomUUID(), level: 'info', text: `$ ${nextCommand}`, timestamp: 'now' },
    ])

    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}/sandbox/command`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command: nextCommand }),
      })
      const result = (await response.json()) as { output?: string; message?: string; ok?: boolean }
      setLogs((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          level: response.ok && result.ok !== false ? 'success' : 'error',
          text: result.output ?? result.message ?? 'No output',
          timestamp: 'now',
        },
      ])
    } catch {
      setLogs((current) => [
        ...current,
        { id: crypto.randomUUID(), level: 'error', text: 'Unable to reach the sandbox.', timestamp: 'now' },
      ])
    } finally {
      setCommand('')
      setIsRunning(false)
    }
  }

  return (
    <section aria-label="Sandbox console" className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <TerminalIcon className="size-3.5 text-muted-foreground" />
          Sandbox
          <span className="size-1.5 rounded-full bg-emerald-500" aria-label="Connected" />
        </div>
        <Button aria-label="Clear console" onClick={() => setLogs([])} size="icon-xs" variant="ghost">
          <TrashIcon className="size-3.5" />
        </Button>
      </div>
      <div className="flex shrink-0 border-b border-border px-3">
        {(['terminal', 'logs'] as const).map((tab) => (
          <button
            aria-selected={activeTab === tab}
            className={cn(
              'border-b-2 px-3 py-2 text-xs capitalize',
              activeTab === tab ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground',
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
        {activeTab === 'logs' && visibleLogs.length === 0 ? (
          <p className="text-muted-foreground">No sandbox activity yet.</p>
        ) : activeTab === 'logs' ? (
          <div className="flex flex-col gap-2">
            {visibleLogs.map((entry) => (
              <div className="flex gap-3" key={entry.id}>
                <span className="shrink-0 text-muted-foreground">{entry.timestamp}</span>
                <span className={cn(entry.level === 'error' && 'text-destructive', entry.level === 'success' && 'text-emerald-500')}>
                  {entry.text}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleLogs.filter((entry) => entry.text.startsWith('$ ') || entry.level !== 'info').map((entry) => (
              <div className="flex gap-3" key={entry.id}>
                <span className="shrink-0 text-muted-foreground">{entry.timestamp}</span>
                <span className={cn(entry.level === 'error' && 'text-destructive', entry.level === 'success' && 'text-emerald-500')}>
                  {entry.text}
                </span>
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
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowUp' && history.length > 0) {
                  event.preventDefault()
                  const nextIndex = Math.min(historyIndex + 1, history.length - 1)
                  setHistoryIndex(nextIndex)
                  setCommand(history[nextIndex] ?? '')
                  return
                }
                if (event.key === 'ArrowDown' && historyIndex >= 0) {
                  event.preventDefault()
                  const nextIndex = historyIndex - 1
                  setHistoryIndex(nextIndex)
                  setCommand(nextIndex >= 0 ? history[nextIndex] ?? '' : '')
                  return
                }
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                  event.preventDefault()
                  void runCommand()
                }
              }}
              placeholder="Run a command in the sandbox..."
              value={command}
            />
            <Button aria-label="Run command" disabled={!command.trim() || isRunning} onClick={() => void runCommand()} size="icon-sm">
              {isRunning ? <SpinnerIcon className="animate-spin" /> : <ArrowUpIcon />}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Commands run in the chat-scoped sandbox.</p>
        </div>
      )}
    </section>
  )
}

export function ConsoleLoading() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading sandbox...</div>
}
