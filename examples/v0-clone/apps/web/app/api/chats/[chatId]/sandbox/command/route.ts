import { authorizeProxyRequest } from '@/lib/proxy'

type RouteContext = { params: Promise<{ chatId: string }> }

const SAFE_COMMANDS = new Map([
  ['pwd', '/workspace'],
  ['ls', 'app\ncomponents\npackage.json\nREADME.md'],
  ['ls -la', 'total 24\ndrwxr-xr-x 1 sandbox sandbox 4096 workspace\ndrwxr-xr-x 1 sandbox sandbox 4096 app\n-rw-r--r-- 1 sandbox sandbox  812 package.json'],
  ['node --version', 'v22.14.0'],
  ['npm --version', '10.9.2'],
  ['whoami', 'sandbox'],
])

export async function POST(request: Request, { params }: RouteContext) {
  const denied = authorizeProxyRequest(request)
  if (denied) return denied

  const { chatId } = await params
  if (!chatId) return Response.json({ message: 'A chat ID is required.' }, { status: 400 })

  const body = (await request.json().catch(() => null)) as { command?: unknown } | null
  const command = typeof body?.command === 'string' ? body.command.trim() : ''

  if (!command) return Response.json({ message: 'Enter a command to run.' }, { status: 400 })
  if (command.length > 200) return Response.json({ message: 'Commands are limited to 200 characters.' }, { status: 400 })
  if (/[;&|`$<>]/.test(command)) {
    return Response.json({ message: 'This clone only allows single, read-only sandbox commands.' }, { status: 400 })
  }

  const output = SAFE_COMMANDS.get(command)
  if (!output) {
    return Response.json({
      ok: false,
      message: `Command not available in the local sandbox adapter: ${command}`,
    }, { status: 422 })
  }

  return Response.json({ ok: true, chatId, command, output })
}
