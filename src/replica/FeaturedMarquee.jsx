import { useEffect, useRef, useState } from 'react'
import { assetUrl } from './render.jsx'

/**
 * Featured-on press logo marquee.
 *
 * The live page's SSR markup ships this section with an empty logo row — the
 * logos are populated client-side from the site's own data (extracted from
 * its JS bundle: the exact directus asset ids + display sizes). The site
 * renders them as `<ul>` of `<li class="px-4 opacity-50 hover:opacity-100
 * transition-all">`, scales each logo to 80%, and scrolls them with a marquee
 * at speed 20 (px/sec). We render the identical structure (duplicated once
 * for a seamless -50% loop) and drive the motion with the same pixel speed,
 * measured from the track width.
 */
const logos = [
  { name: 'Barrons', src: assetUrl('/assets/directus/e6b1cb33-d5d9-4973-8c49-ac2af3f74214.svg'), w: 149, h: 30 },
  { name: 'Benzinga', src: assetUrl('/assets/directus/b58c949a-2fd2-4142-9bd6-c8e0ee8b2da0.svg'), w: 180, h: 24 },
  { name: 'Bloomberg', src: assetUrl('/assets/directus/b4ff3cde-6e82-496f-908e-ae8c23a05b67.svg'), w: 136, h: 30 },
  { name: 'Business Insider', src: assetUrl('/assets/directus/1a180787-8425-4279-bc95-e37664b9c173.svg'), w: 97, h: 30 },
  { name: 'Forbes', src: assetUrl('/assets/directus/8b58ce16-5c07-4096-bf8a-b9283339520e.svg'), w: 87, h: 30 },
  { name: 'Inc Regionals Pacific 2026', src: assetUrl('/assets/directus/5774266a-26c0-4f52-90f4-fda0beb9aeeb.svg'), w: 115, h: 56 },
  { name: 'Investing.com', src: assetUrl('/assets/directus/3c9ef519-4127-497a-a3c1-840e8faa1dc0.svg'), w: 179, h: 30 },
  { name: 'Investopedia', src: assetUrl('/assets/directus/a8d521df-0d58-4371-bf0a-25506c3f5a3a.png'), w: 153, h: 30 },
  { name: 'Coin Desk', src: assetUrl('/assets/directus/d3a96e30-3bb3-4019-9f29-b96c0a7466ff.svg'), w: 159, h: 30 },
  { name: 'Coin Telegraph', src: assetUrl('/assets/directus/faf15131-5bbf-4464-bb54-b3878373d502.svg'), w: 131, h: 30 },
]

export default function FeaturedMarquee() {
  const trackRef = useRef(null)
  const [duration, setDuration] = useState(30)

  // The site's marquee runs at 20 px/sec — set the CSS animation duration from
  // the measured track width so the motion matches at every viewport size.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setDuration(Math.max(1, el.scrollWidth / 2 / 20))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div style={{ opacity: 0 }} className="anim-fadeIn">
      <div id="featured-list-wrap" className="">
        <section className="main-container">
          <div className="py-2 mx-auto bg-glass-pane border border-glass-edge rounded-xl">
            <dl
              className="flex flex-row items-center overflow-clip w-full"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 99%)',
                maskImage: 'linear-gradient(to right, black 90%, transparent 99%)',
              }}
            >
              <dt className="pl-5 pr-4 shrink-0">
                <p className="font-light text-sm text-white block opacity-50">Featured On</p>
              </dt>
              <dd className="border-l border-glass-edge py-1 shrink overflow-clip">
                <div
                  ref={trackRef}
                  className="featured-marquee flex w-max items-center"
                  style={{ animationDuration: `${duration}s` }}
                >
                  <ul className="flex flex-row items-center">
                    {[...logos, ...logos].map((l, i) => (
                      <li key={i} className="px-4 opacity-50 hover:opacity-100 transition-all">
                        <img
                          src={l.src}
                          alt={l.name}
                          width={Math.ceil(l.w * 0.8)}
                          height={Math.ceil(l.h * 0.8)}
                          style={{
                            width: Math.ceil(l.w * 0.8),
                            height: Math.ceil(l.h * 0.8),
                          }}
                          loading="lazy"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </dd>
            </dl>
          </div>
        </section>
      </div>
    </div>
  )
}
