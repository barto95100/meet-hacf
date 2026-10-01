import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'
import { css, cx } from '@/styled-system/css'
import { navigateTo } from '@/navigation/navigateTo'
import { getRouteUrl } from '@/navigation/getRouteUrl'
import { generateRoomId, useCreateRoom } from '@/features/rooms'
import { ApiRoom } from '@/features/rooms/api/ApiRoom'
import { useTelephony } from '@/features/rooms/livekit/hooks/useTelephony'
import { useCopyRoomToClipboard } from '@/features/rooms/livekit/hooks/useCopyRoomToClipboard'
import { formatPinCode } from '@/features/rooms/utils/telephony'
import { userStore } from '@/stores/user'
import { ghostButton, gradientButton, lightButton } from '../styles/buttons'
import { HacfRoomNameForm } from './HacfRoomNameForm'
import { HacfInviteByEmail } from './HacfInviteByEmail'

/**
 * Logged-in actions. Room creation is the same as the upstream
 * CreateMeetingMenu ("instant" and "later" options); for the "later" room the
 * suggested random name can be replaced by a readable one (HacfRoomNameForm),
 * and the link is shown inline instead of in the LaterMeetingDialog.
 */
export const HacfCreateActions = () => {
  const { t } = useTranslation('hacf', { keyPrefix: 'create' })
  const { t: tLater } = useTranslation('home', {
    keyPrefix: 'laterMeetingDialog',
  })
  const { username } = useSnapshot(userStore)
  const { mutateAsync: createRoom, isPending } = useCreateRoom()
  const [laterRoom, setLaterRoom] = useState<null | ApiRoom>(null)
  // Suggested name while the user is choosing it, null otherwise.
  const [nameSuggestion, setNameSuggestion] = useState<null | string>(null)

  const telephony = useTelephony()
  const { isCopied, copyRoomToClipboard } = useCopyRoomToClipboard(
    laterRoom || undefined
  )
  const roomUrl = laterRoom ? getRouteUrl('room', laterRoom.slug) : ''
  const hasTelephonyInfo = telephony?.enabled && !!laterRoom?.pin_code

  const startInstant = () => {
    const slug = generateRoomId()
    createRoom({ slug, username }).then((data) =>
      navigateTo('room', data.slug, {
        state: { create: true, initialRoomData: data },
      })
    )
  }

  const createLater = (slug: string) =>
    createRoom({ slug, username }).then((room) => {
      setNameSuggestion(null)
      setLaterRoom(room)
    })

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        width: '100%',
        maxWidth: '640px',
      })}
    >
      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
        })}
      >
        <button
          type="button"
          onClick={startInstant}
          disabled={isPending}
          data-attr="create-option-instant"
          className={cx(
            gradientButton,
            css({ flex: '1 1 220px', height: '56px' })
          )}
        >
          {t('instant')}
        </button>
        <button
          type="button"
          onClick={() => {
            setLaterRoom(null)
            setNameSuggestion(generateRoomId())
          }}
          disabled={isPending}
          aria-expanded={nameSuggestion !== null}
          className={cx(
            ghostButton,
            css({ flex: '1 1 220px', height: '56px', fontSize: '16px' })
          )}
        >
          {t('later')}
        </button>
      </div>

      {nameSuggestion !== null && (
        <HacfRoomNameForm
          key={nameSuggestion}
          suggestion={nameSuggestion}
          isPending={isPending}
          onCreate={createLater}
          onCancel={() => setNameSuggestion(null)}
        />
      )}

      <div aria-live="polite" className={css({ width: '100%' })}>
        {laterRoom && (
          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%',
              textAlign: 'left',
            })}
          >
            <div
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--hacf-surface)',
                border: '1px solid rgba(255,255,255,.14)',
                borderRadius: '18px',
                padding: '8px 8px 8px 18px',
              })}
            >
              <span
                className={css({
                  flex: 1,
                  minWidth: 0,
                  fontFamily: 'var(--hacf-font-mono)',
                  fontSize: '15px',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                })}
              >
                {roomUrl.replace(/^https?:\/\//, '')}
              </span>
              <button
                type="button"
                onClick={copyRoomToClipboard}
                aria-label={tLater('copy')}
                data-attr="later-dialog-copy"
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
                {isCopied ? t('copied') : t('copy')}
              </button>
            </div>
            {hasTelephonyInfo && (
              <span
                className={css({
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: 'var(--hacf-text-muted)',
                  paddingLeft: '18px',
                })}
              >
                {tLater('phone.call')} ({telephony.country}){' '}
                {telephony.internationalPhoneNumber} · {tLater('phone.pinCode')}{' '}
                {formatPinCode(laterRoom.pin_code)}
              </span>
            )}
            <span
              className={css({
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--hacf-text-subtle)',
                paddingLeft: '18px',
              })}
            >
              {t('shareHint')}
            </span>
            <HacfInviteByEmail roomId={laterRoom.id} />
          </div>
        )}
      </div>
    </div>
  )
}
