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
  owner: RoomOwner | null
  live: boolean
  participantCount: number
}

type RoomsResponse = {
  available: boolean
  generatedAt?: number
  meetUrl?: string | null
  rooms?: ManagedRoom[]
}

export type RoomsView = {
  available: boolean
  meetUrl: string | null
  rooms: ManagedRoom[]
}

const EMPTY: RoomsView = { available: false, meetUrl: null, rooms: [] }

const fetchRooms = async (path: string): Promise<RoomsView> => {
  const response = await fetch(`${SUPERVISION_PATH}/api/${path}`, {
    credentials: 'same-origin',
  })
  if (!response.ok) return EMPTY
  const body = (await response.json().catch(() => null)) as RoomsResponse | null
  if (!body?.available) return EMPTY
  return {
    available: true,
    meetUrl: body.meetUrl ?? null,
    rooms: body.rooms ?? [],
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

/** Public URL of a room, for joining or copying. */
export const roomUrl = (meetUrl: string | null, slug: string) => {
  const base = (meetUrl || window.location.origin).replace(/\/$/, '')
  return `${base}/${slug}`
}
