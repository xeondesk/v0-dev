import { describe, expect, test } from 'bun:test'
import {
  validateMediaFile,
  formatBytes,
  mediaTypeForMime,
  isSupportedMedia,
  MAX_MEDIA_SIZE_BYTES,
  ACCEPTED_ATTACHMENT_MIME_TYPES,
  SUPPORTED_MEDIA_MIME_TYPES,
} from '@/lib/media-validation'

function fileOf(name: string, type: string, size: number) {
  return { name, type, size }
}

describe('validateMediaFile', () => {
  test('accepts a supported PNG under size limit', () => {
    const result = validateMediaFile(fileOf('hero.png', 'image/png', 1024))
    expect(result.error).toBeNull()
  })

  test('rejects files over the size limit', () => {
    const result = validateMediaFile(fileOf('huge.png', 'image/png', MAX_MEDIA_SIZE_BYTES + 1))
    expect(result.error).not.toBeNull()
    expect(result.error).toContain('attachment limit')
    if ('report' in result) expect(result.report.size).toBe(MAX_MEDIA_SIZE_BYTES + 1)
  })

  test('rejects unsupported mime types', () => {
    const result = validateMediaFile(fileOf('script.exe', 'application/x-msdownload', 100))
    expect(result.error).not.toBeNull()
    expect(result.error).toContain('not an accepted attachment type')
  })

  test('normalizes empty mime type', () => {
    const result = validateMediaFile(fileOf('noext', '', 100))
    expect(result.error).not.toBeNull()
    expect(result.error).toContain('not an accepted attachment type')
  })

  test('accepts markdown and pdf attachments', () => {
    expect(validateMediaFile(fileOf('notes.md', 'text/markdown', 100)).error).toBeNull()
    expect(validateMediaFile(fileOf('doc.pdf', 'application/pdf', 100)).error).toBeNull()
  })
})

describe('mediaTypeForMime', () => {
  test('classifies mime types', () => {
    expect(mediaTypeForMime('image/png')).toBe('image')
    expect(mediaTypeForMime('video/mp4')).toBe('video')
    expect(mediaTypeForMime('text/markdown')).toBe('document')
    expect(mediaTypeForMime('application/pdf')).toBe('document')
    expect(mediaTypeForMime('application/octet-stream')).toBe('unsupported')
  })
})

describe('isSupportedMedia', () => {
  test('checks against supported set', () => {
    expect(isSupportedMedia('image/webp')).toBe(true)
    expect(isSupportedMedia('video/webm')).toBe(true)
    expect(isSupportedMedia('text/plain')).toBe(false)
  })
})

describe('formatBytes', () => {
  test('formats bytes with units', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})

describe('constants', () => {
  test('media size limit is 10MB', () => {
    expect(MAX_MEDIA_SIZE_BYTES).toBe(10 * 1024 * 1024)
  })

  test('accepted set includes supported media', () => {
    for (const mime of SUPPORTED_MEDIA_MIME_TYPES) {
      expect(ACCEPTED_ATTACHMENT_MIME_TYPES.has(mime)).toBe(true)
    }
  })
})
