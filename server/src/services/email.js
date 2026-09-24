import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Resend only delivers from verified domains. A free gmail/yahoo/outlook
 * address can't be verified, so falls back to Resend's sandbox sender
 * (delivers to the account owner's email — fine for development).
 */
function resolveFrom() {
  const configured = process.env.EMAIL_FROM;
  if (configured && /@(gmail|yahoo|outlook|hotmail|icloud)\./i.test(configured)) {
    console.warn(`[email] EMAIL_FROM "${configured}" is not a verifiable domain — using onboarding@resend.dev. Add a verified domain at resend.com/domains for real delivery.`);
    return 'iTrustCapital <onboarding@resend.dev>';
  }
  return configured || 'iTrustCapital <onboarding@resend.dev>';
}

/**
 * Single delivery path for every email. The Resend SDK resolves errors as
 * { data, error } instead of throwing — check explicitly so a failed send
 * is loud in the logs instead of silently "successful".
 */
async function deliver({ to, subject, html }) {
  try {
    const { data, error } = await resend.emails.send({ from: resolveFrom(), to, subject, html });
    if (error) {
      console.error(`[email] FAILED to ${to} ("${subject}"): ${error.message} (status ${error.statusCode || 'n/a'})`);
      return false;
    }
    console.log(`[email] sent to ${to}: ${subject} (id ${data?.id || 'n/a'})`);
    return true;
  } catch (err) {
    console.error(`[email] FAILED to ${to} ("${subject}"): ${err?.message || err}`);
    return false;
  }
}

const BRAND = 'iTrustCapital';

const shell = (title, bodyHtml) => `
  <!DOCTYPE html>
  <html>
  <head><style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0a0f1e 0%, #162238 100%); padding: 30px; text-align: center; }
    .header h1 { color: #588F2B; font-size: 24px; margin: 0 0 5px; }
    .header p { color: #aaa; font-size: 14px; margin: 0; }
    .content { padding: 30px; }
    .content p { color: #333; line-height: 1.6; margin: 10px 0; }
    .btn { display: inline-block; background: #588F2B; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .amount { font-size: 32px; font-weight: bold; color: #588F2B; margin: 16px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
  </style></head>
  <body><div class="container">
    <div class="header"><h1>${BRAND}</h1><p>${title}</p></div>
    <div class="content">${bodyHtml}</div>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p></div>
  </div></body>
  </html>`;

/** Fire-and-forget wrapper: an email failure must never break a request. */
export async function sendMail({ to, subject, html }) {
  return deliver({ to, subject, html });
}

export const sendApprovalEmail = async (user) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return deliver({
    to: user.email,
    subject: 'Your iTrustCapital Account Has Been Approved!',
    html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0a0f1e 0%, #162238 100%); padding: 30px; text-align: center; }
            .header img { height: 30px; }
            .header h1 { color: #588F2B; font-size: 24px; margin: 15px 0 5px; }
            .header p { color: #aaa; font-size: 14px; }
            .content { padding: 30px; }
            .bonus-box { background: linear-gradient(135deg, #588F2B 0%, #4a7a24 100%); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
            .bonus-box h2 { color: white; font-size: 36px; margin: 0; }
            .bonus-box p { color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 14px; }
            .content p { color: #333; line-height: 1.6; margin: 10px 0; }
            .btn { display: inline-block; background: #588F2B; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .btn:hover { background: #4a7a24; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>iTrustCapital</h1>
              <p>Account Approved</p>
            </div>
            <div class="content">
              <p>Hi ${user.firstName},</p>
              <p>Great news! Your iTrustCapital account has been approved and is now active.</p>
              
              <div class="bonus-box">
                <h2>$100.00</h2>
                <p>Welcome Bonus Credited</p>
              </div>
              
              <p>We've added a <strong>$100.00 welcome bonus</strong> to your account. You can now start investing in cryptocurrency and precious metals through your IRA.</p>
              
              <p>Here's what you can do next:</p>
              <ul>
                <li>Log in to your account</li>
                <li>Complete your profile</li>
                <li>Start funding your account</li>
                <li>Explore available investment options</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="${frontendUrl}/auth/login" class="btn">Log In to Your Account</a>
              </p>
              
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Best regards,<br/>The iTrustCapital Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} iTrustCapital. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
  });
};

/** Admin approved/declined one of the user's money requests. */
export const sendRequestUpdateEmail = async (user, { type, amount, approved, note }) => {
  const labels = {
    DEPOSIT: 'Deposit',
    WITHDRAWAL: 'Withdrawal',
    TRANSFER: 'Send money',
    CARD_FUND: 'Card funding',
    CARD_TO_WALLET: 'Card to wallet',
    CARD_SEND: 'Card send',
  };
  const label = labels[type] || 'Request';
  const money = Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const html = approved
    ? shell(
        `${label} approved`,
        `<p>Hi ${user.firstName},</p>
         <p>Good news! Your ${label.toLowerCase()} of <strong>$${money}</strong> has been reviewed and approved.</p>
         <div class="amount">$${money}</div>
         <p>Your balance has been updated and the transaction now shows as completed in your account.</p>
         <p style="text-align: center;"><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/account" class="btn">View your transactions</a></p>
         <p>Best regards,<br/>The ${BRAND} Team</p>`
      )
    : shell(
        `${label} declined`,
        `<p>Hi ${user.firstName},</p>
         <p>We reviewed your ${label.toLowerCase()} of <strong>$${money}</strong> and were unable to approve it at this time.</p>
         ${note ? `<p><strong>Reason:</strong> ${note}</p>` : ''}
         <p>If funds were held while the request was pending, they have already been returned to your balance.</p>
         <p>Best regards,<br/>The ${BRAND} Team</p>`
      );

  return sendMail({ to: user.email, subject: approved ? `Your ${label} was approved` : `Update on your ${label}`, html });
};

/** The $100 welcome bonus just became usable. */
export const sendBonusUnlockEmail = async (user, amount = 100) => {
  const html = shell(
    'Welcome bonus unlocked',
    `<p>Hi ${user.firstName},</p>
     <p>You've funded <strong>$1,000</strong> of your own money into your ${BRAND} account — thank you!</p>
     <div class="amount">$${Number(amount).toFixed(2)} unlocked</div>
     <p>Your welcome bonus is no longer locked. You can now use it to invest in any plan, send it to another user, or withdraw it.</p>
     <p style="text-align: center;"><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/invest" class="btn">Start investing</a></p>
     <p>Best regards,<br/>The ${BRAND} Team</p>`
  );
  return sendMail({ to: user.email, subject: 'Your $100 welcome bonus is unlocked', html });
};

export const sendRejectionEmail = async (user) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return deliver({
    to: user.email,
    subject: 'iTrustCapital Account Update',
    html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0a0f1e 0%, #162238 100%); padding: 30px; text-align: center; }
            .header h1 { color: #fff; font-size: 24px; margin: 15px 0 5px; }
            .content { padding: 30px; }
            .content p { color: #333; line-height: 1.6; margin: 10px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>iTrustCapital</h1>
            </div>
            <div class="content">
              <p>Hi ${user.firstName},</p>
              <p>Thank you for your interest in iTrustCapital. After reviewing your registration, we were unable to approve your account at this time.</p>
              <p>If you believe this was an error, please contact our support team for assistance.</p>
              <p>Best regards,<br/>The iTrustCapital Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} iTrustCapital. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
  });
};

const OTP_SUBJECTS = {
  SIGNUP: 'Verify Your Email - iTrustCapital',
  RESET: 'Reset Your Password - iTrustCapital',
  LOGIN: 'Your Login Verification Code - iTrustCapital',
};

export const sendOtpEmail = async (email, code, type = 'SIGNUP') => {
  const subject = OTP_SUBJECTS[type] || OTP_SUBJECTS.SIGNUP;

  return deliver({
    to: email,
    subject,
    html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0a0f1e 0%, #162238 100%); padding: 30px; text-align: center; }
            .header h1 { color: #588F2B; font-size: 24px; margin: 0; }
            .content { padding: 30px; text-align: center; }
            .content p { color: #333; line-height: 1.6; margin: 10px 0; }
            .otp-code { font-size: 48px; font-weight: bold; color: #588F2B; letter-spacing: 8px; margin: 30px 0; padding: 20px; background: #f0f7e8; border-radius: 12px; }
            .otp-label { font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
            .warning { font-size: 13px; color: #666; margin-top: 20px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>iTrustCapital</h1>
            </div>
            <div class="content">
              <p>Your verification code is:</p>
              <div class="otp-label">One-Time Code</div>
              <div class="otp-code">${code}</div>
              <p>This code will expire in <strong>10 minutes</strong>.</p>
              <p class="warning">If you didn't request this code, please ignore this email or contact support.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} iTrustCapital. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
  });
};
