import assert from 'node:assert/strict'
import { test } from 'node:test'

// config.js reads required env vars at import time; db.js imports it.
process.env.MEET_API_URL ||= 'http://x'
process.env.AUTHENTIK_URL ||= 'http://x'
process.env.AUTHENTIK_TOKEN ||= 'x'
process.env.LIVEKIT_URL ||= 'http://x'
process.env.LIVEKIT_API_KEY ||= 'x'
process.env.LIVEKIT_API_SECRET ||= 'x'

const { mapRoomRow } = await import('../src/db.js')

test('mapRoomRow shapes a full row with its owner', () => {
  const room = mapRoomRow({
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'atelier-zigbee',
    name: 'Atelier Zigbee',
    access_level: 'trusted',
    created_at: '2026-01-01T10:00:00Z',
    last_started_at: '2026-02-01T09:00:00Z',
    owner_id: '22222222-2222-2222-2222-222222222222',
    owner_email: 'alice@hacf.fr',
    owner_name: 'Alice',
  })
  assert.equal(room.slug, 'atelier-zigbee')
  assert.equal(room.accessLevel, 'trusted')
  assert.equal(room.createdAt, Date.parse('2026-01-01T10:00:00Z'))
  assert.equal(room.lastStartedAt, Date.parse('2026-02-01T09:00:00Z'))
  assert.deepEqual(room.owner, {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'alice@hacf.fr',
    name: 'Alice',
  })
})

test('mapRoomRow tolerates a room without an owner or dates', () => {
  const room = mapRoomRow({
    id: 'x',
    slug: 's',
    name: null,
    access_level: null,
    created_at: null,
    last_started_at: null,
    owner_id: null,
  })
  assert.equal(room.owner, null)
  assert.equal(room.name, null)
  assert.equal(room.createdAt, null)
  assert.equal(room.lastStartedAt, null)
})

test('mapRoomRow falls back to the owner email when the name is missing', () => {
  const room = mapRoomRow({
    id: 'x',
    slug: 's',
    owner_id: '33',
    owner_email: 'bob@hacf.fr',
    owner_name: null,
  })
  assert.equal(room.owner.name, 'bob@hacf.fr')
})
