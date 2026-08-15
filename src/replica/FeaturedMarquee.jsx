/**
 * Featured-on press logo marquee.
 *
 * The live page's SSR markup ships this section with an empty logo row — the
 * logos are populated client-side from the site's own data (extracted from
 * its JS bundle: the exact directus asset ids + display sizes). This renders
 * the identical structure and fills the row with those logos, scrolling them
 * in an infinite marquee (duplicated once for a seamless -50% loop).
 */
const logos = [
  { name: 'Barrons', src: '/assets/directus/e6b1cb33-d5d9-4973-8c49-ac2af3f74214.svg', w: 149, h: 30 },
  { name: 'Benzinga', src: '/assets/directus/b58c949a-2fd2-4142-9bd6-c8e0ee8b2da0.svg', w: 180, h: 24 },
  { name: 'Bloomberg', src: '/assets/directus/b4ff3cde-6e82-496f-908e-ae8c23a05b67.svg', w: 136, h: 30 },
  { name: 'Business Insider', src: '/assets/directus/1a180787-8425-4279-bc95-e37664b9c173.svg', w: 97, h: 30 },
  { name: 'Forbes', src: '/assets/directus/8b58ce16-5c07-4096-bf8a-b9283339520e.svg', w: 87, h: 30 },
  { name: 'Inc Regionals Pacific 2026', src: '/assets/directus/5774266a-26c0-4f52-90f4-fda0beb9aeeb.svg', w: 115, h: 56 },
  { name: 'Investing.com', src: '/assets/directus/3c9ef519-4127-497a-a3c1-840e8faa1dc0.svg', w: 179, h: 30 },
  { name: 'Investopedia', src: '/assets/directus/a8d521df-0d58-4371-bf0a-25506c3f5a3a.png', w: 153, h: 30 },
  { name: 'Coin Desk', src: '/assets/directus/d3a96e30-3bb3-4019-9f29-b96c0a7466ff.svg', w: 159, h: 30 },
  { name: 'Coin Telegraph', src: '/assets/directus/faf15131-5bbf-4464-bb54-b3878373d502.svg', w: 131, h: 30 },
]

export default function FeaturedMarquee() {
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
              <dd className="border-l border-glass-edge py-1 shrink min-w-0 overflow-clip">
                <div className="featured-marquee flex w-max items-center">
                  {[...logos, ...logos].map((l, i) => (
                    <img
                      key={i}
                      src={l.src}
                      alt={`${l.name} logo`}
                      width={l.w}
                      height={l.h}
                      loading="lazy"
                      className="mx-6 h-7 w-auto shrink-0 opacity-70"
                    />
                  ))}
                </div>
              </dd>
            </dl>
          </div>
        </section>
      </div>
    </div>
  )
}
