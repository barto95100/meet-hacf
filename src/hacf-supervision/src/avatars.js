import { config } from './config.js'
import { httpGet } from './http.js'

/**
 * Avatar image of an Authentik user, as { contentType, body }, or null when
 * Authentik has no real picture for them: its generated initials (SVG) and
 * default image are ignored so that Meet keeps its own colored initials.
 */
const cache = new Map()
const MAX_ENTRIES = 500

const remember = (key, value) => {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value)
  cache.set(key, { value, expires: Date.now() + config.avatarCacheSeconds * 1000 })
  return value
}

const fromDataUri = (uri) => {
  const match = /^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/i.exec(uri)
  if (!match) return null
  return { contentType: match[1].toLowerCase(), body: Buffer.from(match[2], 'base64') }
}

const isPlaceholder = (avatar) =>
  !avatar ||
  avatar.startsWith('data:image/svg') ||
  avatar.includes('/user_default.') ||
  avatar.includes('/default-avatar')

export const getAvatarImage = async (entry) => {
  const avatar = entry?.avatar
  if (isPlaceholder(avatar)) return null

  const cached = cache.get(avatar)
  if (cached && cached.expires > Date.now()) return cached.value

  if (avatar.startsWith('data:')) return remember(avatar, fromDataUri(avatar))

  const url = new URL(avatar, `${config.authentikUrl}/`)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return remember(avatar, null)
  try {
    const res = await httpGet(url.href, { maxBytes: 2 * 1024 * 1024, timeoutMs: 5000 })
    const contentType = String(res.headers['content-type'] || '').split(';')[0].trim()
    const ok =
      res.status === 200 && /^image\/(png|jpeg|gif|webp|avif)$/.test(contentType)
    return remember(avatar, ok ? { contentType, body: res.body } : null)
  } catch (error) {
    console.error(`[avatars] could not fetch ${url.host}: ${error.message}`)
    return null
  }
}
