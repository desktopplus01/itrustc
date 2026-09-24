import { Link, useLocation } from "react-router-dom";
import "./auth.css";

const CONTENT = {
  "/terms": {
    title: "Terms of Service",
    updated: "Last updated: September 2026",
    sections: [
      {
        h: "1. Acceptance of terms",
        p: "By creating an account or using Monetra you agree to these terms. If you do not agree, do not use the service.",
      },
      {
        h: "2. Your account",
        p: "You are responsible for keeping your credentials secure and for all activity that happens under your account. Accounts are subject to approval and may be suspended for suspicious or abusive activity.",
      },
      {
        h: "3. Funds and transactions",
        p: "Deposits, withdrawals, transfers and trades initiated from your dashboard are executed against the balances shown in the app. Demo balances, bonuses and market data in this build are simulated for demonstration purposes.",
      },
      {
        h: "4. Goals and cards",
        p: "Money moved into a savings goal is held separately from your available balance until you move it back or delete the goal. Virtual cards spend against your available balance and can be frozen or deleted at any time.",
      },
      {
        h: "5. Acceptable use",
        p: "You may not use Monetra for fraud, money laundering, or any unlawful purpose. Violations result in immediate account termination and may be reported to authorities.",
      },
      {
        h: "6. Disclaimer",
        p: "The service is provided “as is” without warranties of any kind. To the maximum extent permitted by law we are not liable for indirect or consequential damages arising from your use of the service.",
      },
    ],
  },
  "/privacy": {
    title: "Privacy Policy",
    updated: "Last updated: September 2026",
    sections: [
      {
        h: "1. What we collect",
        p: "We collect the information you provide when you register (name, email, phone) plus the activity you generate in the app — transactions, goals, cards and notifications.",
      },
      {
        h: "2. How we use it",
        p: "Your data is used to operate the account you see: showing balances, processing the actions you trigger, sending you notifications and keeping the service secure.",
      },
      {
        h: "3. What we never do",
        p: "We never sell your personal data. We never share it with third parties for advertising. Access is limited to systems needed to run the service.",
      },
      {
        h: "4. Security",
        p: "Passwords are hashed with bcrypt, sessions use signed tokens, and two-factor authentication can be enabled from Settings. Report suspected vulnerabilities to security@monetra.app.",
      },
      {
        h: "5. Your rights",
        p: "You can update your profile and password any time in Settings, export your transaction history from the Transactions page, and permanently delete your account from Settings → Danger zone.",
      },
      {
        h: "6. Contact",
        p: "Questions about privacy? Email privacy@monetra.app and we will respond within one business day.",
      },
    ],
  },
};

/** Terms of Service / Privacy Policy pages linked from the auth flows. */
export default function Legal() {
  const { pathname } = useLocation();
  const page = CONTENT[pathname] || CONTENT["/terms"];

  return (
    <div className="auth-bg flex items-start justify-center px-4 py-10" style={{ minHeight: "100vh" }}>
      <div className="auth-signup-card" style={{ maxWidth: 640, width: "100%" }}>
        <div className="text-center mb-6">
          <h1 className="text-white text-xl font-bold mb-1">{page.title}</h1>
          <p className="text-white/40 text-xs">{page.updated}</p>
        </div>

        {page.sections.map((s) => (
          <div key={s.h} className="mb-4">
            <h3 className="text-white text-sm font-semibold mb-1">{s.h}</h3>
            <p className="text-white/60 text-[13px] leading-relaxed">{s.p}</p>
          </div>
        ))}

        <div className="flex gap-3 mt-6">
          <Link to="/auth/login" className="auth-btn-secondary flex-1 text-center">
            Back to Log In
          </Link>
          <Link to="/" className="auth-btn-green flex-1 text-center no-underline">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
