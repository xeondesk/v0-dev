'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatBytes, mediaTypeForMime, type MediaType } from '@/lib/media-validation'
import {
  DownloadIcon,
  FileIcon,
  ImageIcon,
  VideoIcon,
  SpinnerIcon,
  WarningIcon,
  CrossIcon,
} from '@/lib/icons'

export type AttachmentItem = {
  url: string
  name?: string
  contentType?: string
  size?: number
}

function displayName(attachment: AttachmentItem): string {
  return attachment.name ?? attachment.url.split('/').pop() ?? 'attachment'
}

function DownloadBadge({ attachment }: { attachment: AttachmentItem }) {
  return (
    <a
      aria-label={`Download ${displayName(attachment)}`}
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      download={attachment.name}
      href={attachment.url}
      rel="noreferrer"
      target="_blank"
      title="Download"
    >
      <DownloadIcon className="size-3.5" />
    </a>
  )
}

export function PreviewMediaStrip({
  messages,
}: {
  chatId: string
  messages: Array<{ attachments?: AttachmentItem[] }>
}) {
  const [videoError, setVideoError] = useState<string | null>(null)
  const attachments = useMemo(() => {
    const seen = new Set<string>()
    const all: AttachmentItem[] = []
    for (const message of messages) {
      for (const attachment of message.attachments ?? []) {
        const key = attachment.url
        if (seen.has(key)) continue
        seen.add(key)
        all.push(attachment)
      }
    }
    return all
  }, [messages])

  if (attachments.length === 0) return null

  return (
    <div className="flex min-h-0 flex-col border-t border-border bg-background">
      <div className="flex shrink-0 items-center gap-2 px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Media</span>
        <Badge className="text-[10px]" variant="secondary">
          {attachments.length}
        </Badge>
      </div>
      <div className="flex min-h-0 gap-2 overflow-x-auto px-3 pb-2">
        {attachments.map((attachment, index) => {
          const type = mediaTypeForMime(attachment.contentType ?? 'application/octet-stream')
          return (
            <div
              className="group flex w-40 shrink-0 flex-col overflow-hidden rounded-md border border-border bg-muted/40"
              key={`${attachment.url}-${index}`}
            >
              <div className="relative aspect-video w-full overflow-hidden bg-editor-bg">
                {type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={displayName(attachment)}
                    className="h-full w-full object-cover"
                    src={attachment.url}
                  />
                ) : type === 'video' ? (
                  <video
                    className="h-full w-full object-cover"
                    muted
                    preload="metadata"
                    src={attachment.url}
                    onError={() => setVideoError(attachment.url)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <FileIcon className="size-5 text-muted-foreground" />
                  </div>
                )}
                {videoError === attachment.url ? (
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-editor-bg/80 text-[10px] text-warning">
                    <WarningIcon className="size-3" />
                    Unavailable
                  </div>
                ) : null}
                <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                  <DownloadBadge attachment={attachment} />
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-2">
                <p className="truncate text-[11px] text-foreground" title={displayName(attachment)}>
                  {displayName(attachment)}
                </p>
                <div className="flex min-w-0 items-center justify-between">
                  <span className="truncate text-[10px] uppercase text-muted-foreground">
                    {type}
                  </span>
                  {attachment.size !== undefined ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatBytes(attachment.size)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MediaTypeIcon({ type }: { type: MediaType | 'unsupported' }) {
  if (type === 'image') return <ImageIcon className="size-3.5" />
  if (type === 'video') return <VideoIcon className="size-3.5" />
  if (type === 'unsupported') return <WarningIcon className="size-3.5" />
  return <FileIcon className="size-3.5" />
}

export function MediaUploadError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] text-destructive">
      <WarningIcon className="size-3 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{message}</span>
    </div>
  )
}

export function MediaUploadingButton() {
  return (
    <Button disabled size="icon" variant="outline">
      <SpinnerIcon className="size-4 animate-spin" />
      <span className="sr-only">Uploading</span>
    </Button>
  )
}

export function MediaRemoveButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      aria-label="Remove attachment"
      className={cn('text-muted-foreground hover:text-destructive')}
      disabled={disabled}
      onClick={onClick}
      size="icon"
      variant="ghost"
    >
      <CrossIcon className="size-3.5" />
    </Button>
  )
}
