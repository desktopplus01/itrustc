/**
 * Resolve the CoinGecko id for every ticker in src/replica/ticker-assets.js.
 *
 * CoinGecko's keyless /coins/list endpoint rate-limits aggressively, so this
 * retries with backoff. Matching is by symbol (case-insensitive); when several
 * coins share a symbol we prefer the one whose name matches the site's asset
 * name, then the largest-cap/established id.
 *
 * Usage: node scripts/resolve-coingecko-ids.mjs
 * Writes the corrected COINGECKO_IDS map back into ticker-assets.js.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tickerAssets = JSON.parse(
  readFileSync(join(root, 'src/replica/ticker-assets.js'), 'utf8')
    .match(/export const TICKER_ASSETS = (\{.*?\})\n\nexport const COINGECKO_IDS/)[1]
    .replace(/'/g, '"'),
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchList() {
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/list')
      if (res.ok) return await res.json()
      if (res.status === 429) {
        console.log(`rate limited (429), backing off ${attempt * 10}s...`)
        await sleep(attempt * 10000)
        continue
      }
      throw new Error(`list ${res.status}`)
    } catch (err) {
      console.log('list fetch failed:', err.message)
      await sleep(attempt * 5000)
    }
  }
  throw new Error('could not fetch /coins/list')
}

const list = await fetchList()
console.log('coins in list:', list.length)

const bySymbol = new Map()
for (const c of list) {
  const s = String(c.symbol).toUpperCase()
  if (!bySymbol.has(s)) bySymbol.set(s, [])
  bySymbol.get(s).push(c)
}

function pick(symbol, siteName) {
  const cands = bySymbol.get(symbol)
  if (!cands || !cands.length) return null
  if (cands.length === 1) return cands[0].id
  // prefer a name match (case-insensitive, normalized)
  const norm = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, '')
  const target = norm(siteName)
  const exact = cands.find((c) => norm(c.name) === target)
  if (exact) return exact.id
  // fall back to the first (usually the canonical listing)
  return cands[0].id
}

const resolved = {}
let unresolved = 0
for (const [ticker, meta] of Object.entries(tickerAssets)) {
  const id = pick(ticker, meta.name)
  if (id) resolved[ticker] = id
  else {
    unresolved++
    console.log('!! no CoinGecko coin for', ticker, '-', meta.name)
  }
}
console.log('resolved', Object.keys(resolved).length, 'of', Object.keys(tickerAssets).length)

// rewrite ticker-assets.js with the corrected map
const src = readFileSync(join(root, 'src/replica/ticker-assets.js'), 'utf8')
const next = src.replace(
  /export const COINGECKO_IDS = \{[\s\S]*?\}\n/,
  'export const COINGECKO_IDS = ' +
    JSON.stringify(resolved, null, 1).replace(/"/g, "'") +
    '\n',
)
writeFileSync(join(root, 'src/replica/ticker-assets.js'), next)
console.log('updated src/replica/ticker-assets.js')
