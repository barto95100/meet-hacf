import { RoomServiceClient, TrackSource } from 'livekit-server-sdk'
import { config } from './config.js'

const client = new RoomServiceClient(
  config.livekitUrl,
  config.livekitApiKey,
  config.livekitApiSecret
)

const toMillis = (ms, seconds) => Number(ms || 0n) || Number(seconds || 0n) * 1000

// ParticipantInfo.Kind values (not exported by livekit-server-sdk).
const KIND_LABELS = { 0: 'standard', 1: 'ingress', 2: 'egress', 3: 'sip', 4: 'agent' }

const hasActiveTrack = (participant, source) =>
  participant.tracks.some((track) => track.source === source && !track.muted)

const toParticipant = (participant) => ({
  identity: participant.identity,
  name: participant.name || participant.identity,
  joinedAt: toMillis(participant.joinedAtMs, participant.joinedAt),
  kind: KIND_LABELS[participant.kind] || 'other',
  isAuthenticated: participant.attributes?.is_authenticated === 'true',
  role: participant.attributes?.room_role || null,
  microphone: hasActiveTrack(participant, TrackSource.MICROPHONE),
  camera: hasActiveTrack(participant, TrackSource.CAMERA),
  screenShare: hasActiveTrack(participant, TrackSource.SCREEN_SHARE),
})

/** Rooms currently running on LiveKit, with their participants (read-only). */
export const listRooms = async () => {
  const rooms = await client.listRooms()
  const detailed = await Promise.all(
    rooms.map(async (room) => {
      const participants = (await client.listParticipants(room.name))
        .map(toParticipant)
        .sort((a, b) => a.joinedAt - b.joinedAt)
      return {
        name: room.name,
        createdAt: toMillis(room.creationTimeMs, room.creationTime),
        activeRecording: room.activeRecording,
        participants,
      }
    })
  )
  return detailed.sort(
    (a, b) => b.participants.length - a.participants.length || a.createdAt - b.createdAt
  )
}
