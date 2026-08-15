import { IconCheck, IconDocument, IconTrend, IconWallet } from './icons.jsx'

const features = [
  {
    icon: IconDocument,
    title: 'Tax Advantages*',
    desc: 'Enjoy the full benefits of a tax-deferred or tax-free environment.',
  },
  {
    icon: IconTrend,
    title: 'Trade Stocks, Crypto, Gold & Silver',
    desc: 'A wide selection of alternative assets, all inside your retirement account.',
  },
  {
    icon: IconWallet,
    title: 'Low Costs, No Monthly Fee',
    desc: 'No hidden fees. Keep more of what you earn.',
  },
]

export default function IraSection() {
  return (
    <section id="ira" className="bg-mist py-16 sm:py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* copy */}
        <div className="flex flex-col items-start">
          <p className="font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-crimson">
            More Options, More Flexibility
          </p>
          <h2 className="mt-4 text-4xl leading-none text-ink sm:text-5xl">
            iTrustCapital
            <span className="mt-1 block text-crimson">IRA</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink/70 sm:text-lg">
            Transfer your existing IRA or start a new one. Rollover your 401(k), TSP, 403(b), 457,
            and more. Invest in a tax-advantaged environment with the flexibility to trade
            cryptocurrency, stocks, gold &amp; silver — all from one account.
          </p>

          <ul className="mt-8 space-y-4">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-midnight-900 text-gold">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-condensed text-lg font-bold text-ink">{f.title}</p>
                  <p className="mt-0.5 text-sm text-ink/60">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs leading-relaxed text-ink/45">
            *Some taxes and conditions may apply. Investors should consult an investment and/or tax
            professional for information regarding specific circumstances.
          </p>
        </div>

        {/* visual */}
        <div className="flex flex-col justify-center">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-midnight-900 p-6 shadow-2xl shadow-midnight-900/20 sm:p-8">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_0%,rgba(255,199,44,0.12),transparent_70%),radial-gradient(50%_50%_at_10%_100%,rgba(126,168,66,0.14),transparent_70%)]"
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-condensed text-xs font-semibold uppercase tracking-widest text-white/40">
                    Rollover Checklist
                  </p>
                  <p className="mt-1 font-condensed text-xl font-bold text-white sm:text-2xl">
                    Rollover Your 401(k) · TSP · 403(b)
                  </p>
                </div>
                <span className="hidden rounded-full bg-gold px-3 py-1 font-condensed text-xs font-bold uppercase text-ink sm:block">
                  Free
                </span>
              </div>

              <ul className="mt-6 space-y-3">
                {['Cash Contribution', 'IRA Transfer', '401(k) / TSP Rollover', 'In-Kind Crypto Transfer'].map(
                  (item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-itc-green/20">
                        <IconCheck className="h-3.5 w-3.5 text-itc-green" />
                      </span>
                      <span className="font-condensed text-sm font-semibold text-white">{item}</span>
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-white/35">
                        Available
                      </span>
                    </li>
                  ),
                )}
              </ul>

              <div className="mt-6 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3">
                <p className="font-condensed text-sm font-bold text-gold">
                  No startup fees. No monthly fees. No exit fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
