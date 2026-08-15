import { IconCheck } from './icons.jsx'

const tiers = [
  {
    amount: '$0',
    title: 'No Monthly / Annual Fees',
    sub: 'No Startup or Exit Fees',
    points: ['No monthly or annual account fees', 'No startup or exit fees', 'No hidden charges'],
  },
  {
    amount: '1%',
    title: 'Cryptocurrency Transaction Fee',
    sub: 'Flat fee on every crypto trade',
    points: ['Flat 1% fee on buys & sells', 'No spread markup', 'Priced transparently'],
  },
  {
    amount: '$',
    title: 'Gold & Silver Transaction Fee',
    sub: 'Over Spot Per Ounce',
    points: ['Physical precious metals', 'Competitive over-spot pricing', 'Institutional custody'],
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="border-y border-white/10 bg-midnight-900 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-gold">
            Simple, Transparent Pricing
          </p>
          <h2 className="mt-4 text-4xl leading-none text-white sm:text-5xl">
            Know Exactly What <span className="text-gold">You Pay</span>
          </h2>
          <p className="mt-5 text-base text-white/55 sm:text-lg">
            No monthly fees. No startup fees. No exit fees. Just clear, upfront costs you can
            count on.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <div
              key={t.title}
              className={`flex flex-col rounded-2xl border p-7 sm:p-8 ${
                i === 1
                  ? 'border-gold/50 bg-gradient-to-b from-gold/10 to-transparent shadow-xl shadow-gold/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <p className="font-display text-6xl text-gold">{t.amount}</p>
              <h3 className="mt-3 font-condensed text-xl font-bold leading-snug text-white">
                {t.title}
              </h3>
              <p className="mt-1 text-sm text-white/45">{t.sub}</p>
              <ul className="mt-6 space-y-3">
                {t.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-white/70">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-itc-green" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-white/35">
          The estimated execution price includes all iTrustCapital fees, prior to buying or
          selling. All fees are subject to change. For the most up-to-date fees, please refer to
          the iTrustCapital platform.
        </p>
      </div>
    </section>
  )
}
