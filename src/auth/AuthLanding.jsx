import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "./auth.css";

/**
 * Auth landing page — screens 1 & 1b from the design.
 * Dark geometric background with a semi-transparent hero card that
 * cycles between value propositions every ~5 seconds.
 */
const slides = [
  {
    id: 0,
    heading: "Welcome to iTrustCapital",
    sub: "The #1 Crypto IRA Platform in\nAmerica",
    /* Phone showing crypto/Bitcoin */
    img: (
      <svg viewBox="0 0 120 200" className="w-20 h-28 mx-auto mb-4">
        <defs>
          <linearGradient id="phoneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a3f5f" />
            <stop offset="100%" stopColor="#162238" />
          </linearGradient>
        </defs>
        {/* Phone body */}
        <rect x="10" y="5" width="100" height="190" rx="14" fill="url(#phoneGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        {/* Screen */}
        <rect x="16" y="22" width="88" height="156" rx="4" fill="#0d1b2a" />
        {/* Top bar */}
        <rect x="16" y="22" width="88" height="24" rx="4" fill="#162a40" />
        <text x="28" y="38" fill="#fff" fontSize="7" fontWeight="bold">iTrustCapital</text>
        {/* BTC symbol */}
        <circle cx="60" cy="80" cy="80" r="22" fill="rgba(247,147,26,0.15)" />
        <text x="60" y="86" fill="#f7931a" fontSize="22" fontWeight="bold" textAnchor="middle">₿</text>
        {/* Balance */}
        <text x="60" y="116" fill="#fff" fontSize="8" textAnchor="middle">$12,847.32</text>
        <text x="60" y="126" fill="#588F2B" fontSize="6" textAnchor="middle">+3.24%</text>
        {/* Bottom nav dots */}
        <circle cx="40" cy="165" r="3" fill="rgba(255,255,255,0.3)" />
        <circle cx="60" cy="165" r="3" fill="#588F2B" />
        <circle cx="80" cy="165" r="3" fill="rgba(255,255,255,0.3)" />
      </svg>
    ),
  },
  {
    id: 1,
    heading: "Track your crypto portfolio",
    sub: "Buy and Sell Cryptocurrency and\nPhysical Gold & Silver in your\nRetirement Account",
    /* Phone showing dashboard/charts */
    img: (
      <svg viewBox="0 0 120 200" className="w-20 h-28 mx-auto mb-4">
        <defs>
          <linearGradient id="phoneGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a3f5f" />
            <stop offset="100%" stopColor="#162238" />
          </linearGradient>
        </defs>
        {/* Phone body */}
        <rect x="10" y="5" width="100" height="190" rx="14" fill="url(#phoneGrad2)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        {/* Screen */}
        <rect x="16" y="22" width="88" height="156" rx="4" fill="#0d1b2a" />
        {/* Top bar */}
        <rect x="16" y="22" width="88" height="24" rx="4" fill="#162a40" />
        <text x="28" y="38" fill="#fff" fontSize="7" fontWeight="bold">Dashboard</text>
        {/* Chart area */}
        <polyline points="24,90 34,85 44,88 54,75 64,78 74,65 84,68 94,60 100,55"
          fill="none" stroke="#588F2B" strokeWidth="2" strokeLinecap="round" />
        <polyline points="24,90 34,85 44,88 54,75 64,78 74,65 84,68 94,60 100,55 100,100 24,100"
          fill="url(#chartFill)" opacity="0.3" />
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#588F2B" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {/* Stats rows */}
        <rect x="24" y="108" width="32" height="8" rx="2" fill="rgba(255,255,255,0.08)" />
        <rect x="24" y="120" width="32" height="8" rx="2" fill="rgba(255,255,255,0.08)" />
        <rect x="24" y="132" width="32" height="8" rx="2" fill="rgba(255,255,255,0.08)" />
        <rect x="60" y="108" width="36" height="8" rx="2" fill="rgba(255,255,255,0.08)" />
        <rect x="60" y="120" width="36" height="8" rx="2" fill="rgba(255,255,255,0.08)" />
        <rect x="60" y="132" width="36" height="8" rx="2" fill="rgba(255,255,255,0.08)" />
        {/* Bottom nav dots */}
        <circle cx="40" cy="165" r="3" fill="rgba(255,255,255,0.3)" />
        <circle cx="60" cy="165" r="3" fill="#588F2B" />
        <circle cx="80" cy="165" r="3" fill="rgba(255,255,255,0.3)" />
      </svg>
    ),
  },
];

export default function AuthLanding() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  const advance = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setCurrent((c) => (c + 1) % slides.length);
      setFading(false);
    }, 400);
  }, []);

  useEffect(() => {
    const timer = setInterval(advance, 5000);
    return () => clearInterval(timer);
  }, [advance]);

  const slide = slides[current];

  return (
    <div className="auth-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link to="/" className="mb-6 inline-block">
        <img
          src="/itrustc/assets/logos/itc-h-w.svg"
          alt="iTrustCapital"
          className="h-7 w-auto"
        />
      </Link>

      {/* Hero card */}
      <div className="auth-hero-card">
        {/* Phone illustration */}
        <div className={fading ? "auth-carousel-exit" : "auth-carousel-enter"} key={slide.id}>
          {slide.img}

          <h2 className="text-white text-lg font-bold mb-1 leading-snug">
            {slide.heading}
          </h2>
          <p className="text-white/70 text-xs leading-relaxed whitespace-pre-line mb-4">
            {slide.sub}
          </p>
        </div>

        {/* Thin divider */}
        <div className="w-10 h-[2px] bg-white/20 mx-auto mb-4" />

        {/* Terms */}
        <p className="text-white/60 text-[11px] leading-snug mb-5">
          By accessing the platform, you agree to our{" "}
          <Link to="/terms" className="auth-link text-[11px] underline">
            Terms of Service
          </Link>
          .
        </p>

        {/* CTA buttons */}
        <Link
          to="/auth/login"
          className="auth-btn-dark text-center block no-underline mb-2"
        >
          Log In
        </Link>
        <Link
          to="/auth/signup"
          className="auth-btn-green text-center block no-underline"
        >
          Open Account
        </Link>
      </div>

      {/* Resend link */}
      <p className="text-white/40 text-[11px] mt-4 text-center">
        Need a new verification email?{" "}
        <Link to="/auth/signup" className="text-white/60 underline">
          Click here to resend
        </Link>
        .
      </p>

      {/* reCAPTCHA badge */}
      <div className="auth-recaptcha">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#4285f4" strokeWidth="2" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="#ea4335" strokeWidth="2" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="#fbbc05" strokeWidth="2" />
          <path d="M12 22a10 10 0 0 1-10-10" stroke="#34a853" strokeWidth="2" />
        </svg>
        <span>reCAPTCHA</span>
        <span>Terms</span>
      </div>
    </div>
  );
}
