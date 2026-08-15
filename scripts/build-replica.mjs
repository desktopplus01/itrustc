/**
 * build-replica.mjs
 * ---------------
 * Fetches the live iTrustCapital landing page, downloads every image/font/CSS
 * asset it references, slices the exact section markup out of the server-
 * rendered HTML, rewrites asset URLs to local /assets/ paths, and emits:
 *
 *   public/assets/**           downloaded images (site, directus, coins)
 *   src/replica/site.css       the site's real compiled stylesheet (verbatim)
 *   src/replica/swiper.css     the site's real Swiper stylesheet (verbatim)
 *   src/replica/inline.css     the page's inline <style> blocks (urls rewritten)
 *   src/replica/sections.json  exact section HTML, keyed by section id
 */
import { parse } from 'parse5'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_HTML = path.join(ROOT, 'src', 'replica')
const OUT_ASSETS = path.join(ROOT, 'public', 'assets')
const ORIGIN = 'https://www.itrustcapital.com'

const log = (...a) => console.log('[build-replica]', ...a)

// ---------------------------------------------------------------------------
// 1. Fetch the page (fresh, cache-busted)
// ---------------------------------------------------------------------------
const html = await (async () => {
  const res = await fetch(`${ORIGIN}/?cb=${Date.now()}`, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  return await res.text()
})()

fs.writeFileSync(path.join(ROOT, '.replica-source.html'), html)
log('fetched', html.length, 'bytes')

// ---------------------------------------------------------------------------
// 2. Collect every asset URL referenced anywhere (attrs + inline CSS)
// ---------------------------------------------------------------------------
const assetUrls = new Set()
for (const m of html.matchAll(/<img[^>]*\bsrc="([^"]+)"/g)) assetUrls.add(m[1])
// React SSR emits camelCase srcSet/srcset on <img> and <source>
for (const m of html.matchAll(/<(?:img|source)[^>]*\bsrc(?:Set|set)="([^"]+)"/gi)) {
  for (const part of m[1].split(',')) {
    const url = part.trim().split(/\s+/)[0]
    if (url) assetUrls.add(url)
  }
}
for (const m of html.matchAll(/url\(["']?([^"')]+)["']?\)/g)) assetUrls.add(m[1])
for (const m of html.matchAll(/\bsrc(?:Set|set)="([^"]+)"/gi)) {
  for (const part of m[1].split(',')) {
    const url = part.trim().split(/\s+/)[0]
    if (url && /^(https?:)?\/\//.test(url)) assetUrls.add(url)
  }
}

const clean = (u) =>
  decodeURIComponent(u.replace(/&amp;/g, '&')).split('#')[0]

const unique = [...assetUrls].map(clean).filter((u) => {
  if (/^https?:\/\//.test(u)) return true
  // same-origin static assets: /logos, /currency, /awards, /social, ...
  return /^\/(?:logos|currency|awards|social|app-store-badge|google-play-badge|favicon)/.test(u)
})
log('asset urls:', unique.length)

// ---------------------------------------------------------------------------
// 3. Download assets, build url -> local mapping
// ---------------------------------------------------------------------------
const download = async (url, dest) => {
  if (fs.existsSync(dest)) return
  const res = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    },
  })
  if (!res.ok) throw new Error(`download ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
  return buf.length
}

const urlMap = new Map() // decoded url -> /assets/... local path
const slugify = (s) => s.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '')

for (const url of unique) {
  let local
  if (url.startsWith('/')) {
    // same-origin static files: /logos/*, /currency/*, /awards/*, /social/*, ...
    if (url.startsWith('/assets/')) {
      // already a local /assets path — keep it as-is (idempotent)
      urlMap.set(url, url)
      continue
    }
    local = `/assets${url}`
    urlMap.set(url, local)
    const dest = path.join(ROOT, 'public', local.replace(/^\//, ''))
    try {
      const bytes = await download(`${ORIGIN}${url}`, dest)
      log('  ↓', bytes ?? 'cached', local)
    } catch (err) {
      log('  !! failed', url, err.message)
    }
    continue
  }

  const u = new URL(url)

  if (u.hostname === 'itrustcapital.directus.app') {
    const uuid = u.pathname.split('/').pop()
    const w = u.searchParams.get('width')
    const h = u.searchParams.get('height')
    const fmt = u.searchParams.get('format')
    const ext = fmt || (w || h ? 'img' : '') || path.extname(u.pathname).replace('.', '') || 'img'
    const size = w || h ? `-${w || 'x'}x${h || 'x'}` : ''
    local = `/assets/directus/${uuid}${size}.${ext === 'svg' ? 'svg' : 'img'}`
  } else if (u.hostname === 's2.coinmarketcap.com') {
    const id = path.basename(u.pathname).replace('.png', '')
    local = `/assets/coins/${id}.png`
  } else {
    continue
  }

  urlMap.set(url, local)
  const dest = path.join(ROOT, 'public', local.replace(/^\//, ''))
  try {
    const bytes = await download(url, dest)
    log('  ↓', bytes ?? 'cached', local)
  } catch (err) {
    log('  !! failed', url, err.message)
  }
}

// ---------------------------------------------------------------------------
// 4. Rewrite helpers (raw HTML uses &amp; inside attribute URLs)
// ---------------------------------------------------------------------------
// Single-pass replace: keys are matched longest-first in one regex pass so a
// replacement can never be re-matched by another map entry (which previously
// produced cascading /assets/assets/ double prefixes).
const rewrite = (str) => {
  const entries = []
  for (const [url, local] of urlMap) {
    entries.push([url, local])
    if (url.includes('&')) entries.push([url.replace(/&/g, '&amp;'), local])
  }
  entries.sort((a, b) => b[0].length - a[0].length)
  if (!entries.length) return str
  const re = new RegExp(
    entries.map(([u]) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'g',
  )
  return str.replace(re, (m) => entries.find(([u]) => u === m)[1])
}

// strip srcset/srcSet (keep single src) — base image is visually identical
const stripSrcset = (str) =>
  str
    .replace(/\s+srcset="[^"]*"/gi, '')
    .replace(/\s+srcSet="[^"]*"/gi, '')
    .replace(/\s+sizes="[^"]*"/gi, '')

// ---------------------------------------------------------------------------
// 5. Slice exact section HTML out of the source document
// ---------------------------------------------------------------------------
const doc = parse(html, { sourceCodeLocationInfo: true })
const htmlNode = doc.childNodes.find((n) => n.tagName === 'html')
const body = htmlNode.childNodes.find((n) => n.tagName === 'body')
const next = body.childNodes.find(
  (n) => n.tagName === 'div' && n.attrs.some((a) => a.name === 'id' && a.value === '__next'),
)
const inner = next.childNodes.find((n) => n.tagName === 'div')

const slice = (node) =>
  html.slice(node.sourceCodeLocation.startOffset, node.sourceCodeLocation.endOffset)

const findById = (root, id) => {
  const walk = (n) => {
    if (!n) return null
    if (n.attrs && n.attrs.some((a) => a.name === 'id' && a.value === id)) return n
    for (const c of n.childNodes || []) {
      const r = walk(c)
      if (r) return r
    }
    return null
  }
  return walk(root)
}

const sections = {}

// top promo bar (before the nav)
const topBar = inner.childNodes.find(
  (n) => n.tagName === 'div' && (n.attrs || []).some((a) => a.name === 'class' && a.value.includes('bg-midnight-900 h-10')),
)
if (topBar) sections.topBar = rewrite(stripSrcset(slice(topBar)))

// nav
const siteNav = inner.childNodes.find(
  (n) => n.attrs && n.attrs.some((a) => a.name === 'id' && a.value === 'siteNav'),
)
sections.siteNav = rewrite(stripSrcset(slice(siteNav)))

// main children
const main = inner.childNodes.find((n) => n.tagName === 'main')
main.childNodes
  .filter((n) => n.tagName)
  .forEach((n, i) => {
    const a = (n.attrs || []).reduce((o, x) => ((o[x.name] = x.value), o), {})
    const id = a.id ? `#${a.id}` : `child-${i}`
    const key = `main${id}`
    sections[key] = rewrite(stripSrcset(slice(n)))
  })

// footer
const footer = inner.childNodes.find((n) => n.tagName === 'footer')
sections.footer = rewrite(stripSrcset(slice(footer)))

// standalone ids that live nested inside sections (keep for reference/fidelity)
for (const id of ['featured-list-wrap', 'product-anchor', 'faq-home', 'divider-generic']) {
  const node = findById(inner, id)
  if (node) sections[id] = rewrite(stripSrcset(slice(node)))
}

// ---------------------------------------------------------------------------
// 6. Emit CSS files
// ---------------------------------------------------------------------------
fs.mkdirSync(OUT_HTML, { recursive: true })

const fetchCss = async (href) => {
  const res = await fetch(`${ORIGIN}${href}`, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    },
  })
  if (!res.ok) throw new Error(`css ${res.status} ${href}`)
  return await res.text()
}

const cssMain = await fetchCss('/_next/static/css/13c77f5c68d25d2c.css')

// self-hosted fonts referenced by the stylesheet -> download + rewrite to /assets/fonts/
const fontRefs = [...new Set(
  [...cssMain.matchAll(/url\(([^)]*\.woff2[^)]*)\)/g)].map((m) =>
    m[1].replace(/["']/g, ''),
  ),
)]
const fontMap = new Map()
for (const ref of fontRefs) {
  const name = path.basename(ref)
  const local = `/assets/fonts/${name}`
  const dest = path.join(ROOT, 'public', local.replace(/^\//, ''))
  try {
    const bytes = await download(`${ORIGIN}${ref}`, dest)
    log('  ↓ font', bytes ?? 'cached', local)
  } catch (err) {
    log('  !! font failed', ref, err.message)
  }
  fontMap.set(ref, local)
}
let cssMainOut = cssMain
for (const [ref, local] of fontMap) cssMainOut = cssMainOut.split(ref).join(local)
fs.writeFileSync(path.join(OUT_HTML, 'site.css'), cssMainOut)
log('wrote site.css', cssMainOut.length, 'bytes')

const cssSwiper = await fetchCss('/_next/static/css/7a339dd6d9a4b4a2.css')
fs.writeFileSync(path.join(OUT_HTML, 'swiper.css'), cssSwiper)
log('wrote swiper.css', cssSwiper.length, 'bytes')

// inline <style> blocks (styled-jsx + font base), urls rewritten
let inline = ''
for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) inline += m[1] + '\n'
inline = rewrite(inline)
fs.writeFileSync(path.join(OUT_HTML, 'inline.css'), inline)
log('wrote inline.css', inline.length, 'bytes')

// ---------------------------------------------------------------------------
// 7. Emit sections.json
// ---------------------------------------------------------------------------
fs.writeFileSync(
  path.join(OUT_HTML, 'sections.json'),
  JSON.stringify(sections, null, 0),
)
log('wrote sections.json with', Object.keys(sections).length, 'sections')

// summary
const sizes = Object.entries(sections).map(([k, v]) => `${k}:${v.length}`)
log('section sizes:', sizes.join('  '))
