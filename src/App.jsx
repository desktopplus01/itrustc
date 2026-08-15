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
