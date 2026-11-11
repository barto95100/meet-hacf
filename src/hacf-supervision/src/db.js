import pg from 'pg'
import { config } from './config.js'

/**
 * Read-only view of the Meet rooms, straight from its PostgreSQL database.
 *
 * The Meet backend API only ever returns the rooms the caller owns
 * (`.filter(users=user)`), so an admin "all rooms" view has no API to call
 * without forking the backend. We therefore read the three tables directly,
 * with a dedicated read-only PostgreSQL user (see README.md). Disabled when
 * DB_HOST / DATABASE_URL is not configured.
 *
 * One narrow write exists: soft-deleting a room from the admin view. Meet's own
 * DELETE is a soft delete (it sets meet_room.deleted_at, keeping the row, slug
 * and recordings "for traceability" — see core.services.room_management), so we
 * reproduce exactly that: a single-column UPDATE, reversible, nothing is erased.
 * It uses a SEPARATE, tightly-scoped user (SELECT on meet_room + UPDATE of only
 * its deleted_at column) so the read-only user stays strictly read-only.
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
let writePool = null

const COMMON = {
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
}

const makePool = () => {
  if (!config.db.enabled) return null
  const common = {
    ...COMMON,
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

// Separate pool for the one write (soft-delete). Host/port/name are reused from
// the read config; only the user and password differ, so it can carry the
// narrow UPDATE grant without widening the read-only user.
const makeWritePool = () => {
  const w = config.db.write
  if (!config.db.enabled || !w.enabled) return null
  const common = { ...COMMON, application_name: 'hacf-supervision-write' }
  if (w.url) {
    return new pg.Pool({ connectionString: w.url, ...common })
  }
  return new pg.Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: w.user,
    password: w.password,
    ...common,
  })
}

const getWritePool = () => {
  if (!writePool) writePool = makeWritePool()
  return writePool
}

// One owner per room: resource_access with role 'owner', earliest first so the
// result is stable. A room without an owner row still shows up (LEFT JOIN).
const roomsQuery = (filter, order) => `
  SELECT
    res.id::text          AS id,
    r.slug                AS slug,
    r.name                AS name,
    r.access_level        AS access_level,
    res.created_at        AS created_at,
    r.last_started_at     AS last_started_at,
    r.deleted_at          AS deleted_at,
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
  WHERE ${filter}
  ORDER BY ${order}
  LIMIT 2000
`

// Active rooms (the normal view) and, separately, the "trash" of soft-deleted
// rooms that the admin view can restore or purge.
const ROOMS_SQL = roomsQuery(
  'r.deleted_at IS NULL',
  'r.last_started_at DESC NULLS LAST, res.created_at DESC'
)
const DELETED_ROOMS_SQL = roomsQuery('r.deleted_at IS NOT NULL', 'r.deleted_at DESC')

// Soft delete: set deleted_at like Meet does, only if not already deleted.
// Returns the resource id (for logging) or null when nothing matched.
const SOFT_DELETE_SQL = `
  UPDATE meet_room
  SET deleted_at = now()
  WHERE slug = $1 AND deleted_at IS NULL
  RETURNING resource_id::text AS id
`

// Restore: undo a soft delete (deleted_at back to NULL), only for a room that
// is currently soft-deleted. The slug it was guarding becomes usable again.
const RESTORE_SQL = `
  UPDATE meet_room
  SET deleted_at = NULL
  WHERE slug = $1 AND deleted_at IS NOT NULL
  RETURNING resource_id::text AS id
`

// Permanent delete, in child→parent order. Meet uses Django multi-table
// inheritance and enforces cascade in Python, NOT in the database (the FKs have
// no ON DELETE CASCADE), so the parent rows cannot be removed while children
// still reference them: recordings and their accesses, resource accesses, then
// the room (meet_room) and finally the resource (meet_resource) itself. Only a
// soft-deleted room is ever purged — never a live/active one. If an upstream
// migration adds another table pointing at a room/resource/recording, add its
// DELETE here (and its grant in README.md) — this is the one place to follow.
const PURGE_STEPS = [
  `DELETE FROM meet_recording_access
     WHERE recording_id IN (SELECT id FROM meet_recording WHERE room_id = $1)`,
  `DELETE FROM meet_recording WHERE room_id = $1`,
  `DELETE FROM meet_resource_access WHERE resource_id = $1`,
  `DELETE FROM meet_room WHERE resource_id = $1`,
  `DELETE FROM meet_resource WHERE id = $1`,
]

export const dbEnabled = () => config.db.enabled

/**
 * Whether the admin write actions (soft-delete, restore, permanent purge) are
 * available: the read DB is on AND a write user is configured.
 */
export const deleteEnabled = () => config.db.enabled && config.db.write.enabled

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
  deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : null,
  owner: row.owner_id
    ? {
        id: row.owner_id,
        email: row.owner_email || null,
        name: row.owner_name || row.owner_email || null,
      }
    : null,
})

/** All active rooms with their owner. Returns [] when the DB is not configured. */
export const listAllRooms = async () => {
  const p = getPool()
  if (!p) return []
  const { rows } = await p.query(ROOMS_SQL)
  return rows.map(mapRoomRow)
}

/** The "trash": soft-deleted rooms, most recently deleted first. Read-only. */
export const listDeletedRooms = async () => {
  const p = getPool()
  if (!p) return []
  const { rows } = await p.query(DELETED_ROOMS_SQL)
  return rows.map(mapRoomRow)
}

/**
 * Soft-delete a room by slug (sets deleted_at, exactly like Meet's own DELETE).
 * Returns the resource id when a room was deleted, or null when none matched
 * (unknown slug, or already deleted). Throws if the write user is not set up.
 */
export const softDeleteRoom = async (slug) => {
  const p = getWritePool()
  if (!p) throw new Error('room deletion is not configured')
  const { rows } = await p.query(SOFT_DELETE_SQL, [slug])
  return rows[0]?.id ?? null
}

/**
 * Restore a soft-deleted room (deleted_at back to NULL), freeing the slug it was
 * guarding. Returns the resource id when a room was restored, or null when none
 * matched (unknown slug, or not currently deleted).
 */
export const restoreRoom = async (slug) => {
  const p = getWritePool()
  if (!p) throw new Error('room deletion is not configured')
  const { rows } = await p.query(RESTORE_SQL, [slug])
  return rows[0]?.id ?? null
}

/**
 * Permanently delete a soft-deleted room and everything tied to it (accesses,
 * recordings), in one transaction. Only a room that is already soft-deleted can
 * be purged. Returns the resource id when a room was purged, or null when none
 * matched. Irreversible.
 */
export const purgeRoom = async (slug) => {
  const p = getWritePool()
  if (!p) throw new Error('room deletion is not configured')
  const client = await p.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT resource_id::text AS id FROM meet_room
        WHERE slug = $1 AND deleted_at IS NOT NULL`,
      [slug]
    )
    const id = rows[0]?.id ?? null
    if (!id) {
      await client.query('ROLLBACK')
      return null
    }
    for (const step of PURGE_STEPS) await client.query(step, [id])
    await client.query('COMMIT')
    return id
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}
