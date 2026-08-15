import parse from 'html-react-parser'

/**
 * Parse an exact snippet of the site's server-rendered HTML into React.
 * html-react-parser keeps the DOM identical (attributes, inline styles,
 * inline SVGs, entities) while giving us React rendering.
 */

// GitHub Pages serves this project under /<repo>/ (see vite.config.js). The
// section HTML strings embed absolute `/assets/...` paths that Vite can't
// rewrite at build time (they're runtime strings, not imports), so we prefix
// them with the deployment base here. In dev the base is the dev server
// root, so nothing changes.
const assetBase = import.meta.env.DEV
  ? ''
  : (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

/** Prefix a runtime asset path (e.g. `/assets/logos/itc-h-w.svg`) with the deployment base. */
export const assetUrl = (path) => (assetBase ? assetBase + path : path)

const rewriteAssets = (html) =>
  assetBase ? html.replace(/\/assets\//g, `${assetBase}/assets/`) : html

export const parseHtml = (html, options) =>
  parse(html ? rewriteAssets(html) : html, options)

/**
 * Render a replica section with optional swiper deps pre-initialized.
 */
export default function ReplicaSection({ html, className, ...rest }) {
  if (!html) return null
  return <div className={className} {...rest}>{parseHtml(html)}</div>
}
