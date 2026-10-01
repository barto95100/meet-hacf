import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { getMeetUser } from './meet.js'
import { findUserByEmail, findUserByIdentity, isInAllowedGroup } from './authentik.js'
import { getAvatarImage } from './avatars.js'
import { listRooms } from './livekit.js'
import { getMetrics, startMetrics } from './metrics.js'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
const API = `${config.basePath}/api`

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
}

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'DENY',
}

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers })
  res.end(body)
}

const sendJson = (res, status, data) =>
  send(res, status, JSON.stringify(data), {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })

/**
 * Access rule: logged in to Meet (browser session) AND member of the allowed
 * Authentik group. Returns { status, meetUser }.
 */
const checkAccess = async (req) => {
  const meetUser = await getMeetUser(req.headers.cookie)
  if (!meetUser) return { status: 401, meetUser: null }
  const entry = await findUserByEmail(meetUser.email)
  return { status: isInAllowedGroup(entry) ? 200 : 403, meetUser }
}

const routes = {
  async health(req, res) {
    sendJson(res, 200, { ok: true })
  },

  async access(req, res) {
    const { status, meetUser } = await checkAccess(req)
    sendJson(res, status, {
      allowed: status === 200,
      group: config.allowedGroup,
      user: status === 200 ? { name: meetUser.fullName || meetUser.email } : null,
    })
  },

  async rooms(req, res) {
    const { status } = await checkAccess(req)
    if (status !== 200) return sendJson(res, status, { allowed: false })
    sendJson(res, 200, {
      generatedAt: Date.now(),
      meetUrl: config.meetPublicUrl || null,
      rooms: await listRooms(),
    })
  },

  async metrics(req, res) {
    const { status } = await checkAccess(req)
    if (status !== 200) return sendJson(res, status, { allowed: false })
    sendJson(res, 200, getMetrics())
  },

  // Avatars are visible to any user logged in to Meet (they already see each
  // other in meetings), never to anonymous visitors.
  async avatar(req, res, identity) {
    const meetUser = await getMeetUser(req.headers.cookie)
    if (!meetUser) return send(res, 401, '')
    const entry =
      identity === 'me'
        ? await findUserByEmail(meetUser.email)
        : await findUserByIdentity(identity)
    const image = await getAvatarImage(entry)
    if (!image) {
      return send(res, 404, '', { 'cache-control': 'private, max-age=300' })
    }
    send(res, 200, image.body, {
      'content-type': image.contentType,
      'cache-control': `private, max-age=${config.avatarCacheSeconds}`,
    })
  },
}

const serveStatic = async (res, path) => {
  const file = path === '' || path === '/' ? 'index.html' : path.replace(/^\//, '')
  // Flat directory, known extensions only: no path traversal possible.
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/.test(file) || !STATIC_TYPES[extname(file)]) {
    return send(res, 404, 'Not found')
  }
  try {
    const body = await readFile(join(publicDir, file))
    const headers = {
      'content-type': STATIC_TYPES[extname(file)],
      'cache-control': file === 'index.html' ? 'no-cache' : 'public, max-age=3600',
    }
    if (file === 'index.html') {
      headers['content-security-policy'] =
        "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; " +
        "connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    }
    send(res, 200, body, headers)
  } catch {
    send(res, 404, 'Not found')
  }
}

const handle = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, '', { allow: 'GET, HEAD' })
  }
  const { pathname } = new URL(req.url, 'http://localhost')

  if (pathname === `${API}/health`) return routes.health(req, res)
  if (pathname === `${API}/access`) return routes.access(req, res)
  if (pathname === `${API}/rooms`) return routes.rooms(req, res)
  if (pathname === `${API}/metrics`) return routes.metrics(req, res)
  const avatarMatch = pathname.match(new RegExp(`^${API}/avatar/([^/]{1,200})$`))
  if (avatarMatch) return routes.avatar(req, res, decodeURIComponent(avatarMatch[1]))

  if (pathname === config.basePath) {
    return send(res, 301, '', { location: `${config.basePath}/` })
  }
  if (pathname.startsWith(`${config.basePath}/`) && !pathname.startsWith(`${API}/`)) {
    return serveStatic(res, pathname.slice(config.basePath.length))
  }
  send(res, 404, 'Not found')
}

http
  .createServer((req, res) => {
    handle(req, res).catch((error) => {
      console.error(`[server] ${req.method} ${req.url}: ${error.message}`)
      if (!res.headersSent) sendJson(res, 502, { error: 'upstream_error' })
      else res.end()
    })
  })
  .on('listening', () => startMetrics())
  .listen(config.port, () => {
    console.log(
      `HACF supervision listening on :${config.port}${config.basePath} (group "${config.allowedGroup}")`
    )
  })
