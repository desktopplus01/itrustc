import { IconArrowRight, IconBuilding, IconDocument, IconShield, IconTrend, IconWallet } from './icons.jsx'

const promos = [
  {
    icon: IconTrend,
    tag: 'Promotion',
    title: 'USC Game Day Getaway! Enter to Win!',
    desc: "One lucky winner will enjoy an amazing USC experience trip, while runner-up winners will get an Apple iPad Air or a $200 gift card.",
    cta: 'Enter Here',
    featured: true,
  },
  {
    icon: IconBuilding,
    tag: 'New',
    title: 'Introducing Treasury Accounts!',
    desc: 'A secure, institutional-grade solution for businesses, trusts, and nonprofits to buy, sell, and custody crypto.',
    cta: 'Learn More',
    id: 'treasury',
  },
  {
    icon: IconWallet,
    tag: 'Accounts',
    title: 'Premium Custody Accounts',
    desc: 'Buy, sell, and store crypto in a secure custody account at iTrustCapital.',
    cta: 'Learn More',
    id: 'pca',
  },
  {
    icon: IconDocument,
    tag: 'Education',
    title: 'Can I Stake Crypto in an IRA?',
    desc: 'There is a feature that allows some crypto holders to earn passive rewards, similar to dividends or interest. It is called staking.',
    cta: 'Learn More',
  },
  {
    icon: IconShield,
    tag: 'Education',
    title: 'The Benefits of an IRA',
    desc: 'Learn how IRAs offer flexible and tax-efficient ways to save and invest for retirement.',
    cta: 'Learn More',
  },
]

export default function Promos() {
  const featured = promos.filter((p) => p.featured)
  const rest = promos.filter((p) => !p.featured)

  return (
    <section className="bg-mist pb-16 sm:pb-20 lg:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <article
              key={p.title}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-crimson to-crimson-deep p-7 text-white shadow-xl shadow-crimson/20 sm:col-span-2 sm:p-9 lg:row-span-2"
            >
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(60%_60%_at_90%_0%,rgba(255,199,44,0.25),transparent_70%)]"
              />
              <div className="relative flex h-full flex-col">
                <span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 font-condensed text-[11px] font-bold uppercase tracking-widest">
                  {p.tag}
                </span>
                <h3 className="mt-5 font-display text-3xl leading-tight text-white sm:text-4xl">
                  {p.title}
                </h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
                  {p.desc}
                </p>
                <a
                  href="#how-it-works"
                  className="mt-auto inline-flex w-fit items-center gap-2 pt-8 font-condensed text-base font-bold uppercase tracking-wide text-gold transition group-hover:gap-3"
                >
                  {p.cta}
                  <IconArrowRight className="h-4 w-4" />
                </a>
              </div>
            </article>
          ))}

          {rest.map((p) => (
            <article
              key={p.title}
              id={p.id}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-7"
            >
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-midnight-900 px-3 py-1 font-condensed text-[11px] font-bold uppercase tracking-widest text-gold">
                <p.icon className="h-3.5 w-3.5" />
                {p.tag}
              </span>
              <h3 className="mt-4 font-condensed text-xl font-bold leading-snug text-ink">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{p.desc}</p>
              <a
                href="#faq"
                className="mt-auto inline-flex w-fit items-center gap-2 pt-6 font-condensed text-sm font-bold uppercase tracking-wide text-crimson transition group-hover:gap-3"
              >
                {p.cta}
                <IconArrowRight className="h-4 w-4" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
