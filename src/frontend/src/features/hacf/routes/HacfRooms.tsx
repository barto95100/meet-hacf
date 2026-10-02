import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import {
  RiArrowLeftLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiLoginBoxLine,
  RiCheckLine,
} from '@remixicon/react'
import { css, cx } from '@/styled-system/css'
import { Screen } from '@/layout/Screen'
import { UserAware } from '@/features/auth/components/UserAware'
import { useUser } from '@/features/auth/api/useUser'
import { HacfHeader } from '../components/HacfHeader'
import { hacfCssVars } from '../theme'
import { ghostButton, lightButton } from '../styles/buttons'
import { avatarUrl, useSupervisionAccess } from '../api/supervision'
import {
  ManagedRoom,
  RoomOwner,
  roomUrl,
  useAllRooms,
  useDeleteRoom,
  useMyRooms,
} from '../api/rooms'

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const ownerInitials = (owner: RoomOwner | null) => {
  const label = owner?.name || owner?.email || '?'
  const words = label.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0][0]
  return (letters || '?').toUpperCase()
}

/** Authentik photo of an owner, over the initials when there is one. */
const OwnerAvatar = ({ owner }: { owner: RoomOwner | null }) => {
  const [ok, setOk] = useState(false)
  return (
    <span
      aria-hidden="true"
      className={css({
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,.08)',
        color: 'var(--hacf-text)',
        fontSize: '12px',
        fontWeight: 600,
        overflow: 'hidden',
        position: 'relative',
      })}
    >
      {ownerInitials(owner)}
      {!!owner?.email && (
        <img
          src={avatarUrl(owner.email)}
          alt=""
          onLoad={() => setOk(true)}
          onError={() => setOk(false)}
          className={css({
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          })}
          style={{ visibility: ok ? 'visible' : 'hidden' }}
        />
      )}
    </span>
  )
}

const Badge = ({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'live'
}) => (
  <span
    className={css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      height: '22px',
      paddingX: '9px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '.02em',
    })}
    style={
      tone === 'live'
        ? { backgroundColor: 'oklch(72% 0.17 150 / .16)', color: 'oklch(84% 0.14 150)' }
        : { backgroundColor: 'rgba(255,255,255,.07)', color: 'var(--hacf-text-subtle)' }
    }
  >
    {tone === 'live' && (
      <span
        className={css({
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
        })}
      />
    )}
    {children}
  </span>
)

const smallButton = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '34px',
  paddingX: '14px',
  fontSize: '13px',
})

const RoomCard = ({
  room,
  meetUrl,
  canManage,
}: {
  room: ManagedRoom
  meetUrl: string | null
  canManage: boolean
}) => {
  const { t } = useTranslation('hacf', { keyPrefix: 'rooms' })
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const deleteRoom = useDeleteRoom()
  const url = roomUrl(meetUrl, room.slug)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard denied: ignore */
    }
  }

  return (
    <li
      className={css({
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px 16px',
        padding: '16px 18px',
        borderRadius: '16px',
        backgroundColor: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
      })}
    >
      <div className={css({ flex: '1 1 240px', minWidth: 0 })}>
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          })}
        >
          <span
            className={css({
              fontSize: '16px',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            })}
          >
            {room.name || room.slug}
          </span>
          {room.live && (
            <Badge tone="live">
              {t('live', { count: room.participantCount })}
            </Badge>
          )}
        </div>
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '5px',
            fontSize: '13px',
            color: 'var(--hacf-text-subtle)',
          })}
        >
          <span className={css({ fontFamily: 'var(--hacf-font-mono)' })}>
            /{room.slug}
          </span>
          {room.createdAt && (
            <span>· {t('created', { date: dateFmt.format(room.createdAt) })}</span>
          )}
        </div>
      </div>

      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        })}
      >
        <a
          href={url}
          className={cx(lightButton, smallButton)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <RiLoginBoxLine size={15} aria-hidden="true" />
          {t('join')}
        </a>
        <button type="button" onClick={copy} className={cx(ghostButton, smallButton)}>
          {copied ? (
            <RiCheckLine size={15} aria-hidden="true" />
          ) : (
            <RiFileCopyLine size={15} aria-hidden="true" />
          )}
          {copied ? t('copied') : t('copy')}
        </button>
        {canManage &&
          (confirming ? (
            <span className={css({ display: 'inline-flex', gap: '6px' })}>
              <button
                type="button"
                onClick={() => deleteRoom.mutate(room.slug)}
                disabled={deleteRoom.isPending}
                className={cx(ghostButton, smallButton)}
                style={{
                  borderColor: 'var(--hacf-error)',
                  color: 'var(--hacf-error)',
                }}
              >
                {t('confirmDelete')}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={cx(ghostButton, smallButton)}
              >
                {t('cancel')}
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={t('delete')}
              title={t('delete')}
              className={cx(ghostButton, smallButton)}
            >
              <RiDeleteBinLine size={15} aria-hidden="true" />
            </button>
          ))}
      </div>
    </li>
  )
}

const sectionTitle = css({
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: 'var(--hacf-text-muted)',
  margin: '0 0 14px',
})

const emptyText = css({
  margin: 0,
  padding: '28px 18px',
  textAlign: 'center',
  color: 'var(--hacf-text-subtle)',
  fontSize: '14px',
  borderRadius: '16px',
  border: '1px dashed rgba(255,255,255,.12)',
})

const listReset = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
})

/** Admin view: everyone's rooms grouped by owner. */
const AllRoomsSection = ({ myUserId }: { myUserId: string | undefined }) => {
  const { t } = useTranslation('hacf', { keyPrefix: 'rooms' })
  const { data } = useAllRooms(true)

  const groups = useMemo(() => {
    const byOwner = new Map<string, { owner: RoomOwner | null; rooms: ManagedRoom[] }>()
    for (const room of data?.rooms ?? []) {
      // The viewer's own rooms already appear under "My rooms"; this admin
      // view is about the other users' rooms.
      if (myUserId && room.owner?.id === myUserId) continue
      const key = room.owner?.id || '—'
      if (!byOwner.has(key)) byOwner.set(key, { owner: room.owner, rooms: [] })
      byOwner.get(key)!.rooms.push(room)
    }
    return Array.from(byOwner.values()).sort((a, b) => {
      // Live rooms first, then by owner name.
      const liveA = a.rooms.some((r) => r.live) ? 1 : 0
      const liveB = b.rooms.some((r) => r.live) ? 1 : 0
      if (liveA !== liveB) return liveB - liveA
      return (a.owner?.name || a.owner?.email || '').localeCompare(
        b.owner?.name || b.owner?.email || ''
      )
    })
  }, [data, myUserId])

  if (!data?.available) return null

  return (
    <section
      className={css({ marginTop: '44px' })}
      aria-label={t('allTitle')}
    >
      <h2 className={sectionTitle}>{t('allTitle')}</h2>
      {groups.length === 0 ? (
        <p className={emptyText}>{t('allEmpty')}</p>
      ) : (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '26px' })}>
          {groups.map((group, i) => (
            <div key={group.owner?.id || i}>
              <div
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '10px',
                })}
              >
                <OwnerAvatar owner={group.owner} />
                <div className={css({ minWidth: 0 })}>
                  <div
                    className={css({
                      fontSize: '14px',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    })}
                  >
                    {group.owner?.name || group.owner?.email || t('unknownOwner')}
                  </div>
                  <div
                    className={css({
                      fontSize: '12px',
                      color: 'var(--hacf-text-subtle)',
                    })}
                  >
                    {t('roomCount', { count: group.rooms.length })}
                  </div>
                </div>
              </div>
              <ul className={listReset}>
                {group.rooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    meetUrl={data.meetUrl}
                    canManage={false}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const HacfRooms = () => {
  const { t } = useTranslation('hacf', { keyPrefix: 'rooms' })
  const { user, isLoggedIn } = useUser()
  const isAdmin = useSupervisionAccess()
  const { data: mine, isLoading } = useMyRooms()

  return (
    <UserAware>
      <Screen header={false} footer={false}>
        <div
          style={hacfCssVars}
          className={css({
            position: 'relative',
            isolation: 'isolate',
            containerType: 'inline-size',
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            minHeight: '100%',
            backgroundColor: 'var(--hacf-bg)',
            color: 'var(--hacf-text)',
            fontFamily: 'var(--hacf-font)',
          })}
        >
          <HacfHeader />
          <main
            className={css({
              width: '100%',
              maxWidth: '880px',
              margin: '0 auto',
              padding: '8px clamp(20px, 5cqw, 64px) 72px',
            })}
          >
            <Link
              to="/"
              className={css({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: 'var(--hacf-text-subtle)',
                textDecoration: 'none',
                marginBottom: '18px',
                borderRadius: '6px',
                _hover: { color: 'var(--hacf-text)' },
                _focusVisible: {
                  outline: '2px solid var(--hacf-text)',
                  outlineOffset: '2px',
                },
              })}
            >
              <RiArrowLeftLine size={15} aria-hidden="true" />
              {t('back')}
            </Link>

            <h1
              className={css({
                margin: '0 0 6px',
                fontSize: 'clamp(28px, 4cqw, 40px)',
                fontWeight: 600,
                letterSpacing: '-.03em',
              })}
            >
              {t('title')}
            </h1>
            <p
              className={css({
                margin: '0 0 30px',
                fontSize: '15px',
                color: 'var(--hacf-text-soft)',
              })}
            >
              {t('subtitle')}
            </p>

            {!isLoggedIn ? (
              <p className={emptyText}>{t('loginRequired')}</p>
            ) : (
              <>
                <section aria-label={t('mineTitle')}>
                  <h2 className={sectionTitle}>{t('mineTitle')}</h2>
                  {isLoading ? (
                    <p className={emptyText}>{t('loading')}</p>
                  ) : !mine?.available ? (
                    <p className={emptyText}>{t('unavailable')}</p>
                  ) : mine.rooms.length === 0 ? (
                    <p className={emptyText}>{t('mineEmpty')}</p>
                  ) : (
                    <ul className={listReset}>
                      {mine.rooms.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          meetUrl={mine.meetUrl}
                          canManage
                        />
                      ))}
                    </ul>
                  )}
                </section>

                {isAdmin && <AllRoomsSection myUserId={user?.id} />}
              </>
            )}
          </main>
        </div>
      </Screen>
    </UserAware>
  )
}

export default HacfRooms
