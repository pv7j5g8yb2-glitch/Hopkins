// Email, through Resend (resend.com), once RESEND_API_KEY and MAIL_FROM are set on the server.
// MAIL_FROM is the sender, on a domain verified in Resend, like "Hopkins <hello@kirmistudio.com>".
// Without them nothing is sent and callers fall back to what they did before (password reset
// links made by hand in Admin). Free plan, checked 2026-10-25: 3,000 emails a month, 100 a day.

export const mailReady = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

// True when Resend took the email. Never throws: a failed email is logged and the caller decides.
export async function sendMail({ to, subject, text, html }) {
  if (!mailReady()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`Email failed with HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email failed:", err.message);
    return false;
  }
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// The password reset email: one plain message and one button, in the brand's colours.
export function resetEmail(link) {
  const text = `A password reset was requested for your Hopkins account.\n\nUse this link to choose a new password. It can be used once and expires in 48 hours:\n${link}\n\nIf you didn't request this, you can ignore this email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#F4EBDD;font-family:Helvetica,Arial,sans-serif;color:#2A0F14">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <p style="font-size:20px;font-weight:700;letter-spacing:-0.5px;margin:0 0 28px">Hopkins</p>
    <p style="font-size:24px;font-weight:700;letter-spacing:-0.6px;line-height:1.2;margin:0 0 14px">Reset your password</p>
    <p style="font-size:16px;line-height:1.55;color:#5E4E49;margin:0 0 24px">A password reset was requested for your Hopkins account. This link can be used once and expires in 48 hours.</p>
    <a href="${esc(link)}" style="display:inline-block;background:#D7AE62;color:#2A0F14;font-weight:700;font-size:16px;text-decoration:none;padding:14px 22px;border-radius:12px">Choose a new password</a>
    <p style="font-size:14px;line-height:1.5;color:#94857E;margin:28px 0 0">If you didn't request this, you can ignore this email.</p>
  </div></body></html>`;
  return { subject: "Reset your Hopkins password", text, html };
}
