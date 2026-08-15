import { useEffect, useRef, useState } from 'react'
import { assetUrl } from './render.jsx'

const menus = {
  Markets: [
    { label: 'Cryptocurrency', href: '/markets#crypto' },
    { label: 'Stocks & ETFs', href: '/markets#stocks' },
    { label: 'Precious Metals', href: '/markets#metals' },
    { label: 'Marketplace', href: '/markets' },
  ],
  Products: [
    { label: 'Crypto IRA', href: '/ira' },
    { label: 'Premium Custody Account', href: '/pca' },
    { label: 'Treasury Account', href: '/treasury' },
  ],
  'How It Works': [
    { label: 'Get Started', href: '/#home-hero' },
    { label: 'Funding Options', href: '/#howToSticky' },
    { label: 'Buy & Sell', href: '/#howToSticky' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'News', href: '/news' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact', href: '/contact' },
  ],
  Learn: [
    { label: 'Blog', href: '/blog' },
    { label: 'FAQ', href: '/#faq-home' },
    { label: 'IRA Guides', href: '/learn' },
  ],
  Support: [
    { label: 'Help Center', href: 'https://help.itrustcapital.com/hc/en-us' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Call: (562) 600-8399', href: 'tel:+15626008399' },
  ],
}

const Chevron = () => (
  <span className="inline-block w-3 opacity-50">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      data-slot="icon"
      className=""
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  </span>
)

const Burger = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
    data-slot="icon"
    className="w-full"
  >
    <path
      fillRule="evenodd"
      d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
      clipRule="evenodd"
    />
  </svg>
)

export default function SiteNav() {
  const [open, setOpen] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileGroup, setMobileGroup] = useState(null)
  const bgRef = useRef(null)

  // scrolled-state background fade (matches the site's opacity transition)
  useEffect(() => {
    const onScroll = () => {
      if (bgRef.current) bgRef.current.style.opacity = window.scrollY > 8 ? '1' : '0'
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // lock body scroll when the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div id="siteNav" className="block box-border sticky top-0 z-[210]">
      <nav className="main-container relative z-[190] box-border flex justify-between items-center h-13 pt-[1px]">
        <ul className="flex items-center grow-0 p-0 m-0 list-none space-x-4">
          <li className="relative grow-0 mr-2">
            <a
              className="flex flex-row grow-0 select-none items-center text-white text-sm hover:text-itcGreen"
              href="/"
            >
              <img
                className="block w-[180px] -md:w-[145.5px]"
                src={assetUrl('/assets/logos/itc-h-w.svg')}
                alt="iTrustCapital Logo"
                width="540"
                height="79"
                loading="eager"
              />
            </a>
          </li>
          {Object.entries(menus).map(([label]) => (
            <li key={label} className="relative grow-0 -lg:hidden">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open === label}
                onClick={() => setOpen(open === label ? null : label)}
                className="group"
              >
                <div className="flex flex-row flex-nowrap items-center text-white text-sm hover:text-itcGreen">
                  <span className="select-none">{label}</span>
                  <span
                    className={`inline-block w-3 opacity-50 transition-transform duration-200 ${
                      open === label ? 'rotate-180' : ''
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                      data-slot="icon"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
              </button>
              {open === label && (
                <div className="absolute left-1/2 top-full z-[300] mt-2 w-60 -translate-x-1/2 rounded-xl border border-white/10 bg-midnight-950 p-1.5 shadow-2xl shadow-black/50">
                  {menus[label].map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setOpen(null)}
                      className="block rounded-lg px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/5 hover:text-itcGreen"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        <ul className="flex items-center grow-0 p-0 m-0 list-none gap-x-4">
          <li className="relative grow-0 -xxs:hidden">
            <a
              className="flex flex-row grow-0 select-none items-center text-white text-sm hover:text-itcGreen"
              href="https://app.itrustcapital.com/login"
            >
              Log In
            </a>
          </li>
          <li className="relative grow-0 -xxs:hidden">
            <a
              className="inline-block bg-itcGreen text-white py-1 px-5 rounded-full shadow-md -sm:px-3 font-medium hover:bg-white hover:text-itcGreen flex flex-row grow-0 select-none items-center text-white text-sm hover:text-itcGreen"
              href="https://app.itrustcapital.com/signUp"
            >
              <span className="not-sr-only md:hidden" aria-hidden="true">
                Sign Up
              </span>
              <span className="md:block -md:hidden">Open Account</span>
            </a>
          </li>
          <li className="relative grow-0 lg:hidden flex items-center">
            <button
              type="button"
              className="-sm:w-7 sm:w-7 text-white hover:text-itcGreen"
              onClick={() => setMenuOpen(true)}
            >
              <Burger />
              <span className="sr-only">Open Navigation</span>
            </button>
          </li>
        </ul>
      </nav>
      <div
        ref={bgRef}
        className="bg-midnight-950 drop-shadow-xl absolute top-0 z-[185] w-full h-13 border-b border-midnight-950 transition-opacity duration-300 opacity-0"
        style={{ opacity: 0 }}
        aria-hidden="true"
      />

      {/* Mobile navigation overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[400] overflow-y-auto bg-midnight-950">
          <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-6 py-6">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center">
                <img
                  className="block w-[145.5px]"
                  src={assetUrl('/assets/logos/itc-h-w.svg')}
                  alt="iTrustCapital Logo"
                  width="540"
                  height="79"
                />
              </a>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-md p-2 text-white transition hover:bg-white/10"
                aria-label="Close navigation"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {Object.entries(menus).map(([label, items]) => (
                <div key={label} className="border-b border-white/10 pb-1">
                  <button
                    type="button"
                    onClick={() => setMobileGroup(mobileGroup === label ? null : label)}
                    className="flex w-full items-center justify-between py-3 text-left"
                  >
                    <span className="text-white text-base font-medium">{label}</span>
                    <span
                      className={`text-white/50 transition-transform duration-200 ${
                        mobileGroup === label ? 'rotate-180' : ''
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </button>
                  {mobileGroup === label && (
                    <div className="flex flex-col gap-1 pb-2">
                      {items.map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-itcGreen"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-8">
              <a
                href="https://app.itrustcapital.com/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-full border-2 border-white/25 px-5 py-2.5 text-center text-sm font-medium text-white transition hover:border-white"
              >
                Log In
              </a>
              <a
                href="https://app.itrustcapital.com/signUp"
                onClick={() => setMenuOpen(false)}
                className="rounded-full bg-itcGreen px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-white hover:text-itcGreen"
              >
                Open Account
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
