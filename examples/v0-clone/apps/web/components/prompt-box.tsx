'use client'

import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputActionAddAttachments,
  usePromptInputAttachments,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import { Loader } from '@/components/ai-elements/loader'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { AVAILABLE_MODELS, MODEL_LABELS, type ModelType } from '@/lib/hooks/useSettings'
import { PlusIcon, ArrowUpIcon, ChevronDownIcon, StopIcon, V0LogoIcon } from '@/lib/icons'

export function PromptBox({
  onSubmit,
  onStop,
  isSubmitting = false,
  isStopping = false,
  isStreaming = false,
  placeholder = 'Describe what you want to build...',
  model,
  onModelChange,
  autoFocus = false,
  compact = false,
  className,
  attachmentMenu,
}: {
  onSubmit?: (text: string) => void | Promise<void>
  onStop?: () => void | Promise<void>
  isSubmitting?: boolean
  isStopping?: boolean
  isStreaming?: boolean
  placeholder?: string
  model: ModelType
  onModelChange: (model: ModelType) => void
  autoFocus?: boolean
  compact?: boolean
  className?: string
  attachmentMenu?: ReactNode
}) {
  const [draft, setDraft] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null)
  const figmaUrl = useMemo(() => draft.match(/https?:\/\/(?:www\.)?figma\.com\/[^\s]+/i)?.[0], [draft])

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim()
    const files = message.files.map((file) => file.filename).filter(Boolean)
    const attachmentContext = files.length ? `\n\nAttached files: ${files.join(', ')}` : ''
    if ((!text && files.length === 0) || !onSubmit || isSubmitting) return
    return onSubmit(`${text}${attachmentContext}`.trim())
  }

  const toggleVoice = () => {
    setVoiceError(null)
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const SpeechRecognition = (window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event: any) => setDraft((current) => `${current}${current ? ' ' : ''}${event.results[0][0].transcript}`)
    recognition.onerror = () => setVoiceError('Microphone access was unavailable.')
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  return (
    <PromptInput
      accept="image/*,.pdf,.txt,.md"
      className={cn('rounded-2xl border-border bg-card shadow-sm', className)}
      globalDrop
      maxFiles={4}
      maxFileSize={10 * 1024 * 1024}
      multiple
      onError={(error) => setVoiceError(error.message)}
      onSubmit={handleSubmit}
    >
      <PromptInputAttachments className="flex flex-wrap gap-2 px-3 pt-3">
        {(attachment) => <PromptInputAttachment data={attachment} />}
      </PromptInputAttachments>
      <PromptInputBody>
        <PromptInputTextarea
          autoFocus={autoFocus}
          onChange={(event) => setDraft(event.target.value)}
          value={draft}
          className={cn(
            'min-h-[52px] bg-transparent px-4 pt-3.5 text-base',
            compact && 'min-h-[44px] px-3 pt-3 text-sm',
          )}
          disabled={isSubmitting}
          placeholder={placeholder}
        />
      </PromptInputBody>
      {figmaUrl ? (
        <p className="px-4 pb-1 text-xs text-muted-foreground">
          Figma link detected. Import requires a connected Figma integration; the URL will be included in your prompt.
        </p>
      ) : null}
      {voiceError ? <p className="px-4 pb-1 text-xs text-destructive">{voiceError}</p> : null}
      <PromptInputFooter className="px-2 pb-2">
        <PromptInputTools>
          {attachmentMenu ?? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <PromptInputButton aria-label="Add attachment" disabled={isSubmitting}>
                  <PlusIcon className="size-4" />
                </PromptInputButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <PromptInputActionAddAttachments>Upload screenshots or files</PromptInputActionAddAttachments>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <PromptInputButton
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            disabled={isSubmitting}
            onClick={toggleVoice}
            type="button"
          >
            <span aria-hidden="true" className={cn('text-xs font-semibold', isListening && 'text-destructive')}>Aa</span>
          </PromptInputButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <PromptInputButton className="gap-1.5" disabled={isSubmitting}>
                <V0LogoIcon className="size-4" />
                <span>{MODEL_LABELS[model]}</span>
                <ChevronDownIcon className="size-3.5 text-muted-foreground" />
              </PromptInputButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {AVAILABLE_MODELS.map((m) => (
                <DropdownMenuItem key={m} onClick={() => onModelChange(m)}>
                  <V0LogoIcon className="size-4" />
                  {MODEL_LABELS[m]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </PromptInputTools>

        <PromptInputTools>
          <PromptInputSubmit
            aria-label={isStreaming ? 'Stop generating' : 'Send message'}
            className="size-8 rounded-lg"
            disabled={isStreaming ? !onStop || isStopping : !onSubmit || isSubmitting}
            onClick={isStreaming ? () => onStop?.() : undefined}
            type={isStreaming ? 'button' : 'submit'}
          >
            {isStopping || (isSubmitting && !isStreaming) ? (
              <Loader size={16} />
            ) : isStreaming ? (
              <StopIcon className="size-4" />
            ) : (
              <ArrowUpIcon className="size-4" />
            )}
          </PromptInputSubmit>
        </PromptInputTools>
      </PromptInputFooter>
    </PromptInput>
  )
}
