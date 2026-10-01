export const roomIdPattern = '[a-z]{3}-[a-z]{4}-[a-z]{3}'

// HACF: besides generated codes, rooms may have a readable name (lowercase
// letters, digits and single hyphens, 3 to 60 characters), e.g. atelier-zigbee.
// Paths used by other pages or by the server can't be room names.
const reservedNames =
  'feedback|test-connection|mentions-legales|accessibilite|conditions-utilisation|' +
  'api|admin|static|assets|media|custom|licenses|sdk|recording'

export const roomNamePattern = `(?!(?:${reservedNames})$)(?=[a-z0-9-]{3,60}$)[a-z0-9]+(?:-[a-z0-9]+)*`

// Case-insensitive and with optional hyphens
export const flexibleRoomIdPattern = `(?!(?:${reservedNames})$)(?=[a-zA-Z0-9-]{3,60}$)[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*`

const roomNameRegex = new RegExp(`^${roomNamePattern}$`)
// A generated code, possibly typed without hyphens (abcdefghij)
const codeLikeRegex = /^[a-z0-9]{3}-?[a-z0-9]{4}-?[a-z0-9]{3}$/i
const canonicalCodeRegex = /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/

export const isRoomValid = (roomIdOrUrl: string) => {
  const prefix = `${window.location.origin}/`
  const roomId = roomIdOrUrl.startsWith(prefix)
    ? roomIdOrUrl.slice(prefix.length)
    : roomIdOrUrl
  return (
    roomNameRegex.test(roomId) &&
    (!codeLikeRegex.test(roomId) || canonicalCodeRegex.test(roomId))
  )
}

export const normalizeRoomId = (roomId: string) => {
  const lowerId = roomId.toLowerCase()
  if (!codeLikeRegex.test(lowerId)) return lowerId
  const cleanId = lowerId.replace(/-/g, '')
  return `${cleanId.slice(0, 3)}-${cleanId.slice(3, 7)}-${cleanId.slice(7, 10)}`
}
