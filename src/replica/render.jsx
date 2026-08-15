import parse from 'html-react-parser'

/**
 * Parse an exact snippet of the site's server-rendered HTML into React.
 * html-react-parser keeps the DOM identical (attributes, inline styles,
 * inline SVGs, entities) while giving us React rendering.
 */
export const parseHtml = (html, options) => parse(html, options)

/**
 * Render a replica section with optional swiper deps pre-initialized.
 */
export default function ReplicaSection({ html, className, ...rest }) {
  if (!html) return null
  return <div className={className} {...rest}>{parseHtml(html)}</div>
}
