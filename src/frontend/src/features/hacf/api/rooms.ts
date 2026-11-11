import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '@/api/fetchApi'
import type { ApiError } from '@/api/ApiError'
import { useUser } from '@/features/auth/api/useUser'
import { SUPERVISION_PATH } from './supervision'

/**
 * Room management ("Mes salles" / "Toutes les salles").
 *
 * Listing is read from the HACF supervision service, which reads Meet's
 * database directly: the browser-session Meet API has no endpoint that lists
 * rooms (RoomViewSet exposes only create/update/destroy), so there is no other
 * way to show a user their own rooms, let alone every room for the admin view.
 *
 * Mutations (delete) still go through the Meet API, so Meet keeps enforcing its
 * own permissions (only an owner can delete a room).
 */

export type RoomOwner = {
  id: string
  email: string | null
  name: string | null
}

export type ManagedRoom = {
  id: string
  slug: string
  name: string | null
  accessLevel: string | null
  createdAt: number | null
  lastStartedAt: number | null
  deletedAt?: number | null
  owner: RoomOwner | null
  live: boolean
  participantCount: number
}

type RoomsResponse = {
  available: boolean
  canDelete?: boolean
  generatedAt?: number
  meetUrl?: string | null
  rooms?: ManagedRoom[]
  deletedRooms?: ManagedRoom[]
}

export type RoomsView = {
  available: boolean
  canDelete: boolean
  meetUrl: string | null
  rooms: ManagedRoom[]
  deletedRooms: ManagedRoom[]
}

const EMPTY: RoomsView = {
  available: false,
  canDelete: false,
  meetUrl: null,
  rooms: [],
  deletedRooms: [],
}

const fetchRooms = async (path: string): Promise<RoomsView> => {
  const response = await fetch(`${SUPERVISION_PATH}/api/${path}`, {
    credentials: 'same-origin',
  })
  if (!response.ok) return EMPTY
  const body = (await response.json().catch(() => null)) as RoomsResponse | null
  if (!body?.available) return EMPTY
  return {
    available: true,
    canDelete: body.canDelete ?? false,
    meetUrl: body.meetUrl ?? null,
    rooms: body.rooms ?? [],
    deletedRooms: body.deletedRooms ?? [],
  }
}

/** The rooms owned by the logged-in user. */
export const useMyRooms = () => {
  const { isLoggedIn } = useUser()
  return useQuery({
    queryKey: ['hacf', 'my-rooms'],
    queryFn: () => fetchRooms('my-rooms'),
    enabled: !!isLoggedIn,
    staleTime: 30 * 1000,
    retry: false,
  })
}

/** Every room of every user (admin view). Only call when the user is allowed. */
export const useAllRooms = (enabled: boolean) =>
  useQuery({
    queryKey: ['hacf', 'all-rooms'],
    queryFn: () => fetchRooms('all-rooms'),
    enabled,
    staleTime: 30 * 1000,
    retry: false,
  })

/** Delete a room through the Meet API (the backend checks ownership). */
export const useDeleteRoom = () => {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string>({
    mutationFn: (slug: string) =>
      fetchApi<void>(`rooms/${encodeURIComponent(slug)}/`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hacf', 'my-rooms'] })
      queryClient.invalidateQueries({ queryKey: ['hacf', 'all-rooms'] })
    },
  })
}

/**
 * Admin room actions through the supervision service (the Meet API only lets an
 * owner act on their own room). The service checks the Infra group; the custom
 * header is required server-side as a CSRF guard.
 *
 * - delete  → DELETE /rooms/<slug>          soft-delete (reversible)
 * - restore → POST   /rooms/<slug>/restore  undo a soft-delete
 * - purge   → POST   /rooms/<slug>/purge    permanent, irreversible
 */
const adminRoomAction =
  (suffix: '' | '/restore' | '/purge') => async (slug: string) => {
    const response = await fetch(
      `${SUPERVISION_PATH}/api/rooms/${encodeURIComponent(slug)}${suffix}`,
      {
        method: suffix ? 'POST' : 'DELETE',
        credentials: 'same-origin',
        headers: { 'x-hacf-supervision': '1' },
      }
    )
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean
    } | null
    if (!response.ok || !body?.ok) throw new Error('action_failed')
  }

const useAdminRoomMutation = (suffix: '' | '/restore' | '/purge') => {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: adminRoomAction(suffix),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hacf', 'my-rooms'] })
      queryClient.invalidateQueries({ queryKey: ['hacf', 'all-rooms'] })
    },
  })
}

export const useAdminDeleteRoom = () => useAdminRoomMutation('')
export const useAdminRestoreRoom = () => useAdminRoomMutation('/restore')
export const useAdminPurgeRoom = () => useAdminRoomMutation('/purge')

/** Public URL of a room, for joining or copying. */
export const roomUrl = (meetUrl: string | null, slug: string) => {
  const base = (meetUrl || window.location.origin).replace(/\/$/, '')
  return `${base}/${slug}`
}
