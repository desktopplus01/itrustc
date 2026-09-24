import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import api from "../lib/api";
import "./auth.css";

export default function AuthLogin() {
  const navigate = useNavigate();
  const { login, verifyLogin } = useAuth();
  const [step, setStep] = useState("credentials"); // "credentials" or "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP state
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (step === "otp") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleCredentialSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result?.twoFactorRequired) {
        // Show OTP screen
        setStep("otp");
        setResendTimer(60);
        setOtpCode(["", "", "", "", "", ""]);
      } else if (result?.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      if (err.message.includes("pending")) {
        navigate("/auth/pending", { replace: true });
      } else {
        setError(err.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d !== "")) {
      handleVerifyOtp(newCode.join(""));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setOtpCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    }
  };

  const handleVerifyOtp = async (code) => {
    setLoading(true);
    setError("");
    try {
      const user = await verifyLogin(email, code);
      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Invalid verification code");
      setOtpCode(["", "", "", "", "", ""]);
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
      await api.requestOtp(email, "LOGIN");
      setResendTimer(60);
    } catch (err) {
      setError(err.message || "We could not resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep("credentials");
    setError("");
    setOtpCode(["", "", "", "", "", ""]);
  };

  // ── OTP Verification Step ──
  if (step === "otp") {
    return (
      <div className="auth-bg-light flex items-center justify-center px-4">
        <div className="auth-card">
          <Link to="/auth" className="flex justify-center mb-5">
            <img src="/itrustc/assets/logos/itc-h-w.svg" alt="iTrustCapital" className="h-6 w-auto" />
          </Link>

          <h1 className="text-white text-xl font-bold text-center mb-1">
            Two-Factor Authentication
          </h1>
          <p className="text-white/60 text-sm text-center mb-2">
            We sent a 6-digit verification code to
          </p>
          <p className="text-white font-medium text-sm text-center mb-6">{email}</p>

          {error && (
            <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-3 mb-4" onPaste={handleOtpPaste}>
            {otpCode.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                disabled={loading}
                className="auth-otp-input"
              />
            ))}
          </div>

          {loading && (
            <p className="text-white/50 text-sm text-center mb-4">Verifying...</p>
          )}

          <div className="text-white/40 text-sm text-center mb-6">
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

          <button
            onClick={handleBackToCredentials}
            className="auth-link block text-center text-xs"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  // ── Credentials Step ──
  return (
    <div className="auth-bg-light flex items-center justify-center px-4">
      <div className="auth-card">
        <Link to="/auth" className="flex justify-center mb-5">
          <img src="/itrustc/assets/logos/itc-h-w.svg" alt="iTrustCapital" className="h-6 w-auto" />
        </Link>

        <h1 className="text-white text-xl font-bold text-center mb-1">
          Welcome
        </h1>
        <p className="text-white/60 text-sm text-center mb-6">
          Log in to iTrustCapital to continue.
        </p>

        {error && (
          <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleCredentialSubmit}>
          <div className="auth-input-group">
            <input
              type="email"
              id="login-email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="login-email">Email address *</label>
          </div>

          <div className="auth-input-group">
            <input
              type="password"
              id="login-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label htmlFor="login-password">Password *</label>
          </div>

          <Link to="/auth/forgot" className="auth-link block mb-4">
            Can't log in to your account?
          </Link>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Continue"}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <button
          type="button"
          className="auth-btn-secondary flex items-center justify-center gap-2"
          onClick={() =>
            setError(
              "Passkeys aren't set up for this account yet — continue with your password below."
            )
          }
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12a5 5 0 0 1 5-5h1" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="18" cy="12" r="3" />
            <path d="M18 12v2a3 3 0 0 0 3 3h0" />
          </svg>
          Continue with a passkey
        </button>
      </div>
    </div>
  );
}
