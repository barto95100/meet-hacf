import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import {
  Button as RACButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from 'react-aria-components'
import { css } from '@/styled-system/css'
import { useUser } from '@/features/auth/api/useUser'
import { logout } from '@/features/auth/utils/logout'
import { SettingsButton } from '@/features/settings'
import { RiDashboard3Line } from '@remixicon/react'
import {
  avatarUrl,
  supervisionPageUrl,
  useSupervisionAccess,
} from '../api/supervision'
import hacfBanner from '../assets/images/hacf-banner-light-text.webp'

const getInitials = (fullName?: string, email?: string) => {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length) {
    const letters =
      words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0][0]
    return letters.toUpperCase()
  }
  return (email?.[0] ?? '?').toUpperCase()
}

const Avatar = ({
  initials,
  size,
}: {
  initials: string
  size: 'sm' | 'md'
}) => (
  <span
    aria-hidden="true"
    className={css({
      flex: 'none',
      display: 'block',
      borderRadius: '50%',
      padding: '1.5px',
      backgroundImage: 'var(--hacf-gradient-avatar)',
    })}
    style={{
      width: size === 'sm' ? '36px' : '44px',
      height: size === 'sm' ? '36px' : '44px',
    }}
  >
    <span
      className={css({
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        backgroundColor: 'var(--hacf-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--hacf-text)',
        fontWeight: 600,
        position: 'relative',
        overflow: 'hidden',
      })}
      style={{ fontSize: size === 'sm' ? '12px' : '13px' }}
    >
      {initials}
      <MyPhoto />
    </span>
  </span>
)

/** The logged-in user's Authentik avatar, over the initials when there is one. */
const MyPhoto = () => {
  const [status, setStatus] = useState<'loading' | 'ok' | 'none'>('loading')
  if (status === 'none') return null
  return (
    <img
      src={avatarUrl('me')}
      alt=""
      onLoad={() => setStatus('ok')}
      onError={() => setStatus('none')}
      className={css({
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        backgroundColor: 'var(--hacf-surface)',
      })}
      style={{ visibility: status === 'ok' ? 'visible' : 'hidden' }}
    />
  )
}

/** Link to the supervision page, for members of the allowed Authentik group. */
const SupervisionLink = () => {
  const { t } = useTranslation('hacf', { keyPrefix: 'supervision' })
  if (!useSupervisionAccess()) return null
  return (
    <a
      href={supervisionPageUrl()}
      title={t('label')}
      className={css({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '36px',
        paddingX: { base: '9px', sm: '14px' },
        borderRadius: '999px',
        border: '1px solid rgba(255,255,255,.16)',
        color: 'var(--hacf-text-muted)',
        fontSize: '13px',
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'color 150ms, border-color 150ms',
        _hover: { color: '#fff', borderColor: 'rgba(255,255,255,.35)' },
        _focusVisible: {
          outline: '2px solid var(--hacf-text)',
          outlineOffset: '2px',
        },
      })}
    >
      <RiDashboard3Line size={16} aria-hidden="true" />
      <span
        className={css({
          display: 'none',
          sm: { display: 'inline' },
        })}
      >
        {t('label')}
      </span>
      <span
        className={css({
          sm: { display: 'none' },
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clipPath: 'inset(50%)',
        })}
      >
        {t('label')}
      </span>
    </a>
  )
}

// Upstream settings button (blue icon, light hover): discreet version for the dark header.
const settingsButtonWrapper = css({
  display: 'flex',
  '& button': {
    color: 'var(--hacf-text-subtle)',
    borderRadius: '50%',
  },
  '& button[data-hovered], & button[data-pressed]': {
    color: 'var(--hacf-text)',
    backgroundColor: 'rgba(255,255,255,.08)',
  },
})

const focusRing = {
  _focusVisible: {
    outline: '2px solid var(--hacf-text)',
    outlineOffset: '2px',
  },
} as const

export const HacfHeader = () => {
  const { t } = useTranslation('hacf', { keyPrefix: 'header' })
  const { user } = useUser()

  const displayName = user?.full_name || user?.email || ''
  const initials = getInitials(user?.full_name, user?.email)

  return (
    <header
      className={css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '22px clamp(20px, 5cqw, 64px)',
      })}
    >
      <Link
        to="/"
        className={css({
          display: 'flex',
          minWidth: 0,
          borderRadius: '8px',
          ...focusRing,
        })}
      >
        <img
          src={hacfBanner}
          alt={t('brand')}
          width={812}
          height={132}
          className={css({
            display: 'block',
            width: { base: '246px', sm: '295px' },
            maxWidth: '100%',
            height: 'auto',
          })}
        />
      </Link>

      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: { base: '8px', sm: '12px' },
          flexShrink: 0,
        })}
      >
        {!!user && (
          <>
            {/* ≥ 640px: avatar, name and logout button */}
            <div
              className={css({
                display: 'none',
                sm: { display: 'flex' },
                alignItems: 'center',
                gap: '14px',
              })}
            >
              <div
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                })}
              >
                <Avatar initials={initials} size="sm" />
                <span
                  className={css({
                    fontSize: '14px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '20rem',
                  })}
                >
                  {displayName}
                </span>
              </div>
              <RACButton
                onPress={() => logout()}
                className={css({
                  height: '36px',
                  paddingX: '14px',
                  borderRadius: '999px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,.16)',
                  color: 'var(--hacf-text-muted)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 150ms, border-color 150ms',
                  '&[data-hovered]': {
                    color: '#fff',
                    borderColor: 'rgba(255,255,255,.35)',
                  },
                  ...focusRing,
                })}
              >
                {t('logout')}
              </RACButton>
            </div>

            {/* < 640px: avatar opening an account menu */}
            <div className={css({ sm: { display: 'none' } })}>
              <MenuTrigger>
                <RACButton
                  aria-label={t('accountMenu')}
                  className={css({
                    display: 'block',
                    padding: 0,
                    border: 0,
                    background: 'transparent',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    ...focusRing,
                  })}
                >
                  <Avatar initials={initials} size="md" />
                </RACButton>
                <Popover
                  placement="bottom end"
                  offset={10}
                  className={css({
                    minWidth: '220px',
                    maxWidth: 'calc(100vw - 40px)',
                    backgroundColor: '#15151c',
                    border: '1px solid rgba(255,255,255,.12)',
                    borderRadius: '18px',
                    padding: '8px',
                    boxShadow: '0 20px 50px -10px rgba(0,0,0,.7)',
                    color: '#f4f3f7',
                    fontFamily:
                      "'Inter Variable', Inter, system-ui, sans-serif",
                  })}
                >
                  <div
                    className={css({
                      padding: '12px 14px 10px',
                      marginBottom: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      borderBottom: '1px solid rgba(255,255,255,.08)',
                    })}
                  >
                    <span
                      className={css({
                        fontSize: '15px',
                        fontWeight: 600,
                        lineHeight: 1.3,
                        overflowWrap: 'anywhere',
                      })}
                    >
                      {displayName}
                    </span>
                    {!!user.full_name && (
                      <span
                        className={css({
                          fontSize: '12px',
                          lineHeight: 1.4,
                          color: '#a9a8b3',
                          overflowWrap: 'anywhere',
                        })}
                      >
                        {user.email}
                      </span>
                    )}
                  </div>
                  <Menu
                    aria-label={t('accountMenu')}
                    onAction={(key) => {
                      if (key === 'logout') logout()
                    }}
                    className={css({ outline: 'none' })}
                  >
                    <MenuItem
                      id="logout"
                      className={css({
                        display: 'flex',
                        alignItems: 'center',
                        height: '44px',
                        paddingX: '14px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        outline: 'none',
                        '&[data-hovered], &[data-focused]': {
                          backgroundColor: 'rgba(255,255,255,.06)',
                        },
                        '&[data-focus-visible]': {
                          outline: '2px solid #f4f3f7',
                          outlineOffset: '-2px',
                        },
                      })}
                    >
                      {t('logout')}
                    </MenuItem>
                  </Menu>
                </Popover>
              </MenuTrigger>
            </div>
          </>
        )}
        <SupervisionLink />
        <span className={settingsButtonWrapper}>
          <SettingsButton />
        </span>
      </div>
    </header>
  )
}
