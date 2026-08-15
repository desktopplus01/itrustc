const stats = [
  { value: '$17B', label: 'In Transactions' },
  { value: '300K+', label: 'Accounts Opened' },
  { value: '90+', label: 'Assets Available' },
  { value: '24/7', label: 'Crypto Trading' },
]

export default function StatsBand() {
  return (
    <section className="bg-midnight-950 py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center font-condensed text-xs font-semibold uppercase tracking-[0.3em] text-gold">
          Trusted by investors nationwide
        </p>
        <div className="mt-8 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl text-white sm:text-6xl">
                {s.value.split('+')[0]}
                <span className="text-gold">{s.value.includes('+') ? '+' : ''}</span>
              </p>
              <p className="mt-2 font-condensed text-xs font-semibold uppercase tracking-widest text-white/45 sm:text-sm">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
