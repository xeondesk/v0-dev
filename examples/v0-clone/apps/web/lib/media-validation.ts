/**
 * Accepted media asset validation, shared by the client gallery and the
 * message route boundary. These limits match the documented prompt attachment
 * policy (images plus a small set of text formats, 10 MB max per file).
 */

export const MAX_MEDIA_SIZE_BYTES = 10 * 1024 * 1024

export type AcceptedMediaFile = {
  name: string
  contentType: string
  size: number
}

/** MIME types the media gallery renders (images and videos with player support). */
export const SUPPORTED_MEDIA_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
])

/** Accepted attachment MIME types enforced in both client and route boundary. */
export const ACCEPTED_ATTACHMENT_MIME_TYPES = new Set([
  ...SUPPORTED_MEDIA_MIME_TYPES,
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/text',
])

export type MediaValidationResult = { error: null } | { report: ValidationReport; error: string }

export type ValidationReport = {
  name: string
  inferredType: MediaType
  originalMime: string
  size: number
}

export type MediaType = 'image' | 'video' | 'document' | 'unsupported'

export function mediaTypeForMime(contentType: string): MediaType {
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.startsWith('video/')) return 'video'
  if (contentType.startsWith('text/') || contentType.endsWith('pdf')) return 'document'
  return 'unsupported'
}

export function isSupportedMedia(contentType: string): boolean {
  return SUPPORTED_MEDIA_MIME_TYPES.has(contentType)
}

export function validateMediaFile(
  file: Pick<File, 'name' | 'type' | 'size'>,
): MediaValidationResult {
  const originalMime = normalizeMime(file.type)

  if (file.size > MAX_MEDIA_SIZE_BYTES) {
    return {
      report: reportOf(file.name, originalMime, file.size),
      error: `${file.name} exceeds the ${formatBytes(MAX_MEDIA_SIZE_BYTES)} attachment limit.`,
    }
  }

  if (!ACCEPTED_ATTACHMENT_MIME_TYPES.has(originalMime)) {
    return {
      report: reportOf(file.name, originalMime, file.size),
      error: `${descriptionFor(originalMime)} is not an accepted attachment type.`,
    }
  }

  return { error: null }
}

function reportOf(name: string, mime: string, size: number): ValidationReport {
  return { name, originalMime: mime, inferredType: mediaTypeForMime(mime), size }
}

function normalizeMime(mime: string): string {
  return mime.trim().toLowerCase() || 'application/octet-stream'
}

function descriptionFor(mime: string) {
  return mime === 'application/octet-stream' ? 'This file type' : `"${mime}" files`
}

/** Human-readable byte formatting used across preview surfaces. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes
  let unit = 'B'
  for (const next of units) {
    if (value < 1024) break
    value /= 1024
    unit = next
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${unit}`
}
