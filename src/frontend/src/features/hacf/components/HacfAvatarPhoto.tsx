import { useState } from 'react'
import { useMaybeParticipantContext } from '@livekit/components-react'
import { css } from '@/styled-system/css'
import { useUser } from '@/features/auth/api/useUser'
import { avatarUrl } from '../api/supervision'

const Photo = ({ identity }: { identity: string }) => {
  const [status, setStatus] = useState<'loading' | 'ok' | 'none'>('loading')
  if (status === 'none') return null
  return (
    <img
      src={avatarUrl(identity)}
      alt=""
      aria-hidden="true"
      onLoad={() => setStatus('ok')}
      onError={() => setStatus('none')}
      className={css({
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        objectFit: 'cover',
        // Same color as the avatar circle, so the initials don't show through
        // pictures with transparency.
        backgroundColor: 'inherit',
      })}
      style={{ visibility: status === 'ok' ? 'visible' : 'hidden' }}
    />
  )
}

/**
 * Authentik avatar of the participant whose tile is being rendered (LiveKit
 * participant context), laid over the upstream initials. Only for members
 * logged in through Authentik, and only shown to logged-in viewers (the
 * avatar endpoint refuses anonymous visitors). Without a picture, or outside
 * a participant tile, nothing is rendered and the initials stay visible.
 */
export const HacfAvatarPhoto = () => {
  const participant = useMaybeParticipantContext()
  const { isLoggedIn } = useUser()

  if (
    !isLoggedIn ||
    !participant?.identity ||
    participant.attributes?.is_authenticated !== 'true'
  ) {
    return null
  }
  // Keyed by identity: a tile reused for another participant starts over.
  return <Photo key={participant.identity} identity={participant.identity} />
}
