import { IconCheck, IconStar, IconTrend } from './icons.jsx'

const features = [
  { title: 'Tax Advantages*', desc: 'Tax-deferred or tax-free growth' },
  { title: 'Award-Winning US-Based Client Service', desc: 'Real people, fast answers' },
  { title: 'Low Costs, No Monthly Fee', desc: 'Transparent, flat-fee trading' },
  { title: '15,000+ Reviews Rated "Excellent"', desc: 'Rated by real clients' },
]

const assets = [
  { sym: 'BTC', name: 'Bitcoin', price: '$64,280.62', chg: '+0.48%', up: true, bar: [40, 55, 48, 62, 58, 72, 66, 80] },
  { sym: 'ETH', name: 'Ethereum', price: '$1,903.43', chg: '+0.20%', up: true, bar: [50, 44, 58, 52, 63, 57, 70, 74] },
  { sym: 'GLD', name: 'Gold', price: '$4,245.50', chg: '+0.00%', up: true, bar: [42, 46, 44, 50, 54, 52, 60, 62] },
]

function Sparkline({ bars, up }) {
  const max = Math.max(...bars)
  return (
    <div className="flex h-8 items-end gap-0.5" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-1 rounded-sm ${up ? 'bg-itc-green/80' : 'bg-crimson/80'}`}
          style={{ height: `${(h / max) * 100}%` }}
        />
      ))}
    </div>
  )
}

function DashboardMock() {
  return (
    <div className="hero-sheen rounded-xl border glass-edge bg-midnight-950/70 shadow-2xl shadow-black/50 backdrop-blur">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-crimson" />
        <span className="h-2.5 w-2.5 rounded-full bg-gold" />
        <span className="h-2.5 w-2.5 rounded-full bg-itc-green" />
        <div className="ml-3 hidden flex-1 rounded-md bg-white/5 px-3 py-1.5 text-[11px] text-white/40 sm:block">
          Marketplace · Bitcoin
        </div>
        <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-itc-green text-[10px] font-bold text-white">
          JM
        </div>
      </div>

      {/* stat tiles */}
      <div className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="rounded-lg border border-white/5 bg-white/5 p-2.5 sm:p-3">
          <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-white/40 sm:text-[10px]">
            Total Portfolio Value
          </p>
          <p className="mt-1 truncate font-condensed text-sm font-bold text-white sm:text-xl">
            $52,867.03
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/5 p-2.5 sm:p-3">
          <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-white/40 sm:text-[10px]">
            24H Unrealized Gains
          </p>
          <p className="mt-1 flex items-center gap-1 font-condensed text-sm font-bold text-itc-green sm:text-xl">
            <IconTrend className="h-3 w-3 sm:h-4 sm:w-4" /> $53.61
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/5 p-2.5 sm:p-3">
          <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-white/40 sm:text-[10px]">
            Total Unrealized Gains
          </p>
          <p className="mt-1 flex items-center gap-1 font-condensed text-sm font-bold text-itc-green sm:text-xl">
            <IconTrend className="h-3 w-3 sm:h-4 sm:w-4" /> $7,101.97
          </p>
        </div>
      </div>

      {/* asset rows */}
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="overflow-hidden rounded-lg border border-white/5">
          {assets.map((a) => (
            <div
              key={a.sym}
              className="flex items-center gap-3 border-b border-white/5 bg-white/[0.03] px-3 py-2 last:border-0 sm:gap-4 sm:px-4 sm:py-2.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-midnight-700 font-condensed text-[10px] font-bold text-gold">
                {a.sym[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-condensed text-xs font-bold text-white sm:text-sm">
                  {a.name}
                  <span className="ml-1.5 text-[10px] font-semibold text-white/40">{a.sym}</span>
                </p>
                <p className="text-[10px] text-white/40 sm:text-[11px]">IRA · Available</p>
              </div>
              <Sparkline bars={a.bar} up={a.up} />
              <div className="text-right">
                <p className="font-condensed text-xs font-bold text-white sm:text-sm">{a.price}</p>
                <p className={`text-[10px] font-semibold sm:text-[11px] ${a.up ? 'text-itc-green' : 'text-crimson'}`}>
                  {a.chg}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PhoneCard() {
  return (
    <div className="hero-sheen rounded-2xl border glass-edge bg-midnight-900/90 p-4 shadow-2xl shadow-black/60 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="font-condensed text-xs font-bold uppercase tracking-wider text-white/50">
          Buy &amp; Sell
        </p>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/60">
          Market Order
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-sm font-bold text-ink">
          ₿
        </span>
        <div className="flex-1">
          <p className="font-condensed text-sm font-bold text-white">Bitcoin</p>
          <p className="text-[10px] text-white/40">BTC · $64,280.62</p>
        </div>
        <span className="text-[10px] font-semibold text-itc-green">+0.48%</span>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="flex justify-between text-[10px] text-white/40">
          <span>Purchase Amount (USD)</span>
          <span>$22,365.48 available</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-lg font-bold text-white">$</span>
          <span className="font-condensed text-xl font-bold text-white">0.00</span>
          <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
            MAX
          </span>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 w-full rounded-xl bg-itc-green py-3 font-condensed text-sm font-bold uppercase tracking-wide text-white transition hover:bg-itc-blue"
      >
        Buy
      </button>
      <p className="mt-2 text-center text-[10px] text-white/35">
        $20 min / $500,000 max transaction
      </p>
    </div>
  )
}

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-midnight-900">
      {/* backdrop glows */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_-5%,rgba(255,199,44,0.14),transparent_70%),radial-gradient(45%_40%_at_85%_60%,rgba(126,168,66,0.12),transparent_70%),radial-gradient(40%_40%_at_10%_80%,rgba(39,93,201,0.18),transparent_70%)]"
      />
      {/* gold stripe accent */}
      <div aria-hidden className="stripes-gold relative h-1.5 w-full opacity-70" />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex flex-wrap items-center justify-center gap-x-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 font-condensed text-xs font-semibold uppercase tracking-widest text-gold sm:text-sm">
            <span>Cryptocurrency</span>
            <span aria-hidden className="text-gold/50">•</span>
            <span>Stocks</span>
            <span aria-hidden className="text-gold/50">•</span>
            <span>Gold &amp; Silver</span>
          </p>

          <h1 className="mt-6 text-5xl leading-[0.95] text-white sm:text-7xl lg:text-8xl">
            ALL IN ONE
            <span className="mt-1 block text-gold">PLATFORM</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-white/60 sm:text-lg">
            The #1 Crypto IRA platform for Bitcoin &amp; digital assets. Trade crypto, stocks,
            gold &amp; silver in a tax-advantaged retirement account.
          </p>

          {/* feature bullets */}
          <ul className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <li
                key={f.title}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-sm"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-itc-green/20">
                    <IconCheck className="h-3 w-3 text-itc-green" />
                  </span>
                  <div>
                    <p className="font-condensed text-sm font-bold leading-snug text-white">
                      {f.title}
                    </p>
                    <p className="mt-0.5 text-xs text-white/45">{f.desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* star rating */}
          <div className="mt-7 flex items-center justify-center gap-2 text-white/70">
            <span className="flex" aria-hidden>
              {[...Array(5)].map((_, i) => (
                <IconStar key={i} className="h-4 w-4 text-gold" />
              ))}
            </span>
            <span className="text-sm font-semibold">
              15,000+ Reviews Rated <span className="text-gold">"Excellent"</span>
            </span>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#how-it-works"
              className="w-full rounded-full bg-itc-green px-8 py-3.5 font-condensed text-base font-bold uppercase tracking-wide text-white shadow-xl shadow-itc-green/25 transition hover:bg-itc-blue sm:w-auto"
            >
              Open Account
            </a>
            <a
              href="#ira"
              className="w-full rounded-full border-2 border-white/25 px-8 py-3.5 font-condensed text-base font-bold uppercase tracking-wide text-white transition hover:border-white hover:bg-white/5 sm:w-auto"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* dashboard + phone mocks */}
        <div className="relative mx-auto mt-14 max-w-5xl lg:mt-20">
          {/* phone card shown above dashboard on mobile */}
          <div className="mx-auto mb-5 w-56 sm:hidden">
            <PhoneCard />
          </div>

          <DashboardMock />

          {/* phone card overlapping on large screens */}
          <div className="absolute -top-10 left-0 hidden w-72 -translate-y-1/3 lg:block xl:-left-10">
            <PhoneCard />
          </div>

          <p className="mt-6 text-center text-xs text-white/35">
            Image is for informational purposes only. Prices shown may not reflect current price.
          </p>
        </div>
      </div>

      {/* tricolor divider */}
      <div aria-hidden className="tricolor relative h-1.5 w-full" />
    </section>
  )
}
