import { IconArrowRight, IconSwap, IconUser, IconWallet } from './icons.jsx'

const steps = [
  {
    n: '1',
    icon: IconUser,
    title: 'Sign Up',
    kicker: 'Create Your Account For Free',
    desc: "Just a few easy clicks and you'll be signed up in minutes! We don't charge any pesky sign up fees, and our client experience team is available to help whenever you need it. It's that simple.",
    cta: 'Get Started',
    href: '#pricing',
  },
  {
    n: '2',
    icon: IconWallet,
    title: 'Fund Account',
    kicker: 'Cash, Transfer, or Rollover',
    desc: "Whether you're contributing via ACH, transferring an existing IRA, or rolling over old employer plans, we have plenty of funding solutions to fit your needs — including In-Kind Transfers for Crypto IRAs.",
    cta: 'Learn More',
    href: '#ira',
  },
  {
    n: '3',
    icon: IconSwap,
    title: 'Buy & Sell',
    kicker: 'Crypto, Stocks, Precious Metals',
    desc: 'From crypto, stocks, gold & silver, we offer a wide selection of alternative assets for you to trade. Log in and start buying, selling, and owning your assets as soon as your account is funded.',
    cta: 'Explore Markets',
    href: '#top',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-midnight-900 py-16 sm:py-20 lg:py-24">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_0%,rgba(126,168,66,0.1),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:px-8">
        {/* sticky intro */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-gold">
            Get Started In Minutes
          </p>
          <h2 className="mt-4 text-4xl leading-none text-white sm:text-5xl">
            Make Your Retirement
            <span className="mt-1 block text-gold">Funds Work For You</span>
          </h2>
          <p className="mt-6 max-w-md text-base text-white/55 sm:text-lg">
            Opening an account is fast, free, and straightforward. Three simple steps from sign-up
            to your first trade.
          </p>
          <a
            href="#pricing"
            className="mt-8 hidden w-fit items-center gap-2 rounded-full bg-itc-green px-7 py-3 font-condensed text-base font-bold uppercase tracking-wide text-white transition hover:bg-itc-blue lg:inline-flex"
          >
            Get Started
            <IconArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* steps */}
        <ol className="mt-12 space-y-5 lg:mt-0">
          {steps.map((s) => (
            <li
              key={s.n}
              className="group relative rounded-2xl border border-white/10 bg-midnight-800/70 p-6 backdrop-blur transition hover:border-gold/40 sm:p-8"
            >
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex flex-col items-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold font-display text-2xl text-ink">
                    {s.n}
                  </span>
                  {s.n !== '3' && (
                    <span aria-hidden className="mt-3 h-full w-px bg-white/15" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <s.icon className="h-5 w-5 text-gold" />
                    <h3 className="font-condensed text-2xl font-bold text-white">{s.title}</h3>
                  </div>
                  <p className="mt-1 font-condensed text-base font-semibold text-gold">
                    {s.kicker}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">{s.desc}</p>
                  <a
                    href={s.href}
                    className="mt-5 inline-flex items-center gap-2 font-condensed text-sm font-bold uppercase tracking-wide text-itc-green transition group-hover:gap-3 hover:text-itc-blue"
                  >
                    {s.cta}
                    <IconArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
