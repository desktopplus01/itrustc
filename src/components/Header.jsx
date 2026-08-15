import { useState } from 'react'
import { IconMenu, IconClose } from './icons.jsx'

const navLinks = [
  { label: 'IRA', href: '#ira' },
  { label: 'PCA', href: '#pca' },
  { label: 'Treasury', href: '#treasury' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2" aria-label="iTrustCapital home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold-deep font-display text-lg text-ink">
        i
      </span>
      <span className="font-display text-lg tracking-wide text-white sm:text-xl">
        iTrust<span className="text-gold">Capital</span>
      </span>
    </a>
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-midnight-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-semibold text-white/70 transition hover:text-gold"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="#top"
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:text-white"
          >
            Login
          </a>
          <a
            href="#how-it-works"
            className="rounded-full bg-itc-green px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-itc-green/25 transition hover:bg-itc-blue"
          >
            Open Account
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-white transition hover:bg-white/10 lg:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav
          className="border-t border-white/10 bg-midnight-900 px-4 pb-6 pt-3 lg:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col">
            {navLinks.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-white/5 py-3 text-base font-semibold text-white/80 transition hover:text-gold"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3">
            <a
              href="#top"
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/25 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:border-white"
            >
              Login
            </a>
            <a
              href="#how-it-works"
              onClick={() => setOpen(false)}
              className="rounded-full bg-itc-green px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-itc-blue"
            >
              Open Account
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}
