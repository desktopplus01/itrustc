import { useEffect, useRef } from 'react'
import { parseHtml } from './render.jsx'
import sections from './sections.json'

/**
 * Renders the exact hero markup and restores the live page's card
 * interaction: pointer position picks the "active" card (desktop vs mobile),
 * hover settles the 3D tilt, and the idle float animation resumes on leave.
 */
export default function HeroSection() {
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const cards = root.querySelector('.hero-cards')
    if (!cards) return

    cards.setAttribute('data-sheen', 'true')

    const onMove = (e) => {
      cards.setAttribute('data-hover', 'true')
      cards.setAttribute('data-float', 'false')
      const r = cards.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      cards.setAttribute('data-active', x < 0.5 ? 'mobile' : 'desktop')
    }
    const onLeave = () => {
      cards.setAttribute('data-hover', 'false')
      cards.setAttribute('data-active', 'desktop')
      cards.setAttribute('data-float', 'true')
    }

    cards.addEventListener('pointermove', onMove)
    cards.addEventListener('pointerleave', onLeave)
    return () => {
      cards.removeEventListener('pointermove', onMove)
      cards.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return <div ref={ref}>{parseHtml(sections['main#home-hero'])}</div>
}
