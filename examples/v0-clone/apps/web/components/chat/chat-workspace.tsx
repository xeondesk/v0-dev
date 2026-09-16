'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import type { Chat, Message } from '@v0-sdk/react'
import {
  CodeEditorLoading,
  CodeEditorPane,
  type ChatFilesResult,
} from '@/components/chat/code-editor'
import { ChatHeader, type ChatView } from '@/components/chat/chat-header'
import { ChatConversation } from '@/components/chat/chat-conversation'
import { SandboxConsole, ConsoleLoading } from '@/components/console/sandbox-console'
import { PreviewPane } from '@/components/preview/preview-pane'
import { PreviewMediaStrip } from '@/components/media/media-gallery'
import { VersionsPanel } from '@/components/versions/versions-panel'
import { DesignModePanel } from '@/components/design/design-mode-panel'
import { DesignSystemPanel } from '@/components/design/design-system-panel'
import { MonitorIcon } from '@/lib/icons'
import { isMobileViewport } from '@/lib/use-mobile-viewport'

export function ChatWorkspace({
  chat,
  messages,
  filesPromise,
}: {
  chat: Chat
  messages: Message[]
  filesPromise: Promise<ChatFilesResult>
}) {
  const [view, setView] = useState<ChatView>('preview')
  const [contentRevision, setContentRevision] = useState(0)
  const [conversationRevision, setConversationRevision] = useState(0)
  const [isPreviewReady, setIsPreviewReady] = useState(false)
  const readOnly = chat.writePermission === false
  const isMobile = useIsMobileViewport()

  const handleContentChange = useCallback(() => {
    setIsPreviewReady(false)
    setContentRevision((revision) => revision + 1)
  }, [])

  const handleIterationCreated = useCallback(() => {
    handleContentChange()
    setConversationRevision((revision) => revision + 1)
  }, [handleContentChange])

  const isDesignOnMobile = view === 'design' && isMobile

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        chatId={chat.id}
        isLatest
        isReadOnly={readOnly}
        onViewChange={setView}
        title={chat.title ?? 'Untitled chat'}
        view={view}
      />
      <div className="flex min-h-0 flex-1">
        <div
          className={
            'min-h-0 w-full shrink-0 flex-col border-r border-border md:flex md:w-80 md:max-w-[42%]' +
            (view !== 'preview' || isDesignOnMobile ? ' hidden' : ' flex')
          }
        >
          <ChatConversation
            chatId={chat.id}
            messages={messages}
            onContentChange={handleIterationCreated}
            refreshKey={conversationRevision}
            vercelProjectId={chat.vercelProjectId}
          />
        </div>
        <div
          className={
            'min-w-0 flex-1 md:block' +
            (view === 'preview' && !isDesignOnMobile ? ' hidden' : ' block')
          }
        >
          {view === 'preview' ? (
            <div className="flex h-full flex-col">
              <PreviewPane
                chatId={chat.id}
                key={contentRevision}
                onReadyChange={setIsPreviewReady}
              />
              <PreviewMediaStrip chatId={chat.id} messages={messages} />
            </div>
          ) : view === 'design' ? (
            isDesignOnMobile ? (
              <DesignUnavailable />
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex min-h-0 flex-1">
                  <PreviewPane
                    chatId={chat.id}
                    key={contentRevision}
                    onReadyChange={setIsPreviewReady}
                  />
                  <DesignModePanel
                    chatId={chat.id}
                    isReadOnly={readOnly}
                    onIterationCreated={handleIterationCreated}
                    previewReady={isPreviewReady}
                  />
                </div>
                <DesignSystemPanel />
              </div>
            )
          ) : view === 'code' ? (
            <Suspense fallback={<CodeEditorLoading />}>
              <CodeEditorPane
                chatId={chat.id}
                filesPromise={filesPromise}
                isPreviewReady={isPreviewReady}
                isReadOnly={readOnly}
                key={contentRevision}
              />
            </Suspense>
          ) : view === 'console' ? (
            <Suspense fallback={<ConsoleLoading />}>
              <SandboxConsole chatId={chat.id} isReadOnly={readOnly} key={contentRevision} />
            </Suspense>
          ) : (
            <VersionsPanel
              chatId={chat.id}
              messages={messages}
              isReadOnly={readOnly}
              onRestored={handleIterationCreated}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => isMobileViewport())

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')

    const onChange = () => setIsMobile(mediaQuery.matches)

    onChange()
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

function DesignUnavailable() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <MonitorIcon className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Design mode needs a wider screen</p>
        <p className="text-xs text-muted-foreground">
          Design mode places an inspection panel beside the live preview. Resize the window to use
          it, or switch to Preview to keep iterating.
        </p>
      </div>
    </div>
  )
}
