import { env } from '../config/env';

interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends a transactional email through Resend. Without RESEND_API_KEY (development),
 * the email is printed to the console so invite and reset links still work.
 */
export async function sendEmail(mail: Mail) {
  if (!env.RESEND_API_KEY) {
    console.log(`\n[email] To: ${mail.to}\n[email] Subject: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, ...mail }),
  });
  if (!res.ok) {
    console.error('[email] Send failed', res.status, await res.text());
  }
}

const wrap = (heading: string, body: string, link: string, cta: string) => `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1C1830">
  <h2 style="color:#2A1F45">${heading}</h2>
  <p>${body}</p>
  <p><a href="${link}" style="display:inline-block;background:#4B32C3;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${cta}</a></p>
  <p style="color:#6B6680;font-size:13px">If the button doesn't work, paste this link into your browser:<br>${link}</p>
</div>`;

export function inviteEmail(to: string, inviterName: string, orgName: string, link: string) {
  return sendEmail({
    to,
    subject: `${inviterName} invited you to Dechub CRM`,
    text: `${inviterName} invited you to ${orgName} on Dechub CRM. Set your password here (valid 48 hours): ${link}`,
    html: wrap(
      'You have been invited to Dechub CRM',
      `${inviterName} invited you to <b>${orgName}</b>. Set your password to get started. This link is valid for 48 hours.`,
      link,
      'Set your password',
    ),
  });
}

export function resetEmail(to: string, link: string) {
  return sendEmail({
    to,
    subject: 'Reset your Dechub Cloud password',
    text: `Reset your password here (valid 1 hour): ${link}`,
    html: wrap(
      'Reset your password',
      'Use the button below to choose a new password. This link is valid for 1 hour and works once.',
      link,
      'Reset password',
    ),
  });
}
