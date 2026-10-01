import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'
import { RiDashboard3Line } from '@remixicon/react'
import { css } from '@/styled-system/css'
import { layoutStore } from '@/stores/layout'
import { supervisionPageUrl, useSupervisionAccess } from '../api/supervision'

/**
 * Discreet "Supervision" link shown during a meeting (the conference hides the
 * header) to members of the allowed Authentik group. Opens the supervision page
 * in a new tab, focused on the current room, so the call is not interrupted.
 */
export const HacfConferenceSupervision = ({ roomId }: { roomId?: string }) => {
  const { t } = useTranslation('hacf', { keyPrefix: 'supervision' })
  const { showHeader } = useSnapshot(layoutStore)
  const allowed = useSupervisionAccess()

  if (!allowed || showHeader) return null

  return (
    <a
      href={supervisionPageUrl(roomId)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${t('label')} - ${t('newTab')}`}
      className={css({
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 10,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '32px',
        paddingX: '12px',
        borderRadius: '999px',
        backgroundColor: 'rgb(11 11 16 / 0.72)',
        border: '1px solid rgb(255 255 255 / 0.18)',
        color: '#f4f3f7',
        fontSize: '13px',
        fontWeight: 500,
        textDecoration: 'none',
        backdropFilter: 'blur(6px)',
        opacity: 0.85,
        transition: 'opacity 150ms, background-color 150ms',
        _hover: { opacity: 1, backgroundColor: 'rgb(11 11 16 / 0.9)' },
        _focusVisible: { opacity: 1 },
      })}
    >
      <RiDashboard3Line size={16} aria-hidden="true" />
      {t('label')}
    </a>
  )
}
