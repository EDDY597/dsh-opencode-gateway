/**
 * A loopback HTTP listener that exposes an in-process {@link LocalProxy} over
 * fetch, so a pi-ai route can treat the proxy as an OpenAI-compatible
 * endpoint.
 *
 * pi-ai's transport does real HTTP against a URL; the proxy's handlers are
 * plain functions. This bridges the two the same way the gateway's own
 * `standalone.ts` does — request body buffered into a fetch `Request`, the
 * response streamed back out — with one addition: a mid-stream upstream drop
 * after the headers are flushed must destroy the socket instead of throwing
 * `ERR_HTTP_HEADERS_SENT` into the server's callback, or a stray error kills
 * the host process.
 *
 * @module dsh-opencode-gateway/loopback
 */

import { createServer, type Server } from 'node:http'

/** The in-process handlers one loopback server serves. */
export interface LoopbackOptions {
  /** Port to listen on, bound to loopback only. */
  port: number
  /** Bind address; defaults to 127.0.0.1. */
  hostname?: string
  /** Model ids the route's discovery reports. */
  listModels: () => Promise<string[]>
  /** Chat Completions handler. */
  handleChat: (body: any, stream: boolean) => Promise<Response>
  /** Responses handler. */
  handleResponses: (body: any, stream: boolean) => Promise<Response>
}

/** A running loopback listener. */
export interface LoopbackServer {
  /** The port actually bound (an ephemeral port resolves at listen time). */
  port: number
  /** Stop listening; resolved once the server closed. */
  close(): Promise<void>
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

/**
 * Start the loopback listener.
 * @param options - port plus the in-process handlers to serve.
 * @returns the running server.
 * @throws the listen error (e.g. `EADDRINUSE`) after a diagnostic log line.
 */
export function startLoopbackServer(options: LoopbackOptions): Promise<LoopbackServer> {
  const hostname = options.hostname ?? '127.0.0.1'
  const server: Server = createServer(async (request, response) => {
    try {
      const url = new URL(`http://${request.headers.host ?? `${hostname}:${options.port}`}${request.url ?? '/'}`)
      let webResponse: Response
      if (request.method === 'GET' && (url.pathname === '/v1/models' || url.pathname === '/models')) {
        const ids = await options.listModels().catch(() => [] as string[])
        webResponse = json({
          object: 'list',
          data: ids.map(id => ({ id, object: 'model', name: id })),
        })
      } else if (request.method === 'GET' && url.pathname === '/health') {
        webResponse = json({ status: 'ok' })
      } else if (request.method === 'POST' && (url.pathname === '/v1/chat/completions' || url.pathname === '/chat/completions')) {
        const body = await readBody(request)
        webResponse = await options.handleChat(body, Boolean(body?.stream))
      } else if (request.method === 'POST' && (url.pathname === '/v1/responses' || url.pathname === '/responses')) {
        const body = await readBody(request)
        webResponse = await options.handleResponses(body, Boolean(body?.stream))
      } else {
        webResponse = json({ error: { message: `No handler for ${request.method} ${url.pathname}` } }, 404)
      }
      response.statusCode = webResponse.status
      webResponse.headers.forEach((value, key) => {
        // node:http owns keep-alive and content-length for streamed bodies.
        if (key === 'transfer-encoding' || key === 'connection' || key === 'keep-alive') return
        response.setHeader(key, value)
      })
      if (webResponse.body) {
        const reader = webResponse.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          response.write(Buffer.from(value))
        }
      }
      response.end()
    } catch (error: any) {
      // A streaming upstream can drop after the headers are already flushed;
      // setting the status then throws ERR_HTTP_HEADERS_SENT, which — inside
      // this async callback — becomes an unhandled rejection. Tear the socket
      // down instead so the host process survives.
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined)
        return
      }
      response.statusCode = 500
      response.setHeader('content-type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ error: { message: error?.message ?? 'server error' } }))
    }
  })

  return new Promise((resolvePromise, rejectPromise) => {
    server.once('error', (error: any) => {
      if (error?.code === 'EADDRINUSE') {
        console.error(`opencode-gateway: loopback port ${options.port} is already in use; set "free.proxyPort" in the plugin config`)
      }
      rejectPromise(error)
    })
    server.listen(options.port, hostname, () => {
      const address = server.address()
      const boundPort = typeof address === 'object' && address !== null ? address.port : options.port
      // Never hold the host's event loop open: a headless one-shot task must
      // be able to exit after it answers, and the desktop host decides its own
      // lifetime. The listener still serves everything while the process runs.
      server.unref()
      resolvePromise({
        port: boundPort,
        close: () => new Promise<void>((resolveClose) => {
          server.close(() => resolveClose())
        }),
      })
    })
  })
}

async function readBody(request: import('node:http').IncomingMessage): Promise<any> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  if (chunks.length === 0) return undefined
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    return JSON.parse(text)
  } catch {
    const error: any = new Error('request body is not valid JSON')
    error.statusCode = 400
    throw error
  }
}
