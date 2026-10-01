import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useRemoteParticipants,
  useRoomContext,
} from '@livekit/components-react'
import {
  ConnectionQuality,
  RemoteParticipant,
  RemoteTrack,
} from 'livekit-client'
import { RiPulseLine, RiCloseLine } from '@remixicon/react'
import { css } from '@/styled-system/css'
import { useSupervisionAccess } from '../api/supervision'

const POLL_MS = 2000

type ReceiverStats = {
  type?: 'audio' | 'video'
  bytesReceived?: number
  packetsLost?: number
  packetsReceived?: number
  jitter?: number
  framesDecoded?: number
  frameWidth?: number
  frameHeight?: number
}

type Row = {
  identity: string
  name: string
  quality: ConnectionQuality
  lossPercent: number | null
  jitterMs: number | null
  resolution: string | null
  fps: number | null
  bitrateKbps: number | null
}

// Per-track running state, to turn cumulative counters into rates.
type Prev = {
  bytes: number
  framesDecoded: number
  packetsLost: number
  packetsReceived: number
  t: number
}

const QUALITY = {
  [ConnectionQuality.Excellent]: { label: 'excellent', tone: 'good' },
  [ConnectionQuality.Good]: { label: 'good', tone: 'good' },
  [ConnectionQuality.Poor]: { label: 'poor', tone: 'bad' },
  [ConnectionQuality.Lost]: { label: 'lost', tone: 'bad' },
  [ConnectionQuality.Unknown]: { label: 'unknown', tone: 'neutral' },
} as const

const subscribedTracks = (participant: RemoteParticipant): RemoteTrack[] =>
  Array.from(participant.trackPublications.values())
    .filter((pub) => pub.isSubscribed && pub.track)
    .map((pub) => pub.track as RemoteTrack)

/**
 * Diagnostic panel for a member of the allowed group, during a call. It only
 * reads the WebRTC receive stats of the streams this browser already receives
 * as a normal participant — no hidden observer, no extra media.
 */
export const HacfDiagnosticsPanel = () => {
  const { t } = useTranslation('hacf', { keyPrefix: 'diagnostics' })
  const allowed = useSupervisionAccess()
  const room = useRoomContext()
  const participants = useRemoteParticipants()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const prev = useRef(new Map<string, Prev>())

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const collect = async () => {
      const next: Row[] = []
      for (const participant of participants) {
        let bytes = 0
        let framesDecoded = 0
        let packetsLost = 0
        let packetsReceived = 0
        let width: number | undefined
        let height: number | undefined
        let jitter: number | undefined

        for (const track of subscribedTracks(participant)) {
          // Present on RemoteAudioTrack / RemoteVideoTrack (not the base type).
          const withStats = track as RemoteTrack & {
            getReceiverStats?: () => Promise<ReceiverStats | undefined>
          }
          const stats = await withStats.getReceiverStats?.()
          if (!stats) continue
          bytes += stats.bytesReceived ?? 0
          packetsLost += stats.packetsLost ?? 0
          packetsReceived += stats.packetsReceived ?? 0
          jitter = Math.max(jitter ?? 0, stats.jitter ?? 0)
          if (stats.type === 'video') {
            framesDecoded += stats.framesDecoded ?? 0
            if (stats.frameWidth && stats.frameHeight) {
              width = stats.frameWidth
              height = stats.frameHeight
            }
          }
        }

        const now = Date.now()
        const before = prev.current.get(participant.identity)
        prev.current.set(participant.identity, {
          bytes,
          framesDecoded,
          packetsLost,
          packetsReceived,
          t: now,
        })
        const dt = before ? (now - before.t) / 1000 : 0

        const deltaLost = before ? packetsLost - before.packetsLost : 0
        const deltaReceived = before
          ? packetsReceived - before.packetsReceived
          : 0
        const lossBase = deltaLost + deltaReceived
        next.push({
          identity: participant.identity,
          name: participant.name || participant.identity,
          quality: participant.connectionQuality,
          lossPercent:
            before && lossBase > 0
              ? (deltaLost / lossBase) * 100
              : before
                ? 0
                : null,
          jitterMs: jitter !== undefined ? jitter * 1000 : null,
          resolution: width && height ? `${width}×${height}` : null,
          fps:
            before && dt > 0
              ? (framesDecoded - before.framesDecoded) / dt
              : null,
          bitrateKbps:
            before && dt > 0 ? ((bytes - before.bytes) * 8) / dt / 1000 : null,
        })
      }
      if (!cancelled) setRows(next)
    }

    collect()
    const timer = setInterval(collect, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [open, participants])

  // Drop state for participants who left.
  useEffect(() => {
    const present = new Set(participants.map((p) => p.identity))
    for (const id of prev.current.keys()) {
      if (!present.has(id)) prev.current.delete(id)
    }
  }, [participants])

  if (!allowed || !room) return null

  const round = (value: number | null, digits = 0) =>
    value === null ? '—' : value.toFixed(digits)

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('open')}
          className={toggleButton}
        >
          <RiPulseLine size={16} aria-hidden="true" />
          {t('label')}
        </button>
      )}

      {open && (
        <section className={panel} aria-label={t('label')}>
          <header className={panelHead}>
            <h2 className={panelTitle}>{t('title')}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('close')}
              className={closeButton}
            >
              <RiCloseLine size={18} aria-hidden="true" />
            </button>
          </header>
          {rows.length === 0 ? (
            <p className={emptyText}>{t('empty')}</p>
          ) : (
            <ul className={list}>
              {rows.map((row) => {
                const quality =
                  QUALITY[row.quality] ?? QUALITY[ConnectionQuality.Unknown]
                return (
                  <li key={row.identity} className={rowItem}>
                    <div className={rowTop}>
                      <span className={nameText}>{row.name}</span>
                      <span
                        className={css({ fontSize: '12px', fontWeight: 600 })}
                        style={{ color: toneColor(quality.tone) }}
                      >
                        {t(`quality.${quality.label}`)}
                      </span>
                    </div>
                    <div className={rowStats}>
                      <span>
                        {t('loss')} {round(row.lossPercent, 1)}%
                      </span>
                      <span>
                        {t('jitter')} {round(row.jitterMs)} ms
                      </span>
                      {row.resolution && <span>{row.resolution}</span>}
                      {row.fps !== null && <span>{round(row.fps)} ips</span>}
                      {row.bitrateKbps !== null && (
                        <span>{round(row.bitrateKbps)} kb/s</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className={footNote}>{t('note')}</p>
        </section>
      )}
    </>
  )
}

const toneColor = (tone: string) =>
  tone === 'good'
    ? 'oklch(82% 0.13 150)'
    : tone === 'bad'
      ? 'oklch(78% 0.13 28)'
      : '#a9a8b3'

const toggleButton = css({
  position: 'fixed',
  top: '52px',
  left: '10px',
  zIndex: 10,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '32px',
  paddingX: '12px',
  borderRadius: '999px',
  backgroundColor: 'rgb(11 11 16 / 0.72)',
  border: '1px solid rgb(255 255 255 / 0.18)',
  color: '#f4f3f7',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
  opacity: 0.85,
  _hover: { opacity: 1, backgroundColor: 'rgb(11 11 16 / 0.9)' },
})

const panel = css({
  position: 'fixed',
  top: '52px',
  left: '10px',
  zIndex: 11,
  width: 'min(340px, calc(100vw - 20px))',
  maxHeight: 'calc(100vh - 140px)',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '16px',
  backgroundColor: 'rgb(11 11 16 / 0.92)',
  border: '1px solid rgb(255 255 255 / 0.14)',
  boxShadow: '0 20px 50px -10px rgba(0,0,0,.7)',
  backdropFilter: 'blur(10px)',
  color: '#f4f3f7',
  overflow: 'hidden',
})

const panelHead = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 14px',
  borderBottom: '1px solid rgb(255 255 255 / 0.1)',
})

const panelTitle = css({ margin: 0, fontSize: '14px', fontWeight: 600 })

const closeButton = css({
  display: 'inline-flex',
  padding: '4px',
  borderRadius: '8px',
  border: 0,
  background: 'transparent',
  color: '#c9c8d3',
  cursor: 'pointer',
  _hover: { backgroundColor: 'rgb(255 255 255 / 0.08)', color: '#fff' },
})

const list = css({
  listStyle: 'none',
  margin: 0,
  padding: '6px',
  overflowY: 'auto',
})

const rowItem = css({
  padding: '8px 10px',
  borderRadius: '10px',
  _hover: { backgroundColor: 'rgb(255 255 255 / 0.03)' },
})

const rowTop = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
})

const nameText = css({
  fontSize: '14px',
  fontWeight: 500,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const rowStats = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '2px 12px',
  marginTop: '2px',
  color: '#a9a8b3',
  fontSize: '12px',
})

const emptyText = css({
  margin: 0,
  padding: '20px 14px',
  color: '#a9a8b3',
  fontSize: '13px',
  textAlign: 'center',
})

const footNote = css({
  margin: 0,
  padding: '8px 14px 12px',
  color: '#8e8d99',
  fontSize: '11px',
  lineHeight: 1.4,
})
