import { useTranslation } from 'react-i18next'
import { css, cx } from '@/styled-system/css'
import { Screen } from '@/layout/Screen'
import { UserAware } from '@/features/auth/components/UserAware'
import { useUser } from '@/features/auth/api/useUser'
import { authUrl } from '@/features/auth/utils/authUrl'
import { useConfig } from '@/api/useConfig'
import { LoginButton } from '@/components/LoginButton'
import { HacfHeader } from '../components/HacfHeader'
import { HacfJoinForm } from '../components/HacfJoinForm'
import { HacfCreateActions } from '../components/HacfCreateActions'
import { ghostButton } from '../styles/buttons'
import { hacfCssVars } from '../theme'

const HacfLoginButton = () => {
  const { t } = useTranslation('global', { keyPrefix: 'login' })
  const { data } = useConfig()

  // Keep upstream behavior (ProConnect button) when the backend requests it.
  if (data?.use_proconnect_button) return <LoginButton proConnectHint={false} />

  return (
    <a
      href={authUrl()}
      data-attr="login"
      className={cx(
        ghostButton,
        css({ height: '46px', paddingX: '24px', fontSize: '15px' })
      )}
    >
      {t('buttonLabel')}
    </a>
  )
}

const HacfHome = () => {
  const { t } = useTranslation('hacf')
  const { isLoggedIn } = useUser()

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
            overflow: 'hidden',
            backgroundColor: 'var(--hacf-bg)',
            color: 'var(--hacf-text)',
            fontFamily: 'var(--hacf-font)',
          })}
        >
          {/* Blurred brand halo behind the heading */}
          <div
            aria-hidden="true"
            className={css({
              position: 'absolute',
              left: '50%',
              top: '48%',
              width: 'min(1000px, 140%)',
              aspectRatio: '2.2 / 1',
              transform: 'translate(-50%, -50%)',
              backgroundImage:
                'radial-gradient(closest-side at 22% 55%, oklch(55% 0.22 262 / .5), transparent), radial-gradient(closest-side at 50% 45%, oklch(52% 0.17 330 / .4), transparent), radial-gradient(closest-side at 78% 58%, oklch(60% 0.22 28 / .35), transparent)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
              zIndex: -1,
            })}
          />

          <HacfHeader />

          <section
            aria-labelledby="hacf-home-heading"
            className={css({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '28px',
              padding: '24px clamp(20px, 5cqw, 64px) 64px',
              _motionSafe: {
                opacity: 0,
                animation: '.5s ease-in fade 0s forwards',
              },
            })}
          >
            <p
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: 1.4,
                letterSpacing: '.24em',
                textTransform: 'uppercase',
                color: 'var(--hacf-text-muted)',
                _before: {
                  content: '""',
                  width: '28px',
                  height: '1px',
                  flex: 'none',
                  backgroundColor: 'rgba(255,255,255,.4)',
                },
                _after: {
                  content: '""',
                  width: '28px',
                  height: '1px',
                  flex: 'none',
                  backgroundColor: 'rgba(255,255,255,.4)',
                },
              })}
            >
              {t('eyebrow')}
            </p>
            <h1
              id="hacf-home-heading"
              className={css({
                margin: 0,
                fontSize: 'clamp(40px, 7.4cqw, 96px)',
                lineHeight: 1.02,
                fontWeight: 500,
                letterSpacing: '-.045em',
                maxWidth: '980px',
                textWrap: 'balance',
              })}
            >
              {t('heading')}{' '}
              <span
                className={css({
                  backgroundImage: 'var(--hacf-gradient-text)',
                  backgroundClip: 'text',
                  color: 'transparent',
                })}
              >
                {t('headingHighlight')}
              </span>
            </h1>
            <p
              className={css({
                margin: 0,
                fontSize: '18px',
                lineHeight: 1.6,
                color: 'var(--hacf-text-soft)',
                maxWidth: '580px',
                textWrap: 'pretty',
              })}
            >
              {t('intro')}
            </p>

            <HacfJoinForm isLoggedIn={!!isLoggedIn} />

            {isLoggedIn ? (
              <HacfCreateActions />
            ) : (
              <div
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                })}
              >
                <span
                  className={css({
                    fontSize: '14px',
                    lineHeight: 1.4,
                    color: 'var(--hacf-text-subtle)',
                  })}
                >
                  {t('memberPrompt')}
                </span>
                <HacfLoginButton />
              </div>
            )}
          </section>
        </div>
      </Screen>
    </UserAware>
  )
}

export default HacfHome
