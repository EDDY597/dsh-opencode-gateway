import { afterAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { startLoopbackServer } from '../src/local/loopback.ts'
import { fetchGatewayListing } from '../src/discovery.ts'

let upstream: Server | undefined

afterAll(async () => {
  await new Promise<void>(resolve => upstream?.close(() => resolve()))
})

/** One-shot OpenAI-style listing upstream for discovery tests. */
async function startListingUpstream(payload: unknown, status = 200): Promise<number> {
  return await new Promise(resolvePromise => {
    upstream = createServer((request, response) => {
      response.statusCode = status
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify(payload))
    })
    upstream.listen(0, '127.0.0.1', () => {
      const address = upstream?.address()
      resolvePromise(typeof address === 'object' && address !== null ? address.port : 0)
    })
  })
}

describe('startLoopbackServer', () => {
  it('serves health, models and dispatches chat with the parsed body', async () => {
    const bodies: any[] = []
    const server = await startLoopbackServer({
      port: 0,
      listModels: async () => ['opencode/a', 'opencode/b'],
      handleChat: async (body, stream) => {
        bodies.push({ body, stream })
        return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } })
      },
      handleResponses: async () => new Response('{}'),
    })
    try {
      const base = `http://127.0.0.1:${server.port}`
      const health = await fetch(`${base}/health`)
      expect(health.status).toBe(200)

      const models = await fetch(`${base}/v1/models`)
      const listing = await models.json()
      expect(listing.data.map((entry: any) => entry.id)).toEqual(['opencode/a', 'opencode/b'])

      await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'opencode/a', stream: true, messages: [] }),
      })
      expect(bodies[0]?.body?.model).toBe('opencode/a')
      expect(bodies[0]?.stream).toBe(true)

      const missing = await fetch(`${base}/nope`)
      expect(missing.status).toBe(404)
    } finally {
      await server.close()
    }
  })

  it('reports 500 for a handler that throws before headers', async () => {
    const server = await startLoopbackServer({
      port: 0,
      listModels: async () => [],
      handleChat: async () => {
        throw new Error('boom')
      },
      handleResponses: async () => new Response('{}'),
    })
    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      expect(response.status).toBe(500)
      const payload = await response.json()
      expect(payload.error.message).toBe('boom')
    } finally {
      await server.close()
    }
  })
})

describe('fetchGatewayListing', () => {
  it('reads ids from an OpenAI-style listing', async () => {
    const port = await startListingUpstream({ object: 'list', data: [{ id: 'go/a' }, { id: 'go/b' }] })
    expect(await fetchGatewayListing(`http://127.0.0.1:${port}/v1`)).toEqual(['go/a', 'go/b'])
  })

  it('answers empty on non-2xx', async () => {
    const port = await startListingUpstream({ message: 'no' }, 500)
    expect(await fetchGatewayListing(`http://127.0.0.1:${port}/v1`)).toEqual([])
  })

  it('answers empty on malformed JSON', async () => {
    const port = await new Promise<number>(resolvePromise => {
      upstream = createServer((request, response) => {
        response.end('not json')
      })
      upstream.listen(0, '127.0.0.1', () => {
        const address = upstream?.address()
        resolvePromise(typeof address === 'object' && address !== null ? address.port : 0)
      })
    })
    expect(await fetchGatewayListing(`http://127.0.0.1:${port}/v1`)).toEqual([])
  })
})
