import type { CSSProperties } from 'react'

/**
 * HACF visual identity (Home Assistant Communauté Francophone).
 *
 * Exposed as CSS custom properties on the page root, so that Panda's static
 * `css()` calls can reference them with plain `var(--hacf-…)` strings.
 */
const blue = 'oklch(55% 0.22 262)'
const violet = 'oklch(52% 0.17 330)'
const red = 'oklch(60% 0.22 28)'

export const hacfCssVars = {
  '--hacf-blue': blue,
  '--hacf-violet': violet,
  '--hacf-red': red,
  '--hacf-gradient': `linear-gradient(100deg, ${blue}, ${violet}, ${red})`,
  '--hacf-gradient-avatar': `linear-gradient(135deg, ${blue}, ${violet}, ${red})`,
  // Lighter variant, readable as text on the dark background.
  '--hacf-gradient-text':
    'linear-gradient(100deg, oklch(62% 0.2 262), oklch(62% 0.17 330), oklch(68% 0.2 28))',
  '--hacf-glow': `0 12px 40px -14px oklch(52% 0.17 330 / .9)`,
  '--hacf-bg': '#0b0b10',
  '--hacf-surface': '#15151c',
  '--hacf-text': '#f4f3f7',
  '--hacf-text-soft': '#d4d3dc',
  '--hacf-text-muted': '#c9c8d3',
  '--hacf-text-subtle': '#a9a8b3',
  '--hacf-error': 'oklch(78% 0.13 28)',
  '--hacf-font': "'Inter Variable', Inter, system-ui, sans-serif",
  '--hacf-font-mono': "'JetBrains Mono', ui-monospace, Menlo, monospace",
} as CSSProperties
