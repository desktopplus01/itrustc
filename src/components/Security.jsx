import { IconBuilding, IconLock, IconVault } from './icons.jsx'

const cards = [
  {
    icon: IconVault,
    title: 'Secure Storage',
    desc: 'Client assets are secured and stored with third-party institutional storage providers.',
  },
  {
    icon: IconBuilding,
    title: 'Regulated Custodian',
    desc: 'iTrustCapital uses a regulated, state-chartered trust company to hold the self-directed IRAs and custody client assets.',
  },
  {
    icon: IconLock,
    title: 'Institutional-Grade Custody',
    desc: 'Robust, institutional-grade security — no hot wallets, no lending against your assets.',
  },
]

export default function Security() {
  return (
    <section className="bg-mist py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-crimson">
            Your Assets are Secure
          </p>
          <h2 className="mt-4 text-4xl leading-none text-ink sm:text-5xl">
            Your Assets, <span className="text-crimson">Not Ours</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink/65 sm:text-lg">
            iTrustCapital never takes custody of your assets. We don't borrow or lend against
            client assets or leverage client assets for profit — and we don't let our custody
            providers do it either.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.title}
              className="group rounded-2xl border border-white/10 bg-midnight-900 p-7 text-center transition hover:-translate-y-1 hover:shadow-xl sm:p-8"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold transition group-hover:bg-gold group-hover:text-ink">
                <c.icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 font-condensed text-xl font-bold text-white">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{c.desc}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-ink/45">
          Cryptocurrency is not legal tender backed by the United States government, nor is it
          subject to Federal Deposit Insurance Corporation ("FDIC") insurance or protections.
          Accounts do not receive a choice of custody partner.
        </p>
      </div>
    </section>
  )
}
