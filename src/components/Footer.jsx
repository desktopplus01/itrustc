import { IconChat, IconPhone, IconSocial, IconSupport } from './icons.jsx'

const columns = [
  {
    title: 'Products',
    links: ['Crypto IRA', 'Premium Custody Account', 'Treasury Account', 'Pricing', 'Markets'],
  },
  {
    title: 'Company',
    links: ['About Us', 'Careers', 'News', 'Blog', 'Contact'],
  },
  {
    title: 'Resources',
    links: ['Help Center', 'Security', 'FAQ', 'Affiliates', 'Investor Relations'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Use', 'Disclosures', 'Licenses', 'Accessibility'],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-midnight-950">
      {/* support panel */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-gold">
              Still Have Questions?
            </p>
            <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
              Our Friendly Support Team Is Here To Help
            </h2>
            <p className="mt-3 text-sm text-white/50">
              Phone Hours: Monday – Friday, 7AM – 5PM PT
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="#top"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-itc-green px-6 py-3 font-condensed text-sm font-bold uppercase tracking-wide text-white transition hover:bg-itc-blue"
              >
                <IconSupport className="h-4 w-4" />
                Visit Support Site
              </a>
              <a
                href="tel:+15626008399"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/20 px-6 py-3 font-condensed text-sm font-bold uppercase tracking-wide text-white transition hover:border-white"
              >
                <IconPhone className="h-4 w-4" />
                Call: (562) 600-8399
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="font-condensed text-sm font-bold uppercase tracking-widest text-white">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#top"
                        className="text-sm text-white/45 transition hover:text-gold"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* social + legal */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
          <div className="flex items-center gap-4">
            {['x', 'linkedin', 'youtube', 'instagram', 'facebook'].map((s) => {
              const S = IconSocial[s]
              return (
                <a
                  key={s}
                  href="#top"
                  aria-label={`iTrustCapital on ${s}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/50 transition hover:border-gold hover:text-gold"
                >
                  <S className="h-4 w-4" />
                </a>
              )
            })}
          </div>
          <p className="font-condensed text-xs text-white/40">
            © {new Date().getFullYear()} iTrustCapital. All rights reserved.
          </p>
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-white/30 sm:text-left">
          iTrustCapital is a software platform, not a bank, broker-dealer, or custodian. This
          communication is for informational purposes only and is not an offer or solicitation to
          buy or sell any security or digital asset, nor is it investment, legal, or tax advice.
          Cryptocurrency, stocks, and precious metals involve risk, including the possible loss of
          principal. Investments in retirement accounts are not FDIC insured and may lose value.
          Past performance does not guarantee future results. Please consult with a qualified
          financial, tax, and/or legal professional regarding your individual circumstances.
        </p>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-xs text-white/40">
            <IconChat className="h-4 w-4 text-gold" />
            24/7 platform access · US-based client service
          </p>
          <p className="text-xs text-white/40">Made with care in the United States</p>
        </div>
      </div>
    </footer>
  )
}
