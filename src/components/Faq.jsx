import { useState } from 'react'
import { IconChevron } from './icons.jsx'

const faqs = [
  {
    q: 'What is a Crypto IRA?',
    a: 'A Crypto IRA is a self-directed individual retirement account that lets you hold cryptocurrency, stocks, and physical precious metals in a tax-advantaged retirement account. Depending on the account type (Traditional IRA vs. Roth IRA), your investments grow tax-deferred or tax-free.',
  },
  {
    q: 'Which assets can I invest in?',
    a: 'With a single iTrustCapital account you can trade 90+ cryptocurrencies, stocks & ETFs, and physical gold and silver — all in one platform.',
  },
  {
    q: 'How do fees work?',
    a: 'There are no monthly or annual account fees, no startup fees, and no exit fees. Trading carries a flat 1% cryptocurrency transaction fee, and gold and silver are offered at a competitive over-spot price per ounce. The estimated execution price includes all fees prior to buying or selling.',
  },
  {
    q: 'How do I fund my account?',
    a: 'You can contribute cash via ACH, transfer an existing IRA, roll over an old employer plan such as a 401(k), TSP, 403(b), or 457, or move crypto into your account with an In-Kind Transfer.',
  },
  {
    q: 'Is my account secure?',
    a: 'Client assets are held with regulated, state-chartered trust companies and secured with third-party institutional storage providers. iTrustCapital never takes custody of your assets, does not lend against them, and does not hold them in hot wallets.',
  },
  {
    q: 'Can I trade 24/7?',
    a: 'Yes. Cryptocurrency markets trade around the clock, so you can buy and sell crypto 24/7, 365 days a year. Stocks and precious metals trade during their respective market hours.',
  },
  {
    q: 'Do I pay taxes on my investments now?',
    a: "Because the account is a retirement account, you generally don't pay capital gains taxes as you trade within it. Traditional IRA contributions may be tax-deductible with taxes due at withdrawal; Roth IRAs grow tax-free. Some taxes and conditions may apply — consult an investment and/or tax professional for your specific circumstances.",
  },
]

export default function Faq() {
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" className="bg-mist pb-16 pt-4 sm:pb-20 lg:pb-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-crimson">
            Frequently Asked Questions
          </p>
          <h2 className="mt-4 text-4xl leading-none text-ink sm:text-5xl">
            Have Questions? <span className="text-crimson">We've Got Answers</span>
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <div
                key={f.q}
                className={`overflow-hidden rounded-xl border transition ${
                  isOpen
                    ? 'border-crimson/30 bg-white shadow-md'
                    : 'border-white/10 bg-white hover:shadow-sm'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                >
                  <span className="font-condensed text-base font-bold text-ink sm:text-lg">
                    {f.q}
                  </span>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                      isOpen ? 'rotate-180 bg-crimson text-white' : 'bg-midnight-900 text-gold'
                    }`}
                  >
                    <IconChevron className="h-4 w-4" />
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-ink/65 sm:px-6">
                      {f.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
