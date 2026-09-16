import type { MessagesSendData } from 'v0'
import { toV0JsonResponse } from '@/lib/v0-response'
import { authorizeProxyRequest } from '@/lib/proxy'
import { v0 } from '@/lib/v0-client'
import { ACCEPTED_ATTACHMENT_MIME_TYPES, MAX_MEDIA_SIZE_BYTES } from '@/lib/media-validation'

type SendMessageBody = Pick<
  MessagesSendData['body'],
  'message' | 'modelConfiguration' | 'attachments'
>

function validateAttachments(attachments: unknown): string | null {
  if (!Array.isArray(attachments)) return 'attachments must be an array.'
  if (attachments.length > 5) return 'Attachments are limited to 5 per message.'

  for (const attachment of attachments) {
    if (typeof attachment !== 'object' || attachment === null) {
      return 'Each attachment must be an object.'
    }
    const item = attachment as Record<string, unknown>

    if (typeof item.url === 'string' && item.url) {
      const contentType = typeof item.contentType === 'string' ? item.contentType : undefined
      if (contentType && !ACCEPTED_ATTACHMENT_MIME_TYPES.has(contentType)) {
        return `${contentType} attachments are not allowed.`
      }
      if (typeof item.size === 'number' && item.size > MAX_MEDIA_SIZE_BYTES) {
        return 'Attachments are limited to 10MB.'
      }
      continue
    }

    if (typeof item.content === 'string' && item.content) {
      if (item.content.length > 50_000) return 'Inline attachments are limited to 50KB.'
      continue
    }

    return 'Each attachment needs a URL or inline content.'
  }

  return null
}

export async function GET(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied
  const { chatId } = await params
  const searchParams = new URL(request.url).searchParams
  const limit = Number(searchParams.get('limit') ?? 20)

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return Response.json({ message: 'limit must be between 1 and 100.' }, { status: 400 })
  }

  const result = await v0.messages.list({
    chatId,
    limit,
    ...(searchParams.get('cursor') ? { cursor: searchParams.get('cursor')! } : {}),
  })

  return toV0JsonResponse(result)
}

export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied
  const { chatId } = await params
  const body = (await request.json().catch(() => null)) as SendMessageBody | null

  if (typeof body?.message !== 'string' || !body.message.trim()) {
    return Response.json({ message: 'Enter a message.' }, { status: 400 })
  }

  if (body.attachments !== undefined) {
    const attachmentError = validateAttachments(body.attachments)
    if (attachmentError) {
      return Response.json({ message: attachmentError }, { status: 400 })
    }
  }

  const result = await v0.messages.sendStream({
    chatId,
    message: body.message.trim(),
    modelConfiguration: body.modelConfiguration,
    attachments: body.attachments,
  })

  return result.toResponse()
}
