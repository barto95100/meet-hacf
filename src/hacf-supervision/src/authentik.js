import { config } from './config.js'
import { getJson } from './http.js'

/**
 * Cached copy of the Authentik user directory (users with their groups and
 * avatar), refreshed every DIRECTORY_CACHE_SECONDS.
 *
 * Users are indexed by every value Authentik may send to Meet as the OIDC
 * "sub" (= LiveKit participant identity), whatever the provider's subject
 * mode: hashed user ID (uid, the default), user ID (pk), UUID, username,
 * email or UPN.
 */
let directory = { byEmail: new Map(), byIdentity: new Map(), loadedAt: 0 }
let loading = null

const toEntry = (user) => ({
  email: (user.email || '').toLowerCase(),
  name: user.name || user.username,
  isActive: user.is_active !== false,
  groups: (user.groups_obj || []).map((group) => group.name),
  avatar: user.avatar || '',
})

const load = async () => {
  const byEmail = new Map()
  const byIdentity = new Map()
  let page = 1
  while (page) {
    const url = `${config.authentikUrl}/api/v3/core/users/?page=${page}&page_size=100&include_groups=true`
    const { status, data } = await getJson(url, {
      headers: {
        authorization: `Bearer ${config.authentikToken}`,
        accept: 'application/json',
      },
    })
    if (status !== 200) throw new Error(`Authentik API answered ${status}`)
    for (const user of data.results || []) {
      const entry = toEntry(user)
      if (entry.email) byEmail.set(entry.email, entry)
      for (const key of [user.uid, user.pk, user.uuid, user.username, user.email, user.attributes?.upn]) {
        if (key !== undefined && key !== null && key !== '') byIdentity.set(String(key), entry)
      }
    }
    page = data.pagination?.next || 0
  }
  directory = { byEmail, byIdentity, loadedAt: Date.now() }
}

const refresh = async ({ maxAgeSeconds }) => {
  if (Date.now() - directory.loadedAt < maxAgeSeconds * 1000) return
  loading ??= load().finally(() => {
    loading = null
  })
  try {
    await loading
  } catch (error) {
    // Keep serving the previous copy if Authentik is briefly unavailable.
    if (!directory.loadedAt) throw error
    console.error(`[authentik] refresh failed, using cached directory: ${error.message}`)
  }
}

const find = async (map, key) => {
  await refresh({ maxAgeSeconds: config.directoryCacheSeconds })
  let entry = map().get(key)
  // Unknown user (account created since the last refresh): reload once, at most every 30 s.
  if (!entry) {
    await refresh({ maxAgeSeconds: 30 })
    entry = map().get(key)
  }
  return entry && entry.isActive ? entry : null
}

export const findUserByEmail = (email) => find(() => directory.byEmail, email.toLowerCase())

export const findUserByIdentity = (identity) => find(() => directory.byIdentity, String(identity))

export const isInAllowedGroup = (entry) => !!entry && entry.groups.includes(config.allowedGroup)
