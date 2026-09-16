'use client'

import { useEffect, useRef, useState } from 'react'
import { usePreviewProxyOrigin } from '@/components/preview/preview-proxy-provider'

export function PreviewPane({
  chatId,
  onReadyChange,
}: {
  chatId: string
  onReadyChange?: (ready: boolean) => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const previewProxyOrigin = usePreviewProxyOrigin()
  const [hasError, setHasError] = useState(false)
  const previewPath = `/api/v0-preview/${encodeURIComponent(chatId)}`
  const previewUrl = new URL(previewPath, previewProxyOrigin).toString()

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== previewProxyOrigin) return
      if (event.source !== iframeRef.current?.contentWindow) return
      if (event.data?.type !== 'v0-preview-loading') return

      onReadyChange?.(false)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onReadyChange, previewProxyOrigin])

  return (
    <div className="relative h-full w-full bg-background">
      <iframe
        className="h-full w-full bg-background"
        onError={() => {
          setHasError(true)
          onReadyChange?.(false)
        }}
        onLoad={() => {
          setHasError(false)
          onReadyChange?.(true)
        }}
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        src={previewUrl}
        title="Chat preview"
      />
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-6 text-center">
          <div className="max-w-sm">
            <p className="text-sm font-medium">Preview unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">The sandbox preview could not be reached. Open the console to inspect the session.</p>
          </div>
        </div>
      )}
    </div>
  )
}
