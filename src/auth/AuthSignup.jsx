import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import "./auth.css";

const PASSWORD_RULES = [
  { label: "Password must be between 8 and 24 characters.", test: (v) => v.length >= 8 && v.length <= 24 },
  { label: "Password must contain at least 1 lowercase letter.", test: (v) => /[a-z]/.test(v) },
  { label: "Password must contain at least 1 uppercase letter.", test: (v) => /[A-Z]/.test(v) },
  { label: "Password must have at least 1 number.", test: (v) => /\d/.test(v) },
  { label: "Password must contain at least one special character (@$!%*?&#).", test: (v) => /[@$!%*?&#]/.test(v) },
];

export default function AuthSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = email, 2 = full form
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  // Step 1: submit email and request OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.requestOtp(form.email, "SIGNUP");
      setStep(2);
    } catch (err) {
      setError(err.message || "We could not send the verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: go to OTP page with all form data
  const handleContinueToOtp = (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!form.agree) {
      setError("You must agree to the terms");
      return;
    }

    navigate("/auth/verify-otp", {
      state: {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      },
    });
  };

  // Step 1: just email
  if (step === 1) {
    return (
      <div className="auth-bg flex items-center justify-center px-4 py-10">
        <div className="auth-signup-card">
          <Link to="/auth" className="flex justify-center mb-5">
            <img src="/itrustc/assets/logos/itc-h-w.svg" alt="iTrustCapital" className="h-6 w-auto" />
          </Link>

          <h2 className="text-white text-lg font-bold text-center mb-1">Create Your Account</h2>
          <p className="text-white/50 text-sm text-center mb-6">Enter your email to get started</p>

          <form onSubmit={handleEmailSubmit}>
            <div className="auth-input-group mb-4">
              <input
                type="email"
                id="signup-email"
                placeholder="Email Address"
                value={form.email}
                onChange={update("email")}
                required
              />
              <label htmlFor="signup-email">Email Address *</label>
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? "Sending Code..." : "Continue"}
            </button>
          </form>

          <p className="text-white/50 text-sm text-center mt-4">
            Already have an account?{" "}
            <Link to="/auth/login" className="auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  // Step 2: full form (after email entered)
  return (
    <div className="auth-bg flex items-center justify-center px-4 py-10">
      <div className="auth-signup-card">
        <Link to="/auth" className="flex justify-center mb-5">
          <img src="/itrustc/assets/logos/itc-h-w.svg" alt="iTrustCapital" className="h-6 w-auto" />
        </Link>

        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#588F2B]/15 rounded-full mb-3">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="#588F2B">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 5.5l-4 4a.7.7 0 0 1-1 0l-2-2a.7.7 0 1 1 1-1L7 8.5l3.5-3.5a.7.7 0 1 1 1 1z"/>
            </svg>
            <span className="text-[#588F2B] text-xs font-medium">{form.email}</span>
          </div>
          <h2 className="text-white text-lg font-bold">Complete Your Profile</h2>
        </div>

        <form onSubmit={handleContinueToOtp}>
          <div className="auth-form-row mb-3">
            <div className="auth-input-group">
              <input type="text" id="signup-fname" placeholder="First Name" value={form.firstName} onChange={update("firstName")} required />
              <label htmlFor="signup-fname">First Name</label>
            </div>
            <div className="auth-input-group">
              <input type="text" id="signup-lname" placeholder="Last Name" value={form.lastName} onChange={update("lastName")} required />
              <label htmlFor="signup-lname">Last Name</label>
            </div>
          </div>

          <div className="auth-form-row mb-3">
            <div className="auth-input-group">
              <input type="tel" id="signup-phone" placeholder="Mobile Phone" value={form.phone} onChange={update("phone")} />
              <label htmlFor="signup-phone">Phone (optional)</label>
            </div>
            <div className="auth-input-group relative">
              <input
                type={showPw ? "text" : "password"}
                id="signup-pw"
                placeholder="Password"
                value={form.password}
                onChange={update("password")}
                required
              />
              <label htmlFor="signup-pw">Password</label>
              <button type="button" onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" tabIndex={-1}>
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  {showPw ? (
                    <path d="M10 3C5.5 3 1.7 6.1.5 10c1.2 3.9 5 7 9.5 7s8.3-3.1 9.5-7c-1.2-3.9-5-7-9.5-7zm0 11.5c-2.5 0-4.5-2-4.5-4.5S7.5 5.5 10 5.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>
                  ) : (
                    <path d="M17.6 11.2l-1.7-1.7A4.5 4.5 0 0 0 14.5 9c-2.5 0-4.5 2-4.5 4.5 0 .5.1 1 .2 1.5l-1.7 1.7A8.4 8.4 0 0 1 2.2 11c-1.2-3.1-1.2-6.5 0-9.6.2-.5.7-.5 1 0 3 3 6.9 4.7 11 4.7.5 0 1 0 1.5-.1.5-.1.5-.5.3-.9l-.4-.9zM10 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className="auth-form-row mb-1">
            <div className="auth-input-group relative">
              <input
                type={showConfirm ? "text" : "password"}
                id="signup-confirm"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                required
              />
              <label htmlFor="signup-confirm">Confirm Password</label>
              <button type="button" onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70" tabIndex={-1}>
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  {showConfirm ? (
                    <path d="M10 3C5.5 3 1.7 6.1.5 10c1.2 3.9 5 7 9.5 7s8.3-3.1 9.5-7c-1.2-3.9-5-7-9.5-7zm0 11.5c-2.5 0-4.5-2-4.5-4.5S7.5 5.5 10 5.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>
                  ) : (
                    <path d="M17.6 11.2l-1.7-1.7A4.5 4.5 0 0 0 14.5 9c-2.5 0-4.5 2-4.5 4.5 0 .5.1 1 .2 1.5l-1.7 1.7A8.4 8.4 0 0 1 2.2 11c-1.2-3.1-1.2-6.5 0-9.6.2-.5.7-.5 1 0 3 3 6.9 4.7 11 4.7.5 0 1 0 1.5-.1.5-.1.5-.5.3-.9l-.4-.9zM10 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                  )}
                </svg>
              </button>
            </div>
            <div />
          </div>

          <ul className="auth-pw-req">
            {PASSWORD_RULES.map((rule, i) => {
              const passed = rule.test(form.password);
              return (
                <li key={i} className={passed ? "req-ok" : "req-fail"}>
                  <span className="text-[10px]">{passed ? "✓" : "✗"}</span>
                  <span className={passed ? "text-white/50" : ""}>{rule.label}</span>
                </li>
              );
            })}
          </ul>

          <label className="flex items-start gap-2 mt-3 mb-4 cursor-pointer">
            <input type="checkbox" checked={form.agree} onChange={update("agree")} className="mt-0.5 accent-[#588F2B]" required />
            <span className="text-white/60 text-xs leading-snug">
              By clicking you agree to our{" "}
              <Link to="/terms" className="auth-link text-xs">Terms of Service</Link> and{" "}
              <Link to="/privacy" className="auth-link text-xs">Privacy Policy</Link>
            </span>
          </label>

          {error && (
            <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <button type="submit" className="auth-btn-primary">
            Verify Email & Sign Up
          </button>
        </form>

        <p className="text-white/50 text-sm text-center mt-4">
          Already have an account?{" "}
          <Link to="/auth/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
