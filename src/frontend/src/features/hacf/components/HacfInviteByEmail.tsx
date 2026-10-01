import { FormEvent, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { css, cx } from '@/styled-system/css'
import { fetchApi } from '@/api/fetchApi'
import { ApiError } from '@/api/ApiError'
import { ghostButton } from '../styles/buttons'

// Same leniency as most mail clients: the backend validates them again.
const emailRegex = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

type Status =
  | { type: 'idle' }
  | { type: 'sending' }
  | { type: 'sent'; count: number }
  | {
      type: 'error'
      reason: 'empty' | 'invalid' | 'rejected' | 'failed'
      detail?: string
    }

/**
 * "Invite by email" for a room the user just created: the upstream backend
 * endpoint POST /rooms/<id>/invite/ (room owner / administrators only), which
 * sends the invitation email through the server's SMTP settings (EMAIL_*).
 */
export const HacfInviteByEmail = ({ roomId }: { roomId: string }) => {
  const { t } = useTranslation('hacf', { keyPrefix: 'invite' })
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<Status>({ type: 'idle' })
  const inputId = useId()
  const hintId = useId()
  const statusId = useId()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const emails = [
      ...new Set(
        value
          .split(/[\s,;]+/)
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      ),
    ]
    if (!emails.length) return setStatus({ type: 'error', reason: 'empty' })
    const invalid = emails.filter((email) => !emailRegex.test(email))
    if (invalid.length) {
      return setStatus({
        type: 'error',
        reason: 'invalid',
        detail: invalid.join(', '),
      })
    }
    setStatus({ type: 'sending' })
    try {
      await fetchApi(`rooms/${roomId}/invite/`, {
        method: 'POST',
        body: JSON.stringify({ emails }),
      })
      setValue('')
      setStatus({ type: 'sent', count: emails.length })
    } catch (e) {
      setStatus({
        type: 'error',
        reason:
          e instanceof ApiError && e.statusCode === 400 ? 'rejected' : 'failed',
      })
    }
  }

  const isError = status.type === 'error'

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        textAlign: 'left',
        marginTop: '6px',
      })}
    >
      <label
        htmlFor={inputId}
        className={css({
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--hacf-text-muted)',
          paddingLeft: '18px',
        })}
      >
        {t('label')}
      </label>
      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--hacf-surface)',
          border: '1px solid rgba(255,255,255,.14)',
          borderRadius: '18px',
          padding: '8px 8px 8px 18px',
          _focusWithin: { borderColor: 'rgba(255,255,255,.55)' },
        })}
      >
        <input
          id={inputId}
          type="text"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (status.type !== 'sending') setStatus({ type: 'idle' })
          }}
          placeholder={t('placeholder')}
          aria-invalid={isError}
          aria-describedby={
            status.type === 'idle' ? hintId : `${statusId} ${hintId}`
          }
          className={css({
            flex: '1 1 220px',
            minWidth: 0,
            height: '42px',
            background: 'transparent',
            border: 0,
            color: 'var(--hacf-text)',
            fontSize: '15px',
            outline: 'none',
            _placeholder: { color: '#7f7e8b' },
            // Focus is shown on the whole field (see _focusWithin above).
            _focusVisible: { outline: 'none !important' },
          })}
        />
        <button
          type="submit"
          disabled={status.type === 'sending'}
          className={cx(
            ghostButton,
            css({
              flex: 'none',
              height: '42px',
              paddingX: '18px',
              fontSize: '14px',
            })
          )}
        >
          {status.type === 'sending' ? t('sending') : t('submit')}
        </button>
      </div>
      <span
        id={hintId}
        className={css({
          fontSize: '13px',
          lineHeight: 1.5,
          color: 'var(--hacf-text-subtle)',
          paddingLeft: '18px',
        })}
      >
        {t('hint')}
      </span>
      <div aria-live="polite">
        {(status.type === 'sent' || isError) && (
          <p
            id={statusId}
            className={css({
              margin: 0,
              paddingLeft: '18px',
              fontSize: '14px',
              lineHeight: 1.4,
              fontWeight: 500,
            })}
            style={{
              color: isError ? 'var(--hacf-error)' : 'oklch(82% 0.13 150)',
            }}
          >
            {status.type === 'sent'
              ? t('sent', { count: status.count })
              : t(`errors.${status.reason}`, { emails: status.detail })}
          </p>
        )}
      </div>
    </form>
  )
}
