import { Link } from "react-router-dom";
import "./auth.css";

/**
 * Pending Approval page — shown after signup while waiting for admin approval.
 */
export default function AuthPending() {
  return (
    <div className="auth-bg flex items-center justify-center px-4 py-10">
      <div className="auth-signup-card text-center">
        {/* Logo */}
        <Link to="/auth" className="flex justify-center mb-6">
          <img
            src="/itrustc/assets/logos/itc-h-w.svg"
            alt="iTrustCapital"
            className="h-6 w-auto"
          />
        </Link>

        {/* Pending Icon */}
        <div className="mb-6">
          <svg viewBox="0 0 80 80" className="w-20 h-20 mx-auto">
            <circle cx="40" cy="40" r="38" fill="none" stroke="#588F2B" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="40" cy="40" r="28" fill="rgba(88, 143, 43, 0.15)" />
            <path d="M40 25 L40 42 L52 42" fill="none" stroke="#588F2B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-white text-xl font-bold mb-3">
          Account Pending Approval
        </h1>
        
        <p className="text-white/60 text-sm leading-relaxed mb-6">
          Thank you for registering! Your account is currently under review by our admin team.
          You will receive an email once your account has been approved.
        </p>

        {/* What to expect */}
        <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-white/80 text-sm font-semibold mb-3">What happens next?</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-white/50 text-xs">
              <span className="text-[#588F2B] mt-0.5">1.</span>
              <span>Our team reviews your registration</span>
            </li>
            <li className="flex items-start gap-2 text-white/50 text-xs">
              <span className="text-[#588F2B] mt-0.5">2.</span>
              <span>You'll receive an approval email with a $100 welcome bonus</span>
            </li>
            <li className="flex items-start gap-2 text-white/50 text-xs">
              <span className="text-[#588F2B] mt-0.5">3.</span>
              <span>Log in and start investing</span>
            </li>
          </ul>
        </div>

        {/* Info box */}
        <div className="bg-[#588F2B]/10 border border-[#588F2B]/30 rounded-lg p-3 mb-6">
          <p className="text-[#588F2B] text-xs">
            Approval typically takes 1-2 business days. Check your email for updates.
          </p>
        </div>

        {/* Actions */}
        <Link
          to="/auth/login"
          className="auth-btn-secondary block text-center mb-3"
        >
          Back to Login
        </Link>
        
        <Link
          to="/"
          className="auth-link text-xs"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
