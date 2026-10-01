import { useQuery } from '@tanstack/react-query'
import { useUser } from '@/features/auth/api/useUser'

/**
 * HACF supervision service (src/hacf-supervision), served on the same origin
 * under /supervision by the reverse proxy. It decides who may see the
 * supervision (Meet login + Authentik group) and serves Authentik avatars.
 */
export const SUPERVISION_PATH = '/supervision'

export const supervisionPageUrl = (roomId?: string) =>
  `${SUPERVISION_PATH}/${roomId ? `?room=${encodeURIComponent(roomId)}` : ''}`

export const avatarUrl = (identity: string) =>
  `${SUPERVISION_PATH}/api/avatar/${encodeURIComponent(identity)}`

/** True when the logged-in user may open the supervision page. */
export const useSupervisionAccess = () => {
  const { isLoggedIn } = useUser()
  const { data } = useQuery({
    queryKey: ['hacf', 'supervision-access'],
    queryFn: async () => {
      const response = await fetch(`${SUPERVISION_PATH}/api/access`, {
        credentials: 'same-origin',
      })
      if (!response.ok) return false
      const body = await response.json().catch(() => null)
      return body?.allowed === true
    },
    enabled: !!isLoggedIn,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  return !!isLoggedIn && data === true
}
