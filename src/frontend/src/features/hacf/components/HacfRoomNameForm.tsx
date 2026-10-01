import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { css, cx } from '@/styled-system/css'
import { ApiError } from '@/api/ApiError'
import { isRoomValid } from '@/features/rooms'
import { lightButton } from '../styles/buttons'

/** Same result as Django's slugify for what we allow: a-z, 0-9, single hyphens. */
const toRoomSlug = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

type NameError = 'tooShort' | 'tooLong' | 'codeLike' | 'unavailable' | 'taken'

const getNameError = (slug: string): NameError | null => {
  if (slug.length < 3) return 'tooShort'
  if (slug.length > 60) return 'tooLong'
  if (/^[a-z0-9]{10}$/.test(slug)) return 'codeLike'
  if (!isRoomValid(slug)) return 'unavailable'
  return null
}

/**
 * Room name step of "Créer un lien de réunion": a random code is suggested and
 * can be replaced by a readable name (e.g. atelier-zigbee) before the room is
 * created. Creation itself is the upstream room creation (see HacfCreateActions).
 */
export const HacfRoomNameForm = ({
  suggestion,
  isPending,
  onCreate,
  onCancel,
}: {
  suggestion: string
  isPending: boolean
  onCreate: (slug: string) => Promise<unknown>
  onCancel: () => void
}) => {
  const { t } = useTranslation('hacf', { keyPrefix: 'roomName' })
  const [value, setValue] = useState(suggestion)
  const [error, setError] = useState<NameError | 'failed' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const slug = toRoomSlug(value)
  const host = window.location.host

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nameError = getNameError(slug)
    if (nameError) return setError(nameError)
    onCreate(slug).catch((e) => {
      setError(
        e instanceof ApiError && e.statusCode === 400 ? 'taken' : 'failed'
      )
    })
  }

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
        <span
          aria-hidden="true"
          className={css({
            fontFamily: 'var(--hacf-font-mono)',
            fontSize: '15px',
            color: 'var(--hacf-text-subtle)',
            whiteSpace: 'nowrap',
          })}
        >
          {host}/
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          maxLength={80}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          className={css({
            flex: '1 1 160px',
            minWidth: 0,
            height: '42px',
            background: 'transparent',
            border: 0,
            color: 'var(--hacf-text)',
            fontFamily: 'var(--hacf-font-mono)',
            fontSize: '15px',
            fontWeight: 500,
            outline: 'none',
            // Focus is shown on the whole field (see _focusWithin above).
            _focusVisible: { outline: 'none !important' },
          })}
        />
        <button
          type="submit"
          disabled={isPending}
          data-attr="create-option-later"
          className={cx(
            lightButton,
            css({
              flex: 'none',
              height: '42px',
              paddingX: '18px',
              fontSize: '14px',
            })
          )}
        >
          {t('submit')}
        </button>
      </div>
      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '4px 16px',
          paddingLeft: '18px',
          fontSize: '13px',
          lineHeight: 1.5,
        })}
      >
        <span id={hintId} className={css({ color: 'var(--hacf-text-subtle)' })}>
          {slug && slug !== value.trim()
            ? t('preview', { url: `${host}/${slug}` })
            : t('hint')}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className={css({
            color: 'var(--hacf-text-muted)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            cursor: 'pointer',
            borderRadius: '2px',
            _hover: { color: 'var(--hacf-text)' },
          })}
        >
          {t('cancel')}
        </button>
      </div>
      <div aria-live="polite">
        {error && (
          <p
            id={errorId}
            className={css({
              margin: 0,
              paddingLeft: '18px',
              fontSize: '14px',
              lineHeight: 1.4,
              fontWeight: 500,
              color: 'var(--hacf-error)',
            })}
          >
            {t(`errors.${error}`)}
          </p>
        )}
      </div>
    </form>
  )
}
