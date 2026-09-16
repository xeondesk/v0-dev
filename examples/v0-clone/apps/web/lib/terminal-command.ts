/**
 * Client-side terminal command validation and history helpers.
 * Mirror the server route constraints in a pure function for immediate UX.
 */

export const MAX_COMMAND_LENGTH = 200
export const MAX_HISTORY_SIZE = 50
export const BLOCKED_PATTERN = /[;&|`$<>]/

export type TerminalCommandEntry = {
  command: string
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  output: string | null
  timestamp: number
}

export function validateCommand(input: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, reason: 'Enter a command to run.' }
  if (trimmed.length > MAX_COMMAND_LENGTH)
    return { ok: false, reason: `Commands are limited to ${MAX_COMMAND_LENGTH} characters.` }
  if (BLOCKED_PATTERN.test(trimmed))
    return { ok: false, reason: 'This clone only allows single, read-only sandbox commands.' }
  return { ok: true }
}

export function addToHistory(history: string[], command: string): string[] {
  const deduped = history.filter((h) => h !== command)
  return [command, ...deduped].slice(0, MAX_HISTORY_SIZE)
}

export function navigateHistory(
  history: string[],
  currentIndex: number,
  direction: 'up' | 'down',
): { command: string; index: number } {
  if (direction === 'up') {
    const next = Math.min(currentIndex + 1, history.length - 1)
    return { command: history[next] ?? '', index: next }
  }
  const next = currentIndex - 1
  return { command: next >= 0 ? (history[next] ?? '') : '', index: next }
}

export function nextCommandId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createTerminalEntry(command: string): TerminalCommandEntry {
  return {
    command,
    status: 'pending',
    output: null,
    timestamp: Date.now(),
  }
}

export function formatCommandTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour12: false })
}

export const CLEAR_COMMANDS = ['clear', 'cls'] as const

export function isClearCommand(command: string): boolean {
  const trimmed = command.trim().toLowerCase()
  return CLEAR_COMMANDS.includes(trimmed as (typeof CLEAR_COMMANDS)[number])
}
