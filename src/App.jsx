import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { ThemeProvider, useTheme } from "./lib/ThemeContext";
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
import AuthLanding from "./auth/AuthLanding.jsx";
import AuthLogin from "./auth/AuthLogin.jsx";
import AuthForgotPassword from "./auth/AuthForgotPassword.jsx";
import AuthSignup from "./auth/AuthSignup.jsx";
import AuthPending from "./auth/AuthPending.jsx";
import AuthVerifyOTP from "./auth/AuthVerifyOTP.jsx";
import Legal from "./auth/Legal.jsx";
import Dashboard from "./dashboard/Dashboard.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";

/**
 * Pixel-faithful replica of https://www.itrustcapital.com — every section is
 * the site's own server-rendered HTML (see src/replica/sections.json),
 * styled by its real compiled stylesheets (src/replica/*.css) and rendered
 * with html-react-parser. Sections are ordered exactly like the live page.
 */
function SiteHome() {
  useReveal();

  useEffect(() => {
    const onClick = (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest("a")
      if (!a) return
      const href = a.getAttribute("href")
      if (!href) return
      if (href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:")) return
      if (href.startsWith("/auth") || href.startsWith("/dashboard") || href.startsWith("/admin")) return
      const m = href.match(/^[^#]*#(.+)$/)
      if (m) {
        const el = document.getElementById(m[1])
        if (el) {
          e.preventDefault()
          el.scrollIntoView({ behavior: "smooth" })
          return
        }
      }
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

function ProtectedRoute({ children, requireApproved = false, requireAdmin = false }) {
  const { user, loading, isApproved, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="auth-spinner" />
          <div className="text-white/40 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireApproved && !isApproved && !isAdmin) {
    return <Navigate to="/auth/pending" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthLanding />} />
          <Route path="/auth/login" element={<AuthLogin />} />
          <Route path="/auth/forgot" element={<AuthForgotPassword />} />
          <Route path="/auth/signup" element={<AuthSignup />} />
          <Route path="/auth/pending" element={<AuthPending />} />
          <Route path="/auth/verify-otp" element={<AuthVerifyOTP />} />
          <Route path="/terms" element={<Legal />} />
          <Route path="/privacy" element={<Legal />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute requireApproved>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/*" element={<SiteHome />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
