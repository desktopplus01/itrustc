/* Small inline SVG icon set — stroke-based, inherits currentColor. */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

export const IconMenu = (p) => (
  <svg {...base} {...p}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </svg>
)

export const IconClose = (p) => (
  <svg {...base} {...p}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
)

export const IconCheck = (p) => (
  <svg {...base} {...p}>
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

export const IconChevron = (p) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const IconArrowRight = (p) => (
  <svg {...base} {...p}>
    <path d="M4 12h16" />
    <path d="m13 5 7 7-7 7" />
  </svg>
)

export const IconStar = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2.6 14.9 8.5 21.4 9.4 16.7 14 17.8 20.4 12 17.3 6.2 20.4 7.3 14 2.6 9.4 9.1 8.5Z" />
  </svg>
)

export const IconShield = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3 5 6v5c0 4.6 3 8.2 7 10 4-1.8 7-5.4 7-10V6Z" />
    <path d="m9.5 12 1.8 1.8 3.4-3.6" />
  </svg>
)

export const IconLock = (p) => (
  <svg {...base} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

export const IconBuilding = (p) => (
  <svg {...base} {...p}>
    <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
    <path d="M16 9h2a2 2 0 0 1 2 2v10" />
    <path d="M3 21h18" />
    <path d="M8 7h2M8 11h2M8 15h2M13 7h1.5M13 11h1.5M13 15h1.5" />
  </svg>
)

export const IconVault = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <circle cx="12" cy="14" r="3.2" />
    <path d="M7 8V6.5A2.5 2.5 0 0 1 9.5 4h5A2.5 2.5 0 0 1 17 6.5V8" />
    <path d="M12 11.5v5" />
  </svg>
)

export const IconPhone = (p) => (
  <svg {...base} {...p}>
    <path d="M5 4h4l1.5 4.5-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2L20 15v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
)

export const IconChat = (p) => (
  <svg {...base} {...p}>
    <path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.9A8 8 0 1 1 21 12Z" />
  </svg>
)

export const IconTrend = (p) => (
  <svg {...base} {...p}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </svg>
)

export const IconUser = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
)

export const IconWallet = (p) => (
  <svg {...base} {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <path d="M16 12h.01M3 9h16" />
  </svg>
)

export const IconSwap = (p) => (
  <svg {...base} {...p}>
    <path d="M7 4 3 8l4 4" />
    <path d="M3 8h13a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H9" />
    <path d="m17 20 4-4-4-4" />
  </svg>
)

export const IconDocument = (p) => (
  <svg {...base} {...p}>
    <path d="M6 3h8l4 4v14H6Z" />
    <path d="M14 3v4h4" />
    <path d="M9 12h6M9 16h6" />
  </svg>
)

export const IconSupport = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.5" fill="currentColor" />
  </svg>
)

export const IconBitcoin = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M15.9 11.2c.4-1.1-.2-2.1-1.3-2.4l.6-1.7-1.5-.4-.6 1.7-1.2-.3.6-1.7-1.5-.4-.6 1.7-1.9-.5-.4 1.1 1.2.3-1.5 4.3c-.1.2-.3.5-.4.8l-1.1.2.4 1.1.6.1-1.4 4-1.4-.4-.4 1.1 1.4.4-.6 1.7 1.5.4.6-1.7 1.2.3-.6 1.7 1.5.4.6-1.7c1.6.2 3.1-.5 3.6-1.9.4-1.2 0-2-.4-2.5.7-.5 1.2-1.3 1-2.5ZM9.3 10.9l1.4-4c.2-.5.8-.8 1.4-.7.6.1.9.6.8 1.2l-1.4 4c-.2.5-.8.8-1.4.7-.6-.1-.9-.6-.8-1.2Zm3 6.6-1.5 4.2c-.2.5-.8.8-1.4.7-.6-.1-.9-.6-.8-1.2l1.5-4.2c.2-.5.8-.8 1.4-.7.6.1.9.6.8 1.2Z" />
  </svg>
)

export const IconSocial = {
  x: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.2l7.3-8.3L2.6 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L7.9 3.7H6L17.8 20Z" />
    </svg>
  ),
  linkedin: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M6.9 8.5H3.4V20h3.5V8.5ZM5.2 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM20.6 13.6c0-3.5-1.9-5.1-4.4-5.1-2 0-2.9 1.1-3.4 1.9V8.5H9.3V20h3.5v-6.1c0-1.6.8-2.6 2.1-2.6 1.3 0 1.9.9 1.9 2.6V20h3.5v-6.4Z" />
    </svg>
  ),
  youtube: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M23.5 7.2a3 3 0 0 0-2.1-2.2C19.5 4.5 12 4.5 12 4.5s-7.5 0-9.4.5A3 3 0 0 0 .5 7.2 31.4 31.4 0 0 0 0 12c0 1.6.2 3.2.5 4.8a3 3 0 0 0 2.1 2.2c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.2c.3-1.6.5-3.2.5-4.8 0-1.6-.2-3.2-.5-4.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" />
    </svg>
  ),
  instagram: (p) => (
    <svg {...base} {...p}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
    </svg>
  ),
}
