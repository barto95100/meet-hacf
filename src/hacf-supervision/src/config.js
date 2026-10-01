/**
 * Configuration, from environment variables only (see README.md).
 */
const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

const trimSlash = (url) => url.replace(/\/+$/, '')

export const config = {
  port: Number(process.env.PORT || 8090),
  basePath: '/supervision',

  // Meet backend, used to know who the browser session belongs to.
  // Internal URL (e.g. http://backend:8000) + the public host name so that
  // Django accepts the request (ALLOWED_HOSTS, HTTPS redirect).
  meetApiUrl: trimSlash(required('MEET_API_URL')),
  meetHost: process.env.MEET_HOST || '',
  // Public URL of Meet, used for "Rejoindre" links on the page.
  meetPublicUrl: trimSlash(process.env.MEET_PUBLIC_URL || ''),

  // Authentik: API token with read access to users and groups.
  authentikUrl: trimSlash(required('AUTHENTIK_URL')),
  authentikToken: required('AUTHENTIK_TOKEN'),
  allowedGroup: process.env.ALLOWED_GROUP || 'Infra',

  // LiveKit server API (same key / secret as the Meet backend).
  livekitUrl: trimSlash(required('LIVEKIT_URL')),
  livekitApiKey: required('LIVEKIT_API_KEY'),
  livekitApiSecret: required('LIVEKIT_API_SECRET'),
  // Optional: LiveKit Prometheus endpoint (prometheus_port). When unset, the
  // server-health section is simply hidden.
  livekitPrometheusUrl: process.env.LIVEKIT_PROMETHEUS_URL
    ? trimSlash(process.env.LIVEKIT_PROMETHEUS_URL)
    : '',

  // Cache durations, in seconds.
  sessionCacheSeconds: Number(process.env.SESSION_CACHE_SECONDS || 60),
  directoryCacheSeconds: Number(process.env.DIRECTORY_CACHE_SECONDS || 300),
  avatarCacheSeconds: Number(process.env.AVATAR_CACHE_SECONDS || 600),

  // Optional read-only access to Meet's PostgreSQL database, used only for the
  // admin "all rooms" view (the Meet API can't list other users' rooms).
  // Use a dedicated read-only user (see README.md). When neither DATABASE_URL
  // nor DB_HOST is set, the admin view is simply disabled.
  db: dbConfig(),
}

function dbConfig() {
  const url = process.env.DATABASE_URL || ''
  const host = process.env.DB_HOST || ''
  return {
    enabled: Boolean(url || host),
    url,
    host,
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'meet',
    user: process.env.DB_USER || 'dinum',
    password: process.env.DB_PASSWORD || '',
  }
}
