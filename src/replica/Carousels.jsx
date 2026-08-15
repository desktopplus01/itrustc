import { useEffect, useRef } from 'react'
import { Swiper } from 'swiper'
import { Autoplay, Navigation, Pagination } from 'swiper/modules'
import { parseHtml } from './render.jsx'
import sections from './sections.json'

/**
 * The live page uses Swiper's Web Component API (<swiper-container>,
 * <swiper-slide>). We convert that markup to the classic div-based Swiper
 * structure (identical visuals, standard API) and initialize each carousel
 * with the exact options the site ships with.
 */
const toSwiperMarkup = (html) =>
  html
    .replace(/<swiper-container([^>]*)>/g, (_, attrs) => {
      const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || ''
      const rest = attrs.replace(/\s*class="[^"]*"/, '').replace(/\s*init="false"/g, '')
      return `<div ${rest} class="${cls} relative w-full"><div class="swiper-wrapper">`
    })
    .replace(/<\/swiper-container>/g, '</div></div>')
    .replace(/<swiper-slide([^>]*)>/g, (_, attrs) => {
      const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || ''
      const rest = attrs.replace(/\s*class="[^"]*"/, '')
      return `<div ${rest} class="swiper-slide ${cls}">`
    })
    .replace(/<\/swiper-slide>/g, '</div>')

const initSwiper = (el, params) => {
  if (!el || el.swiper) return
  return new Swiper(el, params)
}

export function ReviewCarousel() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current?.querySelector('#swiper-reviews-container')
    initSwiper(el, {
      modules: [Navigation, Autoplay],
      loop: true,
      autoplay: { delay: 2500, disableOnInteraction: false },
      spaceBetween: 12,
      navigation: {
        nextEl: '.swiper-reviews-swipe-next',
        prevEl: '.swiper-reviews-swipe-prev',
      },
      breakpoints: {
        0: { slidesPerView: 1 },
        640: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
        1280: { slidesPerView: 4 },
      },
    })
  }, [])

  return <div ref={ref}>{parseHtml(toSwiperMarkup(sections['main#review-carousel']))}</div>
}

export function PromoCarousel() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current?.querySelector('#fc-home-container')
    initSwiper(el, {
      modules: [Navigation, Autoplay, Pagination],
      loop: true,
      // each slide is a full-width promo banner (text + large image); the
      // site renders ONE per view at every breakpoint
      slidesPerView: 1,
      slidesPerGroup: 1,
      autoplay: { delay: 5000, disableOnInteraction: false },
      spaceBetween: 12,
      navigation: {
        nextEl: '.fc-home-swipe-next',
        prevEl: '.fc-home-swipe-prev',
      },
      pagination: {
        el: '.fc-home-swiper-pagination',
        clickable: true,
        renderBullet: (index, className) =>
          `<span class="${className}"><span class="visible-button"><span class="sr-only">${index + 1}</span></span></span>`,
      },
    })
  }, [])

  return <div ref={ref}>{parseHtml(toSwiperMarkup(sections['main#featureCarousel-home']))}</div>
}
