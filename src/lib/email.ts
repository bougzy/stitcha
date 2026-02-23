import nodemailer from "nodemailer";

/* -------------------------------------------------------------------------- */
/*  Email service                                                              */
/*  Uses SMTP when configured, falls back to console logging in development   */
/* -------------------------------------------------------------------------- */

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@stitcha.app";
const FROM_NAME = process.env.FROM_NAME || "Stitcha";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://stitcha.vercel.app";

const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

function getTransport() {
  if (!isConfigured) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  const transport = getTransport();

  if (!transport) {
    console.log(`\n📧 EMAIL (dev mode - no SMTP configured)`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body preview: ${html.replace(/<[^>]*>/g, "").slice(0, 200)}...\n`);
    return true;
  }

  await transport.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
  });

  return true;
}

/* -------------------------------------------------------------------------- */
/*  Email templates                                                            */
/* -------------------------------------------------------------------------- */

const baseStyle = `
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  max-width: 560px; margin: 0 auto; padding: 40px 24px;
  background: #FAFAF8; color: #1A1A2E;
`;

const btnStyle = `
  display: inline-block; padding: 14px 32px; border-radius: 12px;
  background: linear-gradient(135deg, #C75B39, #b14a2b);
  color: #fff; text-decoration: none; font-weight: 600; font-size: 15px;
`;

function wrap(content: string) {
  return `
    <div style="${baseStyle}">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:24px;font-weight:800;color:#C75B39;margin:0;">Stitcha</h1>
      </div>
      ${content}
      <div style="margin-top:40px;padding-top:20px;border-top:1px solid #1A1A2E10;text-align:center;">
        <p style="font-size:12px;color:#1A1A2E55;">&copy; ${new Date().getFullYear()} Stitcha. All rights reserved.</p>
      </div>
    </div>
  `;
}

/* ---- Verification email ---- */
export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  const html = wrap(`
    <h2 style="font-size:20px;margin:0 0 12px;">Welcome, ${name}!</h2>
    <p style="font-size:15px;line-height:1.6;color:#1A1A2E99;">
      Thank you for joining Stitcha. Please verify your email address to get started.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${link}" style="${btnStyle}">Verify Email Address</a>
    </div>
    <p style="font-size:13px;color:#1A1A2E66;">
      If you didn't create this account, you can safely ignore this email.
    </p>
  `);

  return sendEmail(to, "Verify your Stitcha account", html);
}

/* ---- Password reset email ---- */
export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  const html = wrap(`
    <h2 style="font-size:20px;margin:0 0 12px;">Password Reset</h2>
    <p style="font-size:15px;line-height:1.6;color:#1A1A2E99;">
      Hi ${name}, we received a request to reset your password. Click the button below to create a new password.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${link}" style="${btnStyle}">Reset Password</a>
    </div>
    <p style="font-size:13px;color:#1A1A2E66;">
      This link expires in 1 hour. If you didn't request this, you can ignore this email.
    </p>
  `);

  return sendEmail(to, "Reset your Stitcha password", html);
}

/* ---- Order status notification ---- */
export async function sendOrderStatusEmail(
  to: string,
  clientName: string,
  orderTitle: string,
  status: string,
  designerName: string
) {
  const statusLabels: Record<string, string> = {
    confirmed: "has been confirmed",
    cutting: "is now being cut",
    sewing: "is now being sewn",
    fitting: "is ready for fitting",
    finishing: "is in the finishing stage",
    ready: "is ready for pickup!",
    delivered: "has been delivered",
  };

  const statusText = statusLabels[status] || `status has been updated to: ${status}`;
  const html = wrap(`
    <h2 style="font-size:20px;margin:0 0 12px;">Order Update</h2>
    <p style="font-size:15px;line-height:1.6;color:#1A1A2E99;">
      Hi ${clientName.split(" ")[0]}, your order <strong>"${orderTitle}"</strong> ${statusText}.
    </p>
    <div style="margin:24px 0;padding:16px;background:#fff;border-radius:12px;border:1px solid #1A1A2E10;">
      <p style="font-size:13px;color:#1A1A2E66;margin:0 0 4px;">Designer</p>
      <p style="font-size:15px;font-weight:600;margin:0;">${designerName}</p>
    </div>
    <p style="font-size:13px;color:#1A1A2E66;">
      Contact your designer if you have any questions about your order.
    </p>
  `);

  return sendEmail(to, `Order Update: "${orderTitle}" ${statusText}`, html);
}
