import { describe, expect, test } from 'bun:test'
import {
  validateCommand,
  addToHistory,
  navigateHistory,
  isClearCommand,
  createTerminalEntry,
  formatCommandTimestamp,
  MAX_COMMAND_LENGTH,
  BLOCKED_PATTERN,
  MAX_HISTORY_SIZE,
} from '@/lib/terminal-command'

describe('validateCommand', () => {
  test('rejects empty commands', () => {
    expect(validateCommand('')).toEqual({ ok: false, reason: 'Enter a command to run.' })
    expect(validateCommand('   ')).toEqual({ ok: false, reason: 'Enter a command to run.' })
  })

  test('rejects commands exceeding max length', () => {
    const longCommand = 'a'.repeat(MAX_COMMAND_LENGTH + 1)
    expect(validateCommand(longCommand)).toEqual({
      ok: false,
      reason: `Commands are limited to ${MAX_COMMAND_LENGTH} characters.`,
    })
  })

  test('rejects blocked characters', () => {
    for (const char of [';', '&', '|', '`', '$', '<', '>']) {
      expect(validateCommand(`echo ${char} foo`)).toEqual({
        ok: false,
        reason: 'This clone only allows single, read-only sandbox commands.',
      })
    }
  })

  test('accepts valid commands', () => {
    expect(validateCommand('ls')).toEqual({ ok: true })
    expect(validateCommand('cat package.json')).toEqual({ ok: true })
    expect(validateCommand('pwd')).toEqual({ ok: true })
  })
})

describe('addToHistory', () => {
  test('prepends command and deduplicates', () => {
    expect(addToHistory(['cat', 'ls'], 'ls')).toEqual(['ls', 'cat'])
    expect(addToHistory([], 'pwd')).toEqual(['pwd'])
  })

  test('limits history size', () => {
    const full = Array.from({ length: MAX_HISTORY_SIZE }, (_, i) => `cmd-${i}`)
    const result = addToHistory(full, 'new-cmd')
    expect(result.length).toBe(MAX_HISTORY_SIZE)
    expect(result[0]).toBe('new-cmd')
  })
})

describe('navigateHistory', () => {
  const history = ['git status', 'ls -la', 'pwd']

  test('navigates up through history', () => {
    expect(navigateHistory(history, -1, 'up')).toEqual({ command: 'git status', index: 0 })
    expect(navigateHistory(history, 0, 'up')).toEqual({ command: 'ls -la', index: 1 })
    expect(navigateHistory(history, 2, 'up')).toEqual({ command: 'pwd', index: 2 }) // clamped
  })

  test('navigates down through history', () => {
    expect(navigateHistory(history, 2, 'down')).toEqual({ command: 'ls -la', index: 1 })
    expect(navigateHistory(history, 0, 'down')).toEqual({ command: '', index: -1 })
  })
})

describe('isClearCommand', () => {
  test('recognizes clear commands', () => {
    expect(isClearCommand('clear')).toBe(true)
    expect(isClearCommand('cls')).toBe(true)
    expect(isClearCommand('CLEAR')).toBe(true)
    expect(isClearCommand('  clear  ')).toBe(true)
  })

  test('rejects non-clear commands', () => {
    expect(isClearCommand('ls')).toBe(false)
    expect(isClearCommand('')).toBe(false)
  })
})

describe('createTerminalEntry', () => {
  test('creates entry with pending status', () => {
    const entry = createTerminalEntry('ls -la')
    expect(entry.command).toBe('ls -la')
    expect(entry.status).toBe('pending')
    expect(entry.output).toBeNull()
    expect(typeof entry.timestamp).toBe('number')
  })
})

describe('formatCommandTimestamp', () => {
  test('formats timestamp as HH:MM:SS', () => {
    // Use a known time for deterministic test
    const ts = new Date('2026-01-15T14:30:45').getTime()
    const result = formatCommandTimestamp(ts)
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})

describe('constants', () => {
  test('MAX_COMMAND_LENGTH is 200', () => {
    expect(MAX_COMMAND_LENGTH).toBe(200)
  })

  test('BLOCKED_PATTERN matches dangerous characters', () => {
    expect(BLOCKED_PATTERN.test('echo; rm -rf /')).toBe(true)
    expect(BLOCKED_PATTERN.test('cat file | grep')).toBe(true)
    expect(BLOCKED_PATTERN.test('echo `whoami`')).toBe(true)
    expect(BLOCKED_PATTERN.test('ls')).toBe(false)
  })
})
