import { FormEvent, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { css, cx } from '@/styled-system/css'
import { navigateTo } from '@/navigation/navigateTo'
import { isRoomValid } from '@/features/rooms'
import { gradientButton, lightButton } from '../styles/buttons'

type JoinError = 'empty' | 'invalid' | null

/**
 * Room code capsule. Same validation and navigation as the upstream
 * JoinMeetingDialog, only the interface differs.
 */
export const HacfJoinForm = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  const { t } = useTranslation('hacf', { keyPrefix: 'join' })
  const { t: tHome } = useTranslation('home')
  const [value, setValue] = useState('')
  const [error, setError] = useState<JoinError>(null)
  const errorId = useId()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return setError('empty')
    if (!isRoomValid(trimmed)) return setError('invalid')
    const roomId = trimmed.replace(`${window.location.origin}/`, '')
    navigateTo('room', roomId)
  }

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
        maxWidth: '640px',
        marginTop: '8px',
      })}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          backgroundColor: 'var(--hacf-surface)',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: '30px',
          padding: '8px',
          _focusWithin: {
            borderColor: 'rgba(255,255,255,.55)',
          },
        })}
      >
        <input
          type="text"
          name="roomId"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          placeholder={t('placeholder')}
          aria-label={tHome('joinInputLabel')}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          spellCheck={false}
          className={css({
            flex: '3 1 240px',
            minWidth: 0,
            height: '52px',
            background: 'transparent',
            border: 0,
            color: 'var(--hacf-text)',
            paddingX: '18px',
            fontFamily: 'var(--hacf-font-mono)',
            fontSize: '16px',
            fontWeight: 500,
            outline: 'none',
            // Focus is shown on the whole capsule (see _focusWithin above).
            _focusVisible: { outline: 'none !important' },
            _placeholder: { color: '#7f7e8b' },
          })}
        />
        <button
          type="submit"
          className={cx(
            isLoggedIn ? lightButton : gradientButton,
            css({ flex: '1 1 200px', height: '54px', fontSize: '16px' })
          )}
        >
          {tHome('joinMeeting')}
        </button>
      </form>
      <div aria-live="polite">
        {error && (
          <p
            id={errorId}
            className={css({
              margin: 0,
              fontSize: '14px',
              lineHeight: 1.4,
              fontWeight: 500,
              color: 'var(--hacf-error)',
            })}
          >
            {error === 'empty' ? (
              t('emptyError')
            ) : (
              <>
                {tHome('joinInputError')}{' '}
                <span
                  className={css({
                    fontFamily: 'var(--hacf-font-mono)',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {window.location.host}/uio-azer-jkl
                </span>{' '}
                ·{' '}
                <span
                  className={css({
                    fontFamily: 'var(--hacf-font-mono)',
                    whiteSpace: 'nowrap',
                  })}
                >
                  uio-azer-jkl
                </span>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
