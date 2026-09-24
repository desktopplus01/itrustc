import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";
import "../auth/auth.css";

/**
 * OTP verification page — 6-digit code input with auto-advance.
 * Receives email via location state from AuthSignup.
 */
export default function AuthVerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const password = location.state?.password;
  const firstName = location.state?.firstName;
  const lastName = location.state?.lastName;
  const phone = location.state?.phone;

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate("/auth/signup");
      return;
    }
    inputRefs.current[0]?.focus();
  }, [email]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d !== "")) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (otpCode) => {
    setLoading(true);
    setError("");
    try {
      await api.verifyOtp(email, otpCode, "SIGNUP");
      await api.signup({
        email,
        password,
        firstName,
        lastName,
        phone: phone || undefined,
        otpVerified: true,
      });
      navigate("/auth/pending");
    } catch (err) {
      setError(err.message || "Invalid verification code");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResending(true);
    setError("");
    try {
      await api.requestOtp(email, "SIGNUP");
      setResendTimer(60);
    } catch (err) {
      setError(err.message || "We could not resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="auth-bg flex items-center justify-center px-4 py-10">
      <div className="auth-signup-card text-center">
        {/* Logo */}
        <Link to="/auth" className="flex justify-center mb-6">
          <img src="/itrustc/assets/logos/itc-h-w.svg" alt="iTrustCapital" className="h-6 w-auto" />
        </Link>

        {/* Icon */}
        <div className="mb-6">
          <svg viewBox="0 0 80 80" className="w-20 h-20 mx-auto">
            <circle cx="40" cy="40" r="38" fill="none" stroke="#588F2B" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="40" cy="40" r="28" fill="rgba(88, 143, 43, 0.15)" />
            <rect x="26" y="32" width="28" height="4" rx="2" fill="#588F2B" />
            <rect x="30" y="44" width="20" height="3" rx="1.5" fill="#588F2B" opacity="0.5" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-white text-xl font-bold mb-2">Verify Your Email</h1>
        <p className="text-white/60 text-sm leading-relaxed mb-6">
          We sent a 6-digit verification code to
        </p>
        <p className="text-white font-medium text-sm mb-6">{email}</p>

        {/* OTP Input */}
        <div className="flex justify-center gap-3 mb-4" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/15 rounded-lg text-white outline-none transition-all focus:border-[#588F2B] disabled:opacity-50"
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-white/50 text-sm mb-4">Verifying...</p>
        )}

        {/* Resend */}
        <div className="text-white/40 text-sm mb-6">
          Didn't receive the code?{" "}
          {resendTimer > 0 ? (
            <span>Resend in {resendTimer}s</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-[#588F2B] hover:underline bg-transparent border-none cursor-pointer"
            >
              {resending ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>

        {/* Back */}
        <Link to="/auth/signup" className="auth-link text-xs">
          Back to Sign Up
        </Link>
      </div>
    </div>
  );
}
