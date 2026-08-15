import { useEffect, useRef, useState } from 'react'
import { reviews } from '../data/reviews.js'
import { IconArrowRight, IconStar } from './icons.jsx'

export default function Testimonials() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef(null)

  const count = reviews.length
  const go = (i) => setIndex(((i % count) + count) % count)

  useEffect(() => {
    if (paused) return
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), 6000)
    return () => clearInterval(timer.current)
  }, [paused, count])

  const r = reviews[index]

  return (
    <section
      id="reviews"
      className="bg-mist py-16 sm:py-20 lg:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-crimson">
            Client Reviews
          </p>
          <h2 className="mt-4 text-4xl leading-none text-ink sm:text-5xl">
            Trusted By <span className="text-crimson">Thousands</span>
          </h2>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="flex" aria-hidden>
              {[...Array(5)].map((_, i) => (
                <IconStar key={i} className="h-4 w-4 text-gold" />
              ))}
            </span>
            <p className="font-condensed text-sm font-bold text-ink">
              15,000+ Reviews Rated "Excellent"
            </p>
          </div>
        </div>

        {/* carousel */}
        <div className="relative mt-10">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-midnight-900 p-7 shadow-2xl shadow-midnight-900/20 sm:p-10">
            <div key={index} className="review-fade">
              <p className="text-lg leading-relaxed text-white/85 sm:text-xl">
                "{r.quote}"
              </p>
              <div className="mt-7 flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold font-condensed text-base font-bold text-ink">
                  {r.author.replace(/[^A-Z]/g, '').slice(0, 2) || r.author[0]}
                </span>
                <div>
                  <p className="font-condensed text-base font-bold text-white">{r.author}</p>
                  <p className="text-xs text-white/45">Verified iTrustCapital Client</p>
                </div>
                <div className="ml-auto hidden sm:flex" aria-hidden>
                  {[...Array(5)].map((_, i) => (
                    <IconStar key={i} className="h-3.5 w-3.5 text-gold" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* arrows */}
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous review"
            className="absolute -left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-midnight-800 text-white shadow-lg transition hover:bg-midnight-700 sm:-left-5"
          >
            <IconArrowRight className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next review"
            className="absolute -right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-midnight-800 text-white shadow-lg transition hover:bg-midnight-700 sm:-right-5"
          >
            <IconArrowRight className="h-4 w-4" />
          </button>

          {/* dots */}
          <div className="mt-6 flex justify-center gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to review ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-crimson' : 'w-2 bg-ink/15 hover:bg-ink/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
