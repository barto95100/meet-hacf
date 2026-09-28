import { css } from '@/styled-system/css'

const pill = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  fontFamily: 'var(--hacf-font)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  transition: 'background 150ms, filter 150ms, border-color 150ms, color 150ms',
  _focusVisible: {
    outline: '2px solid var(--hacf-text)',
    outlineOffset: '3px',
  },
  _disabled: {
    cursor: 'default',
    opacity: 0.7,
  },
} as const

/** Main call to action: HACF gradient + glow. */
export const gradientButton = css({
  ...pill,
  border: 0,
  backgroundImage: 'var(--hacf-gradient)',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 600,
  boxShadow: 'var(--hacf-glow)',
  _hover: { filter: 'brightness(1.12)' },
})

/** Secondary action: translucent outline. */
export const ghostButton = css({
  ...pill,
  backgroundColor: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(255,255,255,.2)',
  color: 'var(--hacf-text)',
  fontWeight: 500,
  _hover: { backgroundColor: 'rgba(255,255,255,.1)' },
})

/** Light solid button (join when logged in, copy). */
export const lightButton = css({
  ...pill,
  border: 0,
  backgroundColor: 'var(--hacf-text)',
  color: 'var(--hacf-bg)',
  fontWeight: 600,
  _hover: { backgroundColor: '#fff' },
})
