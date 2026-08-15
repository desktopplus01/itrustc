import { useEffect } from 'react'

/**
 * The live page ships server-rendered markup with inline `opacity:0` +
 * `transform:translate3d(...)` entrance states that its JS (Framer Motion)
 * animates to visible on scroll. This enhancer replicates that behavior:
 * every element that starts hidden gets transitioned to visible when it
 * enters the viewport, with a small positional stagger.
 */
export default function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll('[style]')].filter((el) => {
      if (!(el instanceof HTMLElement)) return false
      const inline = el.style
      if (inline.opacity !== '0') return false
      // skip elements that are permanently decorative-hidden (the nav's
      // scroll-fade backdrop uses opacity-0 + its own scroll handler)
      const cls = el.className || ''
      if (
        typeof cls === 'string' &&
        (/\bhidden\b/.test(cls) || /\bopacity-0\b/.test(cls))
      )
        return false
      return true
    })

    if (!els.length) return

    // reveal anything already in view immediately
    const reveal = (el, delay = 0) => {
      el.classList.add('replica-reveal')
      if (delay) el.style.transitionDelay = `${delay}ms`
      el.style.opacity = '1'
      el.style.transform = 'none'
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            reveal(entry.target, Math.min(i * 70, 350))
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' },
    )

    els.forEach((el, i) => {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.9) {
        reveal(el, Math.min(i * 70, 350))
      } else {
        io.observe(el)
      }
    })

    return () => io.disconnect()
  }, [])
}
