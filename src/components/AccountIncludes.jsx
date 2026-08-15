import { IconCheck } from './icons.jsx'

const items = [
  { title: 'Quick and easy setup', desc: 'Open and fund your account in minutes.' },
  {
    title: 'All necessary IRS/tax reporting',
    desc: 'We handle the paperwork and reporting you need.',
  },
  {
    title: 'Unlimited storage with institutional custody partners',
    desc: 'Your assets held with third-party institutional storage providers.',
  },
  {
    title: 'iTrustCapital platform support and maintenance',
    desc: 'Everything you need to trade, all in one place.',
  },
  { title: 'No additional account fees', desc: 'No monthly, startup, or exit fees. Ever.' },
]

export default function AccountIncludes() {
  return (
    <section className="bg-mist py-16 sm:py-20 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <p className="font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-crimson">
            Everything Included
          </p>
          <h2 className="mt-4 text-4xl leading-none text-ink sm:text-5xl">
            iTrustCapital Makes It
            <span className="mt-1 block text-crimson">Easy...</span>
          </h2>
          <p className="mt-6 max-w-md text-base text-ink/65 sm:text-lg">
            Your account includes everything you need to grow your retirement — without the
            headaches and hidden fees you get elsewhere.
          </p>
        </div>

        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.title}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-itc-green/15">
                <IconCheck className="h-4 w-4 text-itc-green" />
              </span>
              <div>
                <p className="font-condensed text-lg font-bold text-ink">{item.title}</p>
                <p className="mt-0.5 text-sm text-ink/55">{item.desc}</p>
              </div>
            </li>
          ))}
          <p className="px-2 pt-2 text-xs leading-relaxed text-ink/45">
            *Additional asset pricing fees may apply. The estimated execution price includes all
            iTrustCapital fees, prior to buying or selling. All fees are subject to change.
          </p>
        </ul>
      </div>
    </section>
  )
}
