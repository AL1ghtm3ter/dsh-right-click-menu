/**
 * Host half of `dsh-right-click-menu`.
 *
 * The browser half needs four facts the composed Session Remotes do not offer:
 * whether an arbitrary path exists, the text of a file for the "copy file
 * contents" row, the raw bytes of a file for "save as", and a way to write a
 * copy somewhere else. This half serves exactly those operations over
 * `webServer` routes under `/dsh-right-click-menu`, and nothing else.
 *
 * Security follows the shipped `dsh-host-open-in-app` posture: every route asks
 * the composition's `connection` service for a rejection first (Host/Origin
 * fence plus browser authentication), then validates method, media type, a
 * 64 KiB body ceiling, and absolute-path fields before touching the filesystem.
 * Node built-ins are the only imports, so the package resolves with no
 * dependency on the app's own `@deepseek-ai/*` graph.
 */
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, isAbsolute } from 'node:path'

/** Cordis function-plugin name. */
export const name = 'right-click-menu'

/** Route prefix owned by this plugin; every path below sits under it. */
const ROUTE_BASE = '/dsh-right-click-menu'

/** Request bodies here are tiny JSON objects; anything larger is hostile. */
const MAX_BODY_BYTES = 64 * 1024

/** Bytes read for the "copy file contents" row before the text is marked truncated. */
const MAX_READ_BYTES = 1024 * 1024

/** Content types for the raw byte route; anything else is opaque. */
const CONTENT_TYPES = {  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.tsx': 'text/plain; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8'
}

/** JSON response: live filesystem facts, so never cached. */
function sendJson(res, status, payload) {  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/** 405 with the route's one supported method. */
function sendMethodNotAllowed(res, allow) {
  res.statusCode = 405
  res.setHeader('allow', allow)
  res.end()
}

/**
 * Collect a bounded request body as UTF-8 text.
 * @returns the text, `null` past the ceiling (stream drained), or `undefined`
 * when the stream failed mid-body.
 */
async function readBoundedBody(req) {
  const chunks = []
  let size = 0
  try {
    for await (const chunk of req) {
      size += chunk.byteLength
      if (size > MAX_BODY_BYTES) {
        req.resume()
        return null
      }
      chunks.push(chunk)
    }
  } catch {
    return undefined
  }
  return Buffer.concat(chunks, size).toString('utf8')
}

/** Parse a JSON object body carrying the given required string fields. */
function parseBody(text, fields) {
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const picked = {}
  for (const field of fields) {
    if (typeof body[field] !== 'string' || body[field] === '') return null
    picked[field] = body[field]
  }
  return picked
}

/** One path's kind and size, or `{ exists: false }` for anything unreachable. */
async function describePath(path) {
  try {
    const info = await stat(path)
    return {
      exists: true,
      kind: info.isDirectory() ? 'directory' : info.isFile() ? 'file' : 'other',
      size: info.size,
      mtimeMs: info.mtimeMs
    }
  } catch {
    return { exists: false }
  }
}

/** Read one file as text, refusing directories and flagging binary/oversized content. */
async function readTextFile(path, limit) {
  const info = await describePath(path)
  if (!info.exists) return { ok: false, code: 'not-found' }
  if (info.kind !== 'file') return { ok: false, code: 'not-a-file' }
  const bytes = await readFile(path)
  const truncated = bytes.byteLength > limit
  const slice = truncated ? bytes.subarray(0, limit) : bytes
  const text = slice.toString('utf8')
  const binary = text.slice(0, 8000).includes('\u0000')
  return { ok: true, text: binary ? '' : text, binary, truncated, size: info.size }
}

/**
 * Register the routes behind the connection trust fence. The fence and route
 * carrier are injected as a scoped fiber so a composition without them simply
 * keeps this plugin inert instead of failing it.
 */
export function apply(ctx) {
  ctx.inject(['webServer', 'connection'], (scope) => {
    /** Answer an untrusted/unauthenticated request; true when it was rejected. */
    const rejected = (req, res) => {
      const rejection = scope.connection.requestRejection(req)
      if (rejection === undefined) return false
      res.statusCode = rejection
      res.end()
      return true
    }

    /**
     * Wrap one JSON POST route: fence, method, media type, body ceiling, field
     * validation, then the operation's own handler.
     */
    const post = (suffix, fields, handler) =>
      scope.effect(
        () =>
          scope.webServer.register({
            kind: 'exact',
            path: `${ROUTE_BASE}${suffix}`,
            handler: async (req, res) => {
              if (rejected(req, res)) return
              if (req.method !== 'POST') {
                sendMethodNotAllowed(res, 'POST')
                return
              }
              const essence = String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase()
              if (essence !== 'application/json') {
                sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
                return
              }
              const text = await readBoundedBody(req)
              if (text === null) {
                sendJson(res, 413, { code: 'payload-too-large', message: 'request body is too large' })
                return
              }
              if (text === undefined) {
                sendJson(res, 400, { code: 'bad-request', message: 'request body unreadable' })
                return
              }
              const parsed = parseBody(text, fields)
              if (parsed === null) {
                sendJson(res, 400, {
                  code: 'bad-request',
                  message: `request body must be JSON with string ${fields.map((f) => `"${f}"`).join(', ')}`
                })
                return
              }
              try {
                await handler(parsed, res)
              } catch (error) {
                sendJson(res, 500, { code: 'failed', message: error instanceof Error ? error.message : String(error) })
              }
            }
          }),
        `right-click-menu: POST ${ROUTE_BASE}${suffix}`
      )

    /** Liveness probe the browser half uses to pick its save/read strategy. */
    scope.effect(
      () =>
        scope.webServer.register({
          kind: 'exact',
          path: `${ROUTE_BASE}/ping`,
          handler: (req, res) => {
            if (rejected(req, res)) return
            if (req.method !== 'GET') {
              sendMethodNotAllowed(res, 'GET')
              return
            }
            sendJson(res, 200, { ok: true, service: 'right-click-menu', version: 1 })
          }
        }),
      `right-click-menu: GET ${ROUTE_BASE}/ping`
    )

    /** Raw bytes for one absolute path: the source of a browser-side Save As. */
    scope.effect(
      () =>
        scope.webServer.register({
          kind: 'exact',
          path: `${ROUTE_BASE}/raw`,
          handler: async (req, res) => {
            if (rejected(req, res)) return
            if (req.method !== 'GET') {
              sendMethodNotAllowed(res, 'GET')
              return
            }
            const path = new URL(String(req.url), 'http://localhost').searchParams.get('path') ?? ''
            if (path === '' || !isAbsolute(path)) {
              sendJson(res, 400, { code: 'bad-request', message: 'path must be absolute' })
              return
            }
            const info = await describePath(path)
            if (!info.exists || info.kind !== 'file') {
              sendJson(res, 404, { code: 'not-found', message: path })
              return
            }
            let bytes
            try {
              bytes = await readFile(path)
            } catch (error) {
              sendJson(res, 500, { code: 'failed', message: error instanceof Error ? error.message : String(error) })
              return
            }
            res.statusCode = 200
            res.setHeader('content-type', CONTENT_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream')
            res.setHeader('cache-control', 'no-store')
            res.setHeader('content-length', String(bytes.byteLength))
            res.end(bytes)
          }
        }),
      `right-click-menu: GET ${ROUTE_BASE}/raw`
    )

    post('/stat', ['path'], async ({ path }, res) => {      if (!isAbsolute(path)) {
        sendJson(res, 400, { code: 'bad-request', message: 'path must be absolute' })
        return
      }
      sendJson(res, 200, { path, ...(await describePath(path)) })
    })

    post('/read', ['path'], async ({ path }, res) => {
      if (!isAbsolute(path)) {
        sendJson(res, 400, { code: 'bad-request', message: 'path must be absolute' })
        return
      }
      const result = await readTextFile(path, MAX_READ_BYTES)
      if (!result.ok) {
        sendJson(res, result.code === 'not-found' ? 404 : 400, { code: result.code, message: path })
        return
      }
      sendJson(res, 200, { path, ...result })
    })

    post('/save-as', ['from', 'to'], async ({ from, to }, res) => {
      if (!isAbsolute(from) || !isAbsolute(to)) {
        sendJson(res, 400, { code: 'bad-request', message: 'from and to must be absolute paths' })
        return
      }
      const source = await describePath(from)
      if (!source.exists || source.kind !== 'file') {
        sendJson(res, 404, { code: 'not-found', message: from })
        return
      }
      await mkdir(dirname(to), { recursive: true })
      await copyFile(from, to)
      sendJson(res, 200, { path: to, size: (await describePath(to)).size })
    })

    /** Write UTF-8 text to an absolute path: the fallback when no byte source is reachable. */
    post('/write-text', ['path', 'text'], async ({ path, text }, res) => {
      if (!isAbsolute(path)) {
        sendJson(res, 400, { code: 'bad-request', message: 'path must be absolute' })
        return
      }
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, text, 'utf8')
      sendJson(res, 200, { path, size: (await describePath(path)).size })
    })
  })
}
