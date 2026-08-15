import { featuredLogos } from '../data/reviews.js'

export default function FeaturedOn() {
  const doubled = [...featuredLogos, ...featuredLogos]
  return (
    <section aria-label="Featured on" className="border-b border-white/5 bg-midnight-950 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center font-condensed text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
          Featured On
        </p>
        <div className="marquee mt-5 overflow-hidden">
          <div className="animate-marquee flex w-max items-center gap-14 pr-14">
            {doubled.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="font-display text-xl tracking-wide text-white/25 transition hover:text-white/50 sm:text-2xl"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
