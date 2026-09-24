import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import "./auth.css";

/**
 * Forgot password — full working flow:
 * 1. Enter email → server emails a 6-digit RESET code (console also logs it in dev)
 * 2. Enter the code + a new password → verified and saved
 * 3. Success → back to login
 */
export default function AuthForgotPassword() {
  const [step, setStep] = useState("email"); // "email" | "code" | "done"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (step === "code") inputRefs.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const requestCode = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.requestOtp(email.trim(), "RESET");
      setStep("code");
      setResendTimer(60);
      setCode(["", "", "", "", "", ""]);
    } catch (err) {
      setError(err.message || "We could not send the code. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setError("");

    const joined = code.join("");
    if (joined.length !== 6) return setError("Enter the 6-digit code we emailed you");
    if (password.length < 8) return setError("New password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords do not match");

    setLoading(true);
    try {
      await api.verifyOtp(email.trim(), joined, "RESET");
      await api.resetPassword(email.trim(), password);
      setStep("done");
    } catch (err) {
      setError(err.message || "We could not reset your password. Please try again.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendTimer > 0) return;
    setResending(true);
    setError("");
    try {
      await api.requestOtp(email.trim(), "RESET");
      setResendTimer(60);
    } catch (err) {
      setError(err.message || "We could not resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // ── Success ──
  if (step === "done") {
    return (
      <div className="auth-bg-light flex items-center justify-center px-4">
        <div className="auth-card text-center">
          <div className="mb-5">
            <svg viewBox="0 0 80 80" className="w-16 h-16 mx-auto">
              <circle cx="40" cy="40" r="38" fill="none" stroke="#588F2B" strokeWidth="2" />
              <circle cx="40" cy="40" r="28" fill="rgba(88, 143, 43, 0.15)" />
              <path d="M28 41 L37 50 L53 32" fill="none" stroke="#588F2B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Password reset</h1>
          <p className="text-white/60 text-sm mb-6">
            Your password has been updated. You can now log in with your new password.
          </p>
          <Link to="/auth/login" className="auth-btn-primary block">
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  // ── Code + new password ──
  if (step === "code") {
    return (
      <div className="auth-bg-light flex items-center justify-center px-4">
        <div className="auth-card">
          <Link to="/auth" className="flex justify-center mb-5">
            <img src="/itrustc/assets/logos/itc-h-w.svg" alt="iTrustCapital" className="h-6 w-auto" />
          </Link>

          <h1 className="text-white text-xl font-bold text-center mb-2">Check your email</h1>
          <p className="text-white/60 text-sm text-center mb-1">We sent a 6-digit code to</p>
          <p className="text-white font-medium text-sm text-center mb-6">{email}</p>

          {error && (
            <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={submitReset}>
            <div className="flex justify-center gap-3 mb-5" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  disabled={loading}
                  className="auth-otp-input"
                />
              ))}
            </div>

            <div className="auth-input-group mb-3">
              <input
                type="password"
                id="reset-pw"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <label htmlFor="reset-pw">New password * (min 8 characters)</label>
            </div>

            <div className="auth-input-group mb-4">
              <input
                type="password"
                id="reset-confirm"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
              <label htmlFor="reset-confirm">Confirm new password *</label>
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </form>

          <div className="text-white/40 text-sm text-center mt-4">
            Didn't receive the code?{" "}
            {resendTimer > 0 ? (
              <span>Resend in {resendTimer}s</span>
            ) : (
              <button
                onClick={resend}
                disabled={resending}
                className="text-[#588F2B] hover:underline bg-transparent border-none cursor-pointer"
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => { setStep("email"); setError(""); }}
            className="auth-link block text-center text-xs mt-3"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  // ── Email step ──
  return (
    <div className="auth-bg-light flex items-center justify-center px-4">
      <div className="auth-card">
        <Link to="/auth" className="flex justify-center mb-5">
          <img src="/itrustc/assets/logos/itc-h-w.svg" alt="iTrustCapital" className="h-6 w-auto" />
        </Link>

        <h1 className="text-white text-xl font-bold text-center mb-2">
          Forgot Your Password?
        </h1>
        <p className="text-white/60 text-sm text-center mb-6 leading-relaxed">
          Enter your email address and we will send you a code to reset your password.
        </p>

        {error && (
          <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={requestCode}>
          <div className="auth-input-group">
            <input
              type="email"
              id="forgot-email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="forgot-email">Email address *</label>
          </div>

          <button type="submit" className="auth-btn-primary mt-2" disabled={loading}>
            {loading ? "Sending code…" : "Send reset code"}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link to="/auth/login" className="auth-link">
            Back to Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
