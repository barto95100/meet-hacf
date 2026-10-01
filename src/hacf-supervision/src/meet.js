import { createHash } from 'node:crypto'
import { config } from './config.js'
import { getJson } from './http.js'

/** Meet user of a browser session, cached briefly per cookie header. */
const cache = new Map()

const cacheKey = (cookie) => createHash('sha256').update(cookie).digest('hex')

/**
 * Returns { email, fullName } for the Meet session carried by the browser
 * cookies, or null when nobody is logged in.
 */
export const getMeetUser = async (cookieHeader) => {
  if (!cookieHeader) return null
  const key = cacheKey(cookieHeader)
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.user

  const headers = { cookie: cookieHeader, accept: 'application/json' }
  if (config.meetHost) {
    headers.host = config.meetHost
    // Django only trusts the request as HTTPS through this header (no redirect).
    headers['x-forwarded-proto'] = 'https'
  }
  const { status, data } = await getJson(`${config.meetApiUrl}/api/v1.0/users/me/`, {
    headers,
  })
  let user = null
  if (status === 200 && data?.email) {
    user = { email: data.email.toLowerCase(), fullName: data.full_name || '' }
  } else if (status !== 401 && status !== 403) {
    throw new Error(`Unexpected Meet response ${status}`)
  }

  // Keep the cache small: drop expired entries when it grows.
  if (cache.size > 2000) {
    for (const [k, v] of cache) if (v.expires <= Date.now()) cache.delete(k)
  }
  cache.set(key, {
    user,
    // Logged-out answers are cached for less time, so logging in shows up fast.
    expires: Date.now() + (user ? config.sessionCacheSeconds : 10) * 1000,
  })
  return user
}
