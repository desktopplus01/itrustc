import { useEffect, useRef, useState } from 'react'
import { parseHtml } from './render.jsx'
import sections from './sections.json'
import { TICKER_ASSETS, COINGECKO_IDS } from './ticker-assets.js'

/**
 * Top-bar live market ticker.
 *
 * The live page's top bar is a client-side "Loading..." placeholder in SSR that
 * hydrates into a sliding marquee of asset prices (react-fast-marquee, speed 40,
 * pauseOnHover). The site pulls that data from its own GraphQL gateway
 * (dataschema-gateway.itrustcapital.com), which is Cloudflare-gated and cannot be
 * called from a browser — so this replica consumes the free CoinGecko API instead
 * (no key, CORS-enabled) for the same assets the site lists.
 *
 * Item markup, price formatting and percent-change colors are copied verbatim
 * from the site's bundle.
 */
export default function MarketTicker() {
  const [quotes, setQuotes] = useState(null)
  const [failed, setFailed] = useState(false)
  const trackRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let timer = null
    let attempt = 0
    let hadData = false

    const fetchPrices = async () => {
      try {
        // free demo key from VITE_COINGECKO_API_KEY removes the keyless tier's
        // rate limit (see .freebuff/run.md)
        const key = import.meta.env.VITE_COINGECKO_API_KEY
        const mkParams = (ids) => {
          const p = new URLSearchParams({
            vs_currency: 'usd',
            ids: ids.join(','),
            price_change_percentage: '24h',
            per_page: '250',
          })
          if (key) p.set('x_cg_demo_api_key', key)
          return p
        }
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?${mkParams(
            Object.values(COINGECKO_IDS),
          )}`,
        )
        if (!res.ok) throw new Error('coingecko ' + res.status)
        const data = await res.json()
        if (cancelled) return
        attempt = 0
        hadData = true
        const byId = new Map(data.map((c) => [c.id, c]))
        const items = []
        for (const [ticker, meta] of Object.entries(TICKER_ASSETS)) {
          const cg = byId.get(COINGECKO_IDS[ticker])
          if (!cg) continue
          items.push({
            ticker,
            name: meta.name,
            slug: meta.slug,
            price: cg.current_price ?? 0,
            change: cg.price_change_percentage_24h ?? 0,
            marketCap: cg.market_cap ?? 0,
            image: cg.image ?? '',
          })
        }
        // the site sorts the ticker by market cap (descending)
        items.sort((a, b) => b.marketCap - a.marketCap)
        setQuotes(items)
        // refresh once a minute
        timer = setTimeout(fetchPrices, 60000)
      } catch (err) {
        console.warn('[market ticker] fetch failed:', err.message || err)
        if (cancelled) return
        // transient rate limits (CoinGecko's keyless tier 429s) -> back off
        attempt += 1
        if (attempt > 6 && !hadData) {
          // the live site hides the bar when it gets no data; do the same
          setFailed(true)
          return
        }
        // keep stale data on screen and retry quietly in the background
        timer = setTimeout(fetchPrices, hadData ? 15000 : 4000 * attempt)
      }
    }
    fetchPrices()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  // react-fast-marquee's "speed" is px/sec; match the site's speed: 40.
  // The track holds two copies, so one full loop (translateX -50%) is one copy
  // width — duration = copyWidth / speed.
  useEffect(() => {
    if (!quotes || !trackRef.current) return
    const track = trackRef.current
    const copyWidth = track.scrollWidth / 2
    const duration = copyWidth / 40
    track.style.animationDuration = duration + 's'
  }, [quotes])

  // after repeated failures the bar disappears entirely (like the live site)
  if (failed) return null

  if (!quotes) {
    // the site's SSR loading state, verbatim
    return (
      <div className="text-white bg-midnight-900 h-10 z-[900] relative">
        {parseHtml(sections.topBar)}
      </div>
    )
  }

  return (
    <div className="text-white bg-midnight-900 z-[900] relative">
      <div className="market-ticker w-full" aria-hidden="true">
        <div ref={trackRef} className="market-ticker-track">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex flex-row">
              {quotes.map((q) => (
                <li key={copy + '-' + q.ticker} className="flex flex-row items-stretch h-10">
                  <a
                    href={`/markets/crypto/${q.slug}`}
                    className="flex flex-row px-2 py-1 border-solid border-moon-500 border-l text-white hover:bg-moon-500 items-center"
                    tabIndex="-1"
                  >
                    <img
                      src={q.image}
                      alt={`${q.name} Icon`}
                      className="block h-5 w-5 rounded-full"
                      width="64"
                      height="64"
                    />
                    <div className="flex flex-row items-center justify-center ml-2 text-2xs leading-tight pt-[1px]">
                      <div className="w-[120px]">
                        <p className="font-medium truncate">{q.name}</p>
                        <p className="text-white/50">{q.ticker}</p>
                      </div>
                      <div>
                        <p className="font-medium text-right">${formatPrice(q.price)}</p>
                        <p className={`text-right ${percentColor(q.change)}`}>
                          {q.change.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  )
}

// the site's own price formatter (from bundle 55867):
// >= 1 -> 2 decimals w/ locale commas; < 1 -> up to 4 significant decimals
function formatPrice(e) {
  const a = Math.abs(e)
  if (a === 0) return e.toFixed(2)
  if (a >= 1) return e.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const [m] = e.toFixed(10).match(/^-?\d*\.?0*\d{0,4}/)
  return m
}

// the site's own change-color helper
function percentColor(e) {
  return e > 0 ? 'text-success-500' : e < 0 ? 'text-danger-500' : 'text-white/50'
}
