import pg from 'pg'
import { config } from './config.js'

/**
 * Read-only view of the Meet rooms, straight from its PostgreSQL database.
 *
 * The Meet backend API only ever returns the rooms the caller owns
 * (`.filter(users=user)`), so an admin "all rooms" view has no API to call
 * without forking the backend. We therefore read the three tables directly,
 * with a dedicated read-only PostgreSQL user (see README.md). Nothing here
 * writes. Disabled when DB_HOST / DATABASE_URL is not configured.
 *
 * Coupling note: this depends on Meet's table layout. Meet uses Django
 * multi-table inheritance: Room extends Resource, so meet_room has no id/
 * created_at of its own — its primary key is resource_id, pointing at
 * meet_resource (which carries id and created_at). A room's identity, as used
 * by meet_resource_access.resource_id, is that resource id. If an upstream
 * migration changes this layout, only this query must follow — it is isolated
 * here on purpose.
 */

let pool = null

const makePool = () => {
  if (!config.db.enabled) return null
  const common = {
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    // Defence in depth: even if a credential leaks, the session can't write.
    application_name: 'hacf-supervision',
  }
  if (config.db.url) {
    return new pg.Pool({ connectionString: config.db.url, ...common })
  }
  return new pg.Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    ...common,
  })
}

const getPool = () => {
  if (!pool) pool = makePool()
  return pool
}

// One owner per room: resource_access with role 'owner', earliest first so the
// result is stable. A room without an owner row still shows up (LEFT JOIN).
const ROOMS_SQL = `
  SELECT
    res.id::text          AS id,
    r.slug                AS slug,
    r.name                AS name,
    r.access_level        AS access_level,
    res.created_at        AS created_at,
    r.last_started_at     AS last_started_at,
    o.user_id::text       AS owner_id,
    u.email               AS owner_email,
    u.full_name           AS owner_name
  FROM meet_room r
  JOIN meet_resource res ON res.id = r.resource_id
  LEFT JOIN LATERAL (
    SELECT a.user_id
    FROM meet_resource_access a
    WHERE a.resource_id = r.resource_id AND a.role = 'owner'
    ORDER BY a.created_at ASC NULLS LAST
    LIMIT 1
  ) o ON TRUE
  LEFT JOIN meet_user u ON u.id = o.user_id
  ORDER BY r.last_started_at DESC NULLS LAST, res.created_at DESC
  LIMIT 2000
`

export const dbEnabled = () => config.db.enabled

/** Shape one SQL row into the room object the API returns. Pure (testable). */
export const mapRoomRow = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name || null,
  accessLevel: row.access_level || null,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
  lastStartedAt: row.last_started_at
    ? new Date(row.last_started_at).getTime()
    : null,
  owner: row.owner_id
    ? {
        id: row.owner_id,
        email: row.owner_email || null,
        name: row.owner_name || row.owner_email || null,
      }
    : null,
})

/** All rooms with their owner. Returns [] when the DB is not configured. */
export const listAllRooms = async () => {
  const p = getPool()
  if (!p) return []
  const { rows } = await p.query(ROOMS_SQL)
  return rows.map(mapRoomRow)
}
