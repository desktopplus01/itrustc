import { IconBitcoin, IconTrend, IconVault } from './icons.jsx'

const categories = [
  { icon: IconBitcoin, label: 'Crypto', sub: '90+ digital assets' },
  { icon: IconTrend, label: 'Stocks & ETFs', sub: 'Equities, funds & more' },
  { icon: IconVault, label: 'Precious Metals', sub: 'Physical gold & silver' },
]

export default function AllInOne() {
  return (
    <section className="relative overflow-hidden bg-midnight-950 py-16 sm:py-20 lg:py-24">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_110%,rgba(255,199,44,0.12),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {/* categories */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {categories.map((c, i) => (
            <div
              key={c.label}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 backdrop-blur"
            >
              <c.icon className="h-9 w-9 text-gold" />
              <p className="font-display text-2xl uppercase text-white sm:text-3xl">{c.label}</p>
              <p className="text-xs text-white/45">{c.sub}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-5xl uppercase leading-none text-white sm:text-7xl">
          All In One <span className="text-gold">Place</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base text-white/55 sm:text-lg">
          Diversify your retirement with a single account — no juggling multiple platforms, no
          extra fees, no hassle.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#how-it-works"
            className="w-full rounded-full bg-itc-green px-8 py-3.5 font-condensed text-base font-bold uppercase tracking-wide text-white shadow-xl shadow-itc-green/25 transition hover:bg-itc-blue sm:w-auto"
          >
            Sign Up
          </a>
          <a
            href="#top"
            className="w-full rounded-full border-2 border-white/25 px-8 py-3.5 font-condensed text-base font-bold uppercase tracking-wide text-white transition hover:border-white hover:bg-white/5 sm:w-auto"
          >
            Login
          </a>
        </div>

        <p className="mt-8 text-xs text-white/35">
          Image is for informational purposes. Prices shown may not reflect current price.
        </p>
      </div>
      {/* tricolor divider */}
      <div aria-hidden className="tricolor relative mt-16 h-1.5 w-full" />
    </section>
  )
}
