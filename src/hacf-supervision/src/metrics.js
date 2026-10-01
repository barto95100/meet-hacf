import { config } from './config.js'
import { httpGet } from './http.js'
import { has, parsePrometheus, sumBy } from './prometheus.js'

/**
 * Server-side LiveKit health, scraped from its Prometheus endpoint every
 * SCRAPE_SECONDS and kept in memory for the last hour (no disk, no extra
 * container). Disabled when LIVEKIT_PROMETHEUS_URL is not set.
 */
const SCRAPE_SECONDS = 15
const HISTORY_MS = 60 * 60 * 1000

let history = [] // [{ t, snapshot }]
let timer = null

/** Extract the values we care about from one scrape. */
const snapshotFrom = (samples) => ({
  qualitySum: sumBy(samples, 'livekit_quality_score_sum'),
  qualityCount: sumBy(samples, 'livekit_quality_score_count'),
  bytesIn: sumBy(samples, 'livekit_packet_bytes', { direction: 'incoming' }),
  bytesOut: sumBy(samples, 'livekit_packet_bytes', { direction: 'outgoing' }),
  latencyNsSum: sumBy(samples, 'livekit_forward_latency_ns_sum'),
  latencyNsCount: sumBy(samples, 'livekit_forward_latency_ns_count'),
  pli: sumBy(samples, 'livekit_pli_total'),
  outOfOrder: sumBy(samples, 'livekit_packet_out_of_order_total'),
  dropped: sumBy(samples, 'livekit_node_packet_total', { type: 'dropped' }),
  memoryBytes: sumBy(samples, 'process_resident_memory_bytes'),
  // Presence flags, so a card is hidden when its metric is absent.
  hasQuality: has(samples, 'livekit_quality_score_count'),
  hasLatency: has(samples, 'livekit_forward_latency_ns_count'),
  hasBandwidth: has(samples, 'livekit_packet_bytes'),
  hasMemory: has(samples, 'process_resident_memory_bytes'),
})

const scrape = async () => {
  const res = await httpGet(config.livekitPrometheusUrl, { timeoutMs: 5000 })
  if (res.status !== 200) throw new Error(`Prometheus answered ${res.status}`)
  const snapshot = snapshotFrom(parsePrometheus(res.body.toString('utf8')))
  history.push({ t: Date.now(), snapshot })
  const cutoff = Date.now() - HISTORY_MS
  history = history.filter((point) => point.t >= cutoff)
}

export const startMetrics = () => {
  if (!config.livekitPrometheusUrl || timer) return
  const tick = () =>
    scrape().catch((error) => console.error(`[metrics] scrape failed: ${error.message}`))
  tick()
  timer = setInterval(tick, SCRAPE_SECONDS * 1000)
  timer.unref?.()
}

// Counters only increase; a smaller value means LiveKit restarted, skip the step.
const rate = (current, previous, dtSeconds) =>
  current >= previous && dtSeconds > 0 ? (current - previous) / dtSeconds : null

const bandwidthMbps = (curr, prev, dt) => {
  const bytes = rate(curr, prev, dt)
  return bytes === null ? null : (bytes * 8) / 1e6
}

/** Average over the last interval, falling back to the all-time average. */
const windowAverage = (sumNow, countNow, sumPrev, countPrev) => {
  const dCount = countNow - countPrev
  if (dCount > 0) return (sumNow - sumPrev) / dCount
  return countNow > 0 ? sumNow / countNow : null
}

const round = (value, digits = 1) =>
  value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits

export const getMetrics = () => {
  if (!config.livekitPrometheusUrl) return { available: false }
  if (history.length === 0) return { available: true, pending: true }

  const last = history[history.length - 1]
  const prev = history.length > 1 ? history[history.length - 2] : null
  const now = last.snapshot
  const before = prev?.snapshot
  const dt = prev ? (last.t - prev.t) / 1000 : 0

  const cards = []
  const push = (condition, card) => {
    if (condition && card.value !== null && card.value !== undefined) cards.push(card)
  }

  const quality = windowAverage(
    now.qualitySum,
    now.qualityCount,
    before?.qualitySum ?? 0,
    before?.qualityCount ?? 0
  )
  push(now.hasQuality, {
    key: 'quality',
    label: 'Qualité moyenne',
    value: round(quality, 2),
    unit: '/5',
    tone: quality === null ? 'neutral' : quality >= 4 ? 'good' : quality >= 3 ? 'warn' : 'bad',
  })

  if (before) {
    push(now.hasBandwidth, {
      key: 'bw-in',
      label: 'Débit entrant',
      value: round(bandwidthMbps(now.bytesIn, before.bytesIn, dt)),
      unit: 'Mb/s',
      tone: 'neutral',
    })
    push(now.hasBandwidth, {
      key: 'bw-out',
      label: 'Débit sortant',
      value: round(bandwidthMbps(now.bytesOut, before.bytesOut, dt)),
      unit: 'Mb/s',
      tone: 'neutral',
    })
    const latency = windowAverage(
      now.latencyNsSum,
      now.latencyNsCount,
      before.latencyNsSum,
      before.latencyNsCount
    )
    push(now.hasLatency, {
      key: 'latency',
      label: 'Latence de transfert',
      value: round(latency === null ? null : latency / 1e6),
      unit: 'ms',
      tone: latency === null ? 'neutral' : latency / 1e6 < 50 ? 'good' : latency / 1e6 < 150 ? 'warn' : 'bad',
    })
    const lossPerSec = rate(now.outOfOrder + now.pli, before.outOfOrder + before.pli, dt)
    push(true, {
      key: 'loss',
      label: 'Paquets perdus / déséquencés',
      value: round(lossPerSec, 1),
      unit: '/s',
      tone: lossPerSec === null ? 'neutral' : lossPerSec < 5 ? 'good' : lossPerSec < 50 ? 'warn' : 'bad',
    })
  }

  push(now.hasMemory, {
    key: 'memory',
    label: 'Mémoire du serveur',
    value: round(now.memoryBytes / 1e6, 0),
    unit: 'Mo',
    tone: 'neutral',
  })

  // Sparklines over the last hour.
  const series = { t: [], bandwidth: [], quality: [] }
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1]
    const b = history[i]
    const seconds = (b.t - a.t) / 1000
    const inMbps = bandwidthMbps(b.snapshot.bytesIn, a.snapshot.bytesIn, seconds)
    const outMbps = bandwidthMbps(b.snapshot.bytesOut, a.snapshot.bytesOut, seconds)
    series.t.push(b.t)
    series.bandwidth.push(round((inMbps ?? 0) + (outMbps ?? 0), 2))
    series.quality.push(
      round(
        windowAverage(b.snapshot.qualitySum, b.snapshot.qualityCount, a.snapshot.qualitySum, a.snapshot.qualityCount),
        2
      )
    )
  }

  return { available: true, generatedAt: last.t, cards, series }
}
