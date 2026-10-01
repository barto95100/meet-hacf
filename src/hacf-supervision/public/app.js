// HACF Meet supervision page (read-only). No dependencies, no build step.
const API = './api'
const REFRESH_MS = 10_000

const $ = (id) => document.getElementById(id)
const highlighted = new URLSearchParams(location.search).get('room')
let timer = null
let loading = false

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue
    if (key === 'class') node.className = value
    else node.setAttribute(key, value === true ? '' : value)
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue
    node.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return node
}

const ICONS = {
  microphone:
    '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/>',
  camera: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  screenShare:
    '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M12 13V8M9.5 10.5 12 8l2.5 2.5"/>',
}

const DEVICE_LABELS = {
  microphone: ['Micro actif', 'Micro coupé'],
  camera: ['Caméra active', 'Caméra coupée'],
  screenShare: ['Partage d’écran en cours', 'Pas de partage d’écran'],
}

const icon = (name) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.innerHTML = ICONS[name]
  return svg
}

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0])
    .join('')
    .toUpperCase() || '?'

const since = (timestamp) => {
  if (!timestamp) return ''
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `depuis ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `depuis ${hours} h${rest ? ` ${String(rest).padStart(2, '0')}` : ''}`
}

const timeOf = (timestamp) =>
  new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const ROLES = { owner: 'Organisateur', administrator: 'Administrateur' }

const avatar = (participant) => {
  const box = el('span', { class: 'avatar', 'aria-hidden': 'true' }, el('span', {}, initials(participant.name)))
  if (participant.isAuthenticated) {
    const img = el('img', {
      src: `${API}/avatar/${encodeURIComponent(participant.identity)}`,
      alt: '',
      loading: 'lazy',
    })
    img.addEventListener('error', () => img.remove())
    box.append(img)
  }
  return box
}

const participantItem = (participant) =>
  el(
    'li',
    { class: 'participant' },
    avatar(participant),
    el(
      'span',
      { class: 'who' },
      el('span', { class: 'name' }, participant.name),
      el(
        'span',
        { class: 'details' },
        el('span', {}, participant.isAuthenticated ? 'Membre connecté' : 'Invité'),
        ROLES[participant.role] && el('span', {}, ROLES[participant.role]),
        participant.kind !== 'standard' && el('span', {}, participant.kind),
        participant.joinedAt &&
          el('span', { title: `Arrivé à ${timeOf(participant.joinedAt)}` }, since(participant.joinedAt))
      )
    ),
    el(
      'span',
      { class: 'devices' },
      ['microphone', 'camera', 'screenShare'].map((device) => {
        const on = participant[device]
        const label = DEVICE_LABELS[device][on ? 0 : 1]
        return el(
          'span',
          { class: `device${on ? ' on' : ''}`, title: label },
          icon(device),
          el('span', { class: 'visually-hidden' }, label)
        )
      })
    )
  )

const roomCard = (room, meetUrl) => {
  const count = room.participants.length
  const link = `${meetUrl || location.origin}/${encodeURIComponent(room.name)}`
  return el(
    'article',
    {
      class: `room${room.name === highlighted ? ' highlight' : ''}`,
      id: `room-${room.name}`,
      'aria-labelledby': `title-${room.name}`,
    },
    el(
      'div',
      { class: 'room-head' },
      el(
        'div',
        {},
        el('h2', { id: `title-${room.name}` }, room.name),
        el(
          'div',
          { class: 'room-meta' },
          el('span', {}, `${count} participant${count > 1 ? 's' : ''}`),
          room.createdAt && el('span', { title: `Démarrée à ${timeOf(room.createdAt)}` }, `démarrée ${since(room.createdAt)}`),
          room.activeRecording && el('span', { class: 'badge rec' }, 'Enregistrement en cours'),
          room.name === highlighted && el('span', { class: 'badge' }, 'Votre réunion')
        )
      ),
      el('a', { class: 'button', href: link, target: '_blank', rel: 'noopener noreferrer' }, 'Rejoindre')
    ),
    count
      ? el('ul', { class: 'participants', 'aria-label': `Participants de ${room.name}` }, room.participants.map(participantItem))
      : el('p', { class: 'empty' }, 'Personne pour le moment.')
  )
}

const svgNS = 'http://www.w3.org/2000/svg'
const svgEl = (tag, attrs) => {
  const node = document.createElementNS(svgNS, tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  return node
}

const sparkline = (values) => {
  const points = values.filter((v) => v !== null && v !== undefined)
  if (points.length < 2) return null
  const max = Math.max(...points, 0.01)
  const w = 160
  const h = 32
  const step = w / (values.length - 1)
  let d = ''
  values.forEach((v, i) => {
    if (v === null || v === undefined) return
    const x = (i * step).toFixed(1)
    const y = (h - 2 - (v / max) * (h - 4)).toFixed(1)
    d += `${d ? 'L' : 'M'}${x} ${y}`
  })
  const svg = svgEl('svg', { class: 'spark', viewBox: `0 0 ${w} ${h}`, 'aria-hidden': 'true' })
  const defs = svgEl('defs', {})
  const grad = svgEl('linearGradient', { id: 'spark-gradient', x1: '0', y1: '0', x2: '1', y2: '0' })
  grad.append(
    svgEl('stop', { offset: '0', 'stop-color': 'oklch(55% 0.22 262)' }),
    svgEl('stop', { offset: '0.5', 'stop-color': 'oklch(52% 0.17 330)' }),
    svgEl('stop', { offset: '1', 'stop-color': 'oklch(60% 0.22 28)' })
  )
  defs.append(grad)
  svg.append(defs, svgEl('path', { d }))
  return svg
}

const metricCard = (card) =>
  el(
    'div',
    { class: `metric ${card.tone || 'neutral'}` },
    el('div', { class: 'm-value' }, String(card.value), el('span', { class: 'm-unit' }, card.unit || '')),
    el('div', { class: 'm-label' }, card.label)
  )

const renderServer = (metrics) => {
  const section = $('server')
  if (!metrics || !metrics.available || metrics.pending || !metrics.cards?.length) {
    section.hidden = true
    return
  }
  section.hidden = false
  $('server-cards').replaceChildren(...metrics.cards.map(metricCard))
  const spark = sparkline(metrics.series?.bandwidth || [])
  $('server-spark').replaceChildren(
    ...(spark ? [spark, el('span', { class: 'visually-hidden' }, 'Débit sur la dernière heure')] : [])
  )
}

const stat = (value, label) => el('div', { class: 'stat' }, el('strong', {}, value), el('span', {}, label))

const render = ({ rooms, meetUrl, generatedAt }) => {
  const participants = rooms.reduce((sum, room) => sum + room.participants.length, 0)
  const sharing = rooms.reduce((sum, room) => sum + room.participants.filter((p) => p.screenShare).length, 0)
  const guests = rooms.reduce((sum, room) => sum + room.participants.filter((p) => !p.isAuthenticated).length, 0)

  $('message').hidden = true
  $('heading').hidden = false
  $('summary').hidden = false
  $('summary').replaceChildren(
    stat(rooms.length, rooms.length > 1 ? 'réunions en cours' : 'réunion en cours'),
    stat(participants, participants > 1 ? 'participants' : 'participant'),
    stat(guests, guests > 1 ? 'invités sans compte' : 'invité sans compte'),
    stat(sharing, sharing > 1 ? 'partages d’écran' : 'partage d’écran')
  )
  $('rooms').replaceChildren(
    ...(rooms.length
      ? rooms.map((room) => roomCard(room, meetUrl))
      : [el('p', { class: 'empty' }, 'Aucune réunion en cours.')])
  )
  $('status').textContent = `Mis à jour à ${timeOf(generatedAt)}`
}

const showMessage = (title, body, link) => {
  $('heading').hidden = true
  $('summary').hidden = true
  $('server').hidden = true
  $('rooms').replaceChildren()
  $('message').hidden = false
  $('message-title').textContent = title
  $('message-body').textContent = body
  $('message-link').hidden = !link
  if (link) {
    $('message-link').textContent = link.label
    $('message-link').href = link.href
    $('message-link').className = 'button primary'
  }
  $('status').textContent = ''
}

const load = async () => {
  if (loading) return
  loading = true
  try {
    const res = await fetch(`${API}/rooms`, { credentials: 'same-origin', cache: 'no-store' })
    if (res.status === 401) {
      stop()
      return showMessage(
        'Connexion requise',
        'Connectez-vous à HACF Meet, puis revenez sur cette page.',
        { label: 'Aller sur HACF Meet', href: '/' }
      )
    }
    if (res.status === 403) {
      stop()
      const { group } = await res.json().catch(() => ({}))
      return showMessage(
        'Accès réservé',
        `Cette page est réservée aux membres du groupe ${group || 'autorisé'}.`,
        { label: 'Retour à l’accueil', href: '/' }
      )
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const first = !$('rooms').children.length
    render(data)
    fetch(`${API}/metrics`, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(renderServer)
      .catch(() => {})
    if (first && highlighted) document.getElementById(`room-${highlighted}`)?.scrollIntoView({ block: 'center' })
  } catch {
    $('status').textContent = 'Impossible de joindre le serveur, nouvel essai dans 10 secondes…'
  } finally {
    loading = false
  }
}

const start = () => {
  stop()
  timer = setInterval(() => document.visibilityState === 'visible' && load(), REFRESH_MS)
}

const stop = () => {
  if (timer) clearInterval(timer)
  timer = null
}

$('refresh').addEventListener('click', () => {
  load()
  start()
})
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && load())

load()
start()
