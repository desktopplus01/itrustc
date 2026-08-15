import { useEffect, useRef } from 'react'
import { parseHtml } from './render.jsx'
import sections from './sections.json'

/**
 * "How it works" sticky section.
 *
 * The live page renders this as a two-column sticky layout: the three steps
 * scroll on the left (each 100vh tall) while the phone-mockup column on the
 * right cross-fades to the phone for the step currently centered in the
 * viewport. The SSR markup ships with only the first step's phone visible
 * (the others start `opacity-0`) — the live site drives the fade client-side,
 * which this component replicates.
 */
export default function HowToSticky() {
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    // phones only exist in the sm+ (non-mobile) layout
    if (!window.matchMedia('(min-width: 640px)').matches) return

    const wraps = [...root.querySelectorAll('.step-image-wrap')]
    const steps = [...root.querySelectorAll('.step-content-wrap')]
    if (!wraps.length || !steps.length) return

    // The site's own CSS contains short-viewport overrides
    // (e.g. `2xl:[@media(max-height:799px)]:relative` + `:opacity-100`) that
    // switch the sticky phone column to a stacked layout where every phone is
    // shown at once. When one of those applies, we must not cross-fade.
    const isShortViewport = () => [
      '(min-width: 640px) and (max-height: 539px)',
      '(min-width: 1024px) and (max-height: 659px)',
      '(min-width: 1536px) and (max-height: 799px)',
    ].some((mq) => window.matchMedia(mq).matches)

    let active = -1
    let lastShort = null
    const apply = (i, shortViewport) => {
      // re-run when the active step changes or the short-viewport mode flips
      if (i === active && shortViewport === lastShort) return
      active = i
      lastShort = shortViewport
      wraps.forEach((w, j) => {
        const on = shortViewport ? true : j === i
        // set both the inline value and the site's own opacity classes so the
        // fade can never be undone by a class/inline precedence mismatch
        w.style.opacity = on ? '1' : '0'
        w.classList.toggle('opacity-100', on)
        w.classList.toggle('opacity-0', !on)
      })
    }

    let ticking = false
    const update = () => {
      ticking = false
      const shortViewport = isShortViewport()
      const mid = window.innerHeight / 2
      let best = 0
      let bestDist = Infinity
      steps.forEach((s, j) => {
        const r = s.getBoundingClientRect()
        const dist = Math.abs(r.top + r.height / 2 - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = j
        }
      })
      apply(best, shortViewport)
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return <div ref={ref}>{parseHtml(sections['main#howToSticky'])}</div>
}
