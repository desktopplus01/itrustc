import { useEffect } from "react";
import MarketTicker from "./replica/MarketTicker.jsx";
import SiteNav from "./replica/SiteNav.jsx";
import HeroSection from "./replica/HeroSection.jsx";
import FeaturedMarquee from "./replica/FeaturedMarquee.jsx";
import HowToSticky from "./replica/HowToSticky.jsx";
import { ReviewCarousel, PromoCarousel } from "./replica/Carousels.jsx";
import Faq from "./replica/Faq.jsx";
import ReplicaSection from "./replica/render.jsx";
import sections from "./replica/sections.json";
import useReveal from "./replica/useReveal.js";

/**
 * Pixel-faithful replica of https://www.itrustcapital.com — every section is
 * the site's own server-rendered HTML (see src/replica/sections.json),
 * styled by its real compiled stylesheets (src/replica/*.css) and rendered
 * with html-react-parser. Sections are ordered exactly like the live page.
 */
export default function App() {
  useReveal();

  // Demo-mode link handling: action buttons/links must not redirect anywhere
  // for now — clicking one just refreshes the page. In-page section links
  // (e.g. `/#faq-home`) still scroll, and buttons (accordions, menus) are
  // untouched; only anchor navigation is intercepted.
  useEffect(() => {
    const onClick = (e) => {
      // respect modified clicks (new tab / download intent) and non-left buttons
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest("a")
      if (!a) return
      const href = a.getAttribute("href")
      if (!href) return
      // non-navigation targets: in-page fragment, tel:, mailto:
      if (href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:")) return
      // scroll to a same-page section target instead of navigating
      const m = href.match(/^[^#]*#(.+)$/)
      if (m) {
        const el = document.getElementById(m[1])
        if (el) {
          e.preventDefault()
          el.scrollIntoView({ behavior: "smooth" })
          return
        }
      }
      // anything that would leave the current page (external site or a route
      // on this site): don't navigate — just refresh the page
      e.preventDefault()
      window.location.reload()
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [])

  return (
    <div className="jsx-4255942806 __variable_a77483">
      <MarketTicker />
      <SiteNav />
      <main>
        {/* hero background image */}
        <ReplicaSection html={sections["mainchild-0"]} />
        {/* hero: headline, trust badges, dashboard cards */}
        <HeroSection />
        {/* decorative gradient band */}
        <ReplicaSection html={sections["mainchild-2"]} />
        {/* featured on */}
        <FeaturedMarquee />
        {/* more options, more flexibility */}
        <ReplicaSection html={sections["mainchild-4"]} />
        {/* reviews carousel */}
        <ReviewCarousel />
        {/* promo carousel */}
        <PromoCarousel />
        {/* decorative gradient band */}
        <ReplicaSection html={sections["mainchild-7"]} />
        {/* how it works */}
        <HowToSticky />
        {/* decorative gradient band */}
        <ReplicaSection html={sections["mainchild-9"]} />
        {/* all in one */}
        <ReplicaSection html={sections["mainchild-10"]} />
        {/* pricing */}
        <ReplicaSection html={sections["main#pricing"]} />
        {/* your assets are secure */}
        <ReplicaSection html={sections["mainchild-12"]} />
        {/* divider */}
        <ReplicaSection html={sections["mainchild-13"]} />
        {/* faq */}
        <Faq />
        {/* still have questions */}
        <ReplicaSection html={sections["mainchild-16"]} />
        {/* decorative gradient band */}
        <ReplicaSection html={sections["mainchild-17"]} />
      </main>
      {/* footer */}
      <ReplicaSection html={sections.footer} />
    </div>
  );
}
